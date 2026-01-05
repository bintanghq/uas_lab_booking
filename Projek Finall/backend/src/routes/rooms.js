import { Router } from "express";
import { pool } from "../db.js";
import { activeScheduleSet, toDayOfWeek1to7 } from "../utils/time.js";

const router = Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM rooms WHERE is_active=1 ORDER BY type, code");
  res.json(rows);
});

router.get("/:id/schedule", async (req, res) => {
  const roomId = Number(req.params.id);
  const date = String(req.query.date || "");
  if (!date) return res.status(400).json({ message: "date=YYYY-MM-DD wajib" });

  const set = activeScheduleSet(date);
  const dow = toDayOfWeek1to7(date);

  const [rows] = await pool.query(
    `SELECT id, schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name, class_name, note
     FROM fixed_schedules
     WHERE room_id=? AND schedule_set=? AND day_of_week=?
     ORDER BY start_time`,
    [roomId, set, dow]
  );

  res.json({ active_set: set, day_of_week: dow, items: rows });
});

router.get("/:id/calendar", async (req, res) => {
  const roomId = Number(req.params.id);
  const date = String(req.query.date || "");
  if (!date) return res.status(400).json({ message: "date=YYYY-MM-DD wajib" });

  const set = activeScheduleSet(date);
  const dow = toDayOfWeek1to7(date);

  const [fixed] = await pool.query(
    `SELECT id, start_time, end_time, course_name, lecturer_name, class_name
     FROM fixed_schedules
     WHERE room_id=? AND schedule_set=? AND day_of_week=?
     ORDER BY start_time`,
    [roomId, set, dow]
  );

  const [extra] = await pool.query(
    `SELECT b.id, b.booking_code, b.start_time, b.end_time, u.name AS borrower_name, b.purpose
     FROM bookings b
     JOIN users u ON u.id=b.user_id
     WHERE b.room_id=? AND b.booking_date=? AND b.status='APPROVED'
     ORDER BY b.start_time`,
    [roomId, date]
  );

  res.json({ active_set: set, day_of_week: dow, fixed, extra });
});

router.get("/:id/calendar-week", async (req, res) => {
  const roomId = Number(req.params.id);
  const date = String(req.query.date || "");
  if (!date) return res.status(400).json({ message: "date=YYYY-MM-DD wajib" });

  // hitung Senin pada minggu dari tanggal referensi
  const ref = new Date(date + "T00:00:00");
  const jsDow = ref.getDay(); // 0=Sun..6=Sat
  const diffToMon = (jsDow === 0) ? -6 : (1 - jsDow); // Sunday -> back 6, else back to Monday
  ref.setDate(ref.getDate() + diffToMon);

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() + i);
    const ds = fmt(d);

    const set = activeScheduleSet(ds);
    const dow = toDayOfWeek1to7(ds);

    const [fixed] = await pool.query(
      `SELECT id, start_time, end_time, course_name, lecturer_name, class_name
       FROM fixed_schedules
       WHERE room_id=? AND schedule_set=? AND day_of_week=?
       ORDER BY start_time`,
      [roomId, set, dow]
    );

    const [extra] = await pool.query(
      `SELECT b.id, b.booking_code, b.start_time, b.end_time, u.name AS borrower_name, b.purpose
       FROM bookings b
       JOIN users u ON u.id=b.user_id
       WHERE b.room_id=? AND b.booking_date=? AND b.status='APPROVED'
       ORDER BY b.start_time`,
      [roomId, ds]
    );

    days.push({ date: ds, active_set: set, day_of_week: dow, fixed, extra });
  }

  res.json({ week_start: fmt(ref), room_id: roomId, days });
});

router.get("/:id/queue", async (req, res) => {
  const roomId = Number(req.params.id);
  const date = String(req.query.date || "");
  if (!date) return res.status(400).json({ message: "date=YYYY-MM-DD wajib" });

  const [rows] = await pool.query(
    `SELECT b.id, b.booking_code, b.start_time, b.end_time, b.status, u.name AS borrower_name
     FROM bookings b
     JOIN users u ON u.id=b.user_id
     WHERE b.room_id=? AND b.booking_date=?
       AND b.status IN ('PENDING','COUNTERED','APPROVED')
     ORDER BY b.start_time`,
    [roomId, date]
  );
  res.json(rows);
});


router.get("/:id/calendar-month", async (req, res) => {
  const roomId = Number(req.params.id);
  const month = String(req.query.month || ""); // YYYY-MM
  const dateQ = String(req.query.date || "");  // optional YYYY-MM-DD
  if (!month && !dateQ) return res.status(400).json({ message: "month=YYYY-MM atau date=YYYY-MM-DD wajib" });

  const base = (month ? (month + "-01") : dateQ);
  const yyyy = Number(base.slice(0,4));
  const mm = Number(base.slice(5,7));
  if (!yyyy || !mm) return res.status(400).json({ message: "Format tanggal tidak valid" });

  const pad2 = (n) => String(n).padStart(2,"0");
  const daysInMonth = new Date(yyyy, mm, 0).getDate(); // mm is 1-12
  const startDate = `${yyyy}-${pad2(mm)}-01`;
  const endDate = `${yyyy}-${pad2(mm)}-${pad2(daysInMonth)}`;

  // preload fixed schedules (A/B) for this room, group by set+day
  const [fixedAll] = await pool.query(
    `SELECT id, schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name, class_name
     FROM fixed_schedules
     WHERE room_id=?
     ORDER BY schedule_set, day_of_week, start_time`,
    [roomId]
  );
  const fixedMap = { A: {}, B: {} };
  for (const f of fixedAll) {
    const set = f.schedule_set;
    const dow = Number(f.day_of_week);
    if (!fixedMap[set][dow]) fixedMap[set][dow] = [];
    fixedMap[set][dow].push(f);
  }

  // preload approved bookings for the month
  const [extraAll] = await pool.query(
    `SELECT b.id, b.booking_code, DATE_FORMAT(b.booking_date,'%Y-%m-%d') AS booking_date, b.start_time, b.end_time, u.name AS borrower_name, b.purpose
     FROM bookings b
     JOIN users u ON u.id=b.user_id
     WHERE b.room_id=? AND b.status='APPROVED'
       AND b.booking_date BETWEEN ? AND ?
     ORDER BY b.booking_date, b.start_time`,
    [roomId, startDate, endDate]
  );
  const extraMap = {};
  for (const e of extraAll) {
    const d = String(e.booking_date);
    if (!extraMap[d]) extraMap[d] = [];
    extraMap[d].push(e);
  }

  const days = [];
  for (let dd = 1; dd <= daysInMonth; dd++) {
    const date = `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
    const set = activeScheduleSet(date);
    const dow = toDayOfWeek1to7(date);
    const fixed = (fixedMap[set] && fixedMap[set][dow]) ? fixedMap[set][dow] : [];
    const extra = extraMap[date] || [];
    days.push({ date, active_set: set, day_of_week: dow, fixed, extra });
  }

  res.json({ month: `${yyyy}-${pad2(mm)}`, start_date: startDate, end_date: endDate, days });
});

export default router;
