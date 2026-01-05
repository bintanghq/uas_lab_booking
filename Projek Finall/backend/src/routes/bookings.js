import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { activeScheduleSet, toDayOfWeek1to7 } from "../utils/time.js";
import { makeBookingCode, makeLetterNumber } from "../utils/code.js";
import { createNotification } from "../utils/notify.js";

const router = Router();

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
  if (excludeBookingId) {
    sql += " AND id <> ?";
    params.push(excludeBookingId);
  }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { room_id, booking_date, start_time, end_time, purpose } = req.body || {};
    if (!room_id || !booking_date || !start_time || !end_time || !purpose) {
      return res.status(400).json({ message: "room_id, booking_date, start_time, end_time, purpose wajib" });
    }
    if (start_time >= end_time) return res.status(400).json({ message: "Jam mulai harus < jam selesai" });

    const roomId = Number(room_id);

    const fixed = await hasFixedConflict(roomId, booking_date, start_time, end_time);
    if (fixed) return res.status(409).json({ message: "Bentrok dengan jadwal perkuliahan (jadwal baku)" });

    const conflict = await hasBookingConflict(roomId, booking_date, start_time, end_time);
    if (conflict) return res.status(409).json({ message: "Bentrok dengan booking lain (antrian)" });

    const [r] = await pool.query(
      `INSERT INTO bookings (booking_code, user_id, room_id, booking_date, start_time, end_time, purpose, status)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [req.user.id, roomId, booking_date, start_time, end_time, purpose]
    );
    const id = r.insertId;
    const code = makeBookingCode(id);
    await pool.query("UPDATE bookings SET booking_code=? WHERE id=?", [code, id]);

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { booking_date, start_time, end_time, purpose } = req.body || {};

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
    if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const b = rows[0];
    if (b.user_id !== req.user.id) return res.status(403).json({ message: "Bukan pemilik booking" });
    if (b.status !== "PENDING") return res.status(400).json({ message: "Booking tidak bisa diubah (status bukan PENDING)" });

    const nextDate = booking_date || String(b.booking_date).slice(0,10);
    const nextStart = start_time || b.start_time;
    const nextEnd = end_time || b.end_time;
    const nextPurpose = purpose || b.purpose;

    if (nextStart >= nextEnd) return res.status(400).json({ message: "Jam mulai harus < jam selesai" });

    const fixed = await hasFixedConflict(b.room_id, nextDate, nextStart, nextEnd);
    if (fixed) return res.status(409).json({ message: "Bentrok dengan jadwal perkuliahan (jadwal baku)" });

    const conflict = await hasBookingConflict(b.room_id, nextDate, nextStart, nextEnd, id);
    if (conflict) return res.status(409).json({ message: "Bentrok dengan booking lain (antrian)" });

    await pool.query(
      `UPDATE bookings SET booking_date=?, start_time=?, end_time=?, purpose=? WHERE id=?`,
      [nextDate, nextStart, nextEnd, nextPurpose, id]
    );

    const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
    res.json(after[0]);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
    if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const b = rows[0];
    if (b.user_id !== req.user.id) return res.status(403).json({ message: "Bukan pemilik booking" });
    if (b.status !== "PENDING") return res.status(400).json({ message: "Hanya PENDING yang bisa dibatalkan" });

    await pool.query("UPDATE bookings SET status='CANCELLED' WHERE id=?", [id]);
    res.json({ message: "Booking dibatalkan" });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.post("/:id/accept-change", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const note = (req.body && req.body.note) ? String(req.body.note) : null;

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
    if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const b = rows[0];
    if (b.user_id !== req.user.id) return res.status(403).json({ message: "Bukan pemilik booking" });
    if (b.status !== "COUNTERED") return res.status(400).json({ message: "Tidak ada perubahan jadwal yang menunggu persetujuan" });
    if (!b.proposed_start_time || !b.proposed_end_time) return res.status(400).json({ message: "Data perubahan belum lengkap" });

    const finalDate = b.proposed_date ? String(b.proposed_date).slice(0,10) : String(b.booking_date).slice(0,10);
    const finalStart = b.proposed_start_time;
    const finalEnd = b.proposed_end_time;

    if (finalStart >= finalEnd) return res.status(400).json({ message: "Jam mulai harus < jam selesai" });

    const fixed = await hasFixedConflict(b.room_id, finalDate, finalStart, finalEnd);
    if (fixed) return res.status(409).json({ message: "Perubahan bentrok dengan jadwal baku" });

    const conflict = await hasBookingConflict(b.room_id, finalDate, finalStart, finalEnd, id);
    if (conflict) return res.status(409).json({ message: "Perubahan bentrok dengan booking lain (antrian)" });

    await pool.query(
      `UPDATE bookings SET
         booking_date=?,
         start_time=?,
         end_time=?,
         status='APPROVED',
         decision_at=NOW(),
         user_note=?,
         user_decision_at=NOW(),
         proposed_date=NULL, proposed_start_time=NULL, proposed_end_time=NULL, proposed_note=NULL
       WHERE id=?`,
      [finalDate, finalStart, finalEnd, note, id]
    );

    const [exists] = await pool.query("SELECT id FROM letters WHERE booking_id=? LIMIT 1", [id]);
    if (!exists.length) {
      const letterNo = makeLetterNumber(id, finalDate);
      await pool.query("INSERT INTO letters (booking_id, letter_number) VALUES (?,?)", [id, letterNo]);
    }

    await createNotification({
      user_id: req.user.id,
      type: "APPROVED",
      title: "Perubahan diterima — Booking disetujui",
      message: `Booking ${b.booking_code} disetujui dengan jadwal ${finalDate} ${String(finalStart).slice(0,5)}-${String(finalEnd).slice(0,5)}. Surat sudah bisa diunduh.`,
    });

    if (b.admin_id) {
      await createNotification({
        user_id: b.admin_id,
        type: "USER_RESPONSE",
        title: "User menerima perubahan jadwal",
        message: `${req.user.name} menerima perubahan jadwal untuk booking ${b.booking_code}.`,
      });
    }

    const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
    res.json(after[0]);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.post("/:id/decline-change", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const note = (req.body && req.body.note) ? String(req.body.note) : null;

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id=? LIMIT 1", [id]);
    if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const b = rows[0];
    if (b.user_id !== req.user.id) return res.status(403).json({ message: "Bukan pemilik booking" });
    if (b.status !== "COUNTERED") return res.status(400).json({ message: "Tidak ada perubahan jadwal yang menunggu persetujuan" });

    await pool.query(
      `UPDATE bookings SET status='REJECTED', decision_at=NOW(), user_note=?, user_decision_at=NOW() WHERE id=?`,
      [note, id]
    );

    await createNotification({
      user_id: req.user.id,
      type: "REJECTED",
      title: "Perubahan ditolak — Booking dibatalkan",
      message: `Kamu menolak perubahan jadwal untuk booking ${b.booking_code}. Booking dinyatakan ditolak.`,
    });

    if (b.admin_id) {
      await createNotification({
        user_id: b.admin_id,
        type: "USER_RESPONSE",
        title: "User menolak perubahan jadwal",
        message: `${req.user.name} menolak perubahan jadwal untuk booking ${b.booking_code}.`,
      });
    }

    const [after] = await pool.query("SELECT * FROM bookings WHERE id=?", [id]);
    res.json(after[0]);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, r.name AS room_name, r.code AS room_code
     FROM bookings b
     JOIN rooms r ON r.id=b.room_id
     WHERE b.user_id=?
     ORDER BY b.requested_at DESC
     LIMIT 200`,
    [req.user.id]
  );
  res.json(rows);
});

export default router;
