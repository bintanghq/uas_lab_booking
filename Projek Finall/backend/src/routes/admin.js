import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { uploadRoomPhoto } from "../middleware/upload.js";
import { makeLetterNumber } from "../utils/code.js";
import { createNotification } from "../utils/notify.js";
import { activeScheduleSet, toDayOfWeek1to7 } from "../utils/time.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

async function hasFixedConflict(roomId, date, startTime, endTime) {
  const set = activeScheduleSet(date);
  const dow = toDayOfWeek1to7(date);
  const [rows] = await pool.query(
    `SELECT 1 FROM fixed_schedules
     WHERE room_id=? AND schedule_set=? AND day_of_week=?
       AND (? < end_time) AND (? > start_time)
     LIMIT 1`,
    [roomId, set, dow, startTime, endTime]
  );
  return rows.length > 0;
}

async function hasBookingConflict(roomId, date, startTime, endTime, excludeBookingId = null) {
  let sql = `SELECT 1 FROM bookings
             WHERE room_id=? AND booking_date=?
               AND status IN ('PENDING','COUNTERED','APPROVED')
               AND (? < end_time) AND (? > start_time)`;
  const params = [roomId, date, startTime, endTime];
  if (excludeBookingId) { sql += " AND id <> ?"; params.push(excludeBookingId); }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

// create dosen
router.post("/users/dosen", async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};
    if (!name || !username || !password) return res.status(400).json({ message: "name, username, password wajib" });

    const [dup] = await pool.query("SELECT id FROM users WHERE username=? OR email=?", [username, email || null]);
    if (dup.length) return res.status(409).json({ message: "Username/email sudah dipakai" });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?,?,?,?, 'DOSEN')",
      [name, username, email || null, hash]
    );
    res.json({ message: "Akun dosen dibuat", user_id: r.insertId });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

// rooms
router.get("/rooms", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM rooms ORDER BY type, code");
  res.json(rows);
});

router.post("/rooms", async (req, res) => {
  const { code, name, type, location, capacity, facilities } = req.body || {};
  if (!code || !name || !type) return res.status(400).json({ message: "code, name, type wajib" });

  const [r] = await pool.query(
    `INSERT INTO rooms (code, name, type, location, capacity, facilities, is_active)
     VALUES (?,?,?,?,?,?,1)`,
    [code, name, type, location || null, Number(capacity || 0), facilities || null]
  );
  const [rows] = await pool.query("SELECT * FROM rooms WHERE id=?", [r.insertId]);
  res.json(rows[0]);
});

router.patch("/rooms/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { code, name, type, location, capacity, facilities, is_active } = req.body || {};

  await pool.query(
    `UPDATE rooms SET
      code=COALESCE(?, code),
      name=COALESCE(?, name),
      type=COALESCE(?, type),
      location=COALESCE(?, location),
      capacity=COALESCE(?, capacity),
      facilities=COALESCE(?, facilities),
      is_active=COALESCE(?, is_active)
     WHERE id=?`,
    [code || null, name || null, type || null, location || null,
     capacity != null ? Number(capacity) : null,
     facilities || null,
     is_active != null ? Number(is_active) : null,
     id]
  );

  const [rows] = await pool.query("SELECT * FROM rooms WHERE id=?", [id]);
  res.json(rows[0]);
});

router.post("/rooms/:id/photo", uploadRoomPhoto.single("photo"), async (req, res) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ message: "File photo wajib" });

  const url = "/uploads/rooms/" + req.file.filename;
  await pool.query("UPDATE rooms SET photo_url=? WHERE id=?", [url, id]);
  const [rows] = await pool.query("SELECT * FROM rooms WHERE id=?", [id]);
  res.json(rows[0]);
});

// fixed schedules
router.get("/rooms/:roomId/fixed-schedules", async (req, res) => {
  const roomId = Number(req.params.roomId);
  const [rows] = await pool.query(
    `SELECT * FROM fixed_schedules WHERE room_id=? ORDER BY schedule_set, day_of_week, start_time`,
    [roomId]
  );
  res.json(rows);
});

router.post("/rooms/:roomId/fixed-schedules", async (req, res) => {
  const roomId = Number(req.params.roomId);
  const { schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name, class_name, note } = req.body || {};
  if (!schedule_set || !day_of_week || !start_time || !end_time || !course_name || !lecturer_name) {
    return res.status(400).json({ message: "schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name wajib" });
  }
  if (start_time >= end_time) return res.status(400).json({ message: "Jam mulai harus < jam selesai" });

  const [conf] = await pool.query(
    `SELECT 1 FROM fixed_schedules
     WHERE room_id=? AND schedule_set=? AND day_of_week=?
       AND (? < end_time) AND (? > start_time)
     LIMIT 1`,
    [roomId, schedule_set, Number(day_of_week), start_time, end_time]
  );
  if (conf.length) return res.status(409).json({ message: "Jadwal baku bentrok di ruangan yang sama" });

  const [r] = await pool.query(
    `INSERT INTO fixed_schedules (room_id, schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name, class_name, note)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [roomId, schedule_set, Number(day_of_week), start_time, end_time, course_name, lecturer_name, class_name || null, note || null]
  );
  const [rows] = await pool.query("SELECT * FROM fixed_schedules WHERE id=?", [r.insertId]);
  res.json(rows[0]);
});

router.delete("/fixed-schedules/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM fixed_schedules WHERE id=?", [id]);
  res.json({ message: "Deleted" });
});

// bookings list by status
router.get("/bookings", async (req, res) => {
  const status = String(req.query.status || "PENDING");
  const [rows] = await pool.query(
    `SELECT b.*, r.name AS room_name, r.code AS room_code, u.name AS borrower_name, u.role AS borrower_role
     FROM bookings b
     JOIN rooms r ON r.id=b.room_id
     JOIN users u ON u.id=b.user_id
     WHERE b.status=?
     ORDER BY b.requested_at DESC
     LIMIT 250`,
    [status]
  );
  res.json(rows);
});

// approve
router.post("/bookings/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const note = (req.body && req.body.note) ? String(req.body.note) : null;

  const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });
  if (rows[0].status !== "PENDING") return res.status(400).json({ message: "Hanya PENDING yang bisa di-approve" });

  await pool.query(
    `UPDATE bookings
     SET status='APPROVED', admin_id=?, admin_action_at=NOW(), decision_at=NOW(), admin_note=?
     WHERE id=?`,
    [req.user.id, note, id]
  );

  const [exists] = await pool.query("SELECT id FROM letters WHERE booking_id=? LIMIT 1", [id]);
  if (!exists.length) {
    const letterNo = makeLetterNumber(id, String(rows[0].booking_date).slice(0,10));
    await pool.query("INSERT INTO letters (booking_id, letter_number) VALUES (?,?)", [id, letterNo]);
  }

  await createNotification({
    user_id: rows[0].user_id,
    type: "APPROVED",
    title: "Booking disetujui",
    message: `Booking ${rows[0].booking_code} disetujui. Surat sudah bisa diunduh.`,
  });

  const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
  res.json(after[0]);
});

// reject
router.post("/bookings/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const note = (req.body && req.body.note) ? String(req.body.note) : null;

  const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });
  if (rows[0].status !== "PENDING") return res.status(400).json({ message: "Hanya PENDING yang bisa di-reject" });

  await pool.query(
    `UPDATE bookings
     SET status='REJECTED', admin_id=?, admin_action_at=NOW(), decision_at=NOW(), admin_note=?
     WHERE id=?`,
    [req.user.id, note, id]
  );

  await createNotification({
    user_id: rows[0].user_id,
    type: "REJECTED",
    title: "Booking ditolak",
    message: `Booking ${rows[0].booking_code} ditolak. Alasan: ${note || "-"}`,
  });

  const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
  res.json(after[0]);
});

// propose change
router.post("/bookings/:id/propose-change", async (req, res) => {
  const id = Number(req.params.id);
  const { proposed_date, proposed_start_time, proposed_end_time, note } = req.body || {};
  if (!proposed_start_time || !proposed_end_time) return res.status(400).json({ message: "proposed_start_time & proposed_end_time wajib" });

  const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

  const b = rows[0];
  if (b.status !== "PENDING") return res.status(400).json({ message: "Hanya PENDING yang bisa diubah jadwalnya" });

  const finalDate = proposed_date ? String(proposed_date).slice(0,10) : String(b.booking_date).slice(0,10);
  if (proposed_start_time >= proposed_end_time) return res.status(400).json({ message: "Jam mulai harus < jam selesai" });

  const fixed = await hasFixedConflict(b.room_id, finalDate, proposed_start_time, proposed_end_time);
  if (fixed) return res.status(409).json({ message: "Perubahan bentrok dengan jadwal baku" });

  const conflict = await hasBookingConflict(b.room_id, finalDate, proposed_start_time, proposed_end_time, id);
  if (conflict) return res.status(409).json({ message: "Perubahan bentrok dengan booking lain (antrian)" });

  await pool.query(
    `UPDATE bookings
     SET status='COUNTERED',
         admin_id=?,
         admin_action_at=NOW(),
         proposed_date=?,
         proposed_start_time=?,
         proposed_end_time=?,
         proposed_note=?,
         admin_note=?
     WHERE id=?`,
    [req.user.id, finalDate, proposed_start_time, proposed_end_time, note || null, note || null, id]
  );

  await createNotification({
    user_id: b.user_id,
    type: "CHANGE_PROPOSED",
    title: "Perubahan jadwal diajukan admin",
    message: `Booking ${b.booking_code}: admin mengusulkan jadwal ${finalDate} ${String(proposed_start_time).slice(0,5)}-${String(proposed_end_time).slice(0,5)}. ${note ? "Catatan: " + note : ""}`,
  });

  const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
  res.json(after[0]);
});

export default router;
