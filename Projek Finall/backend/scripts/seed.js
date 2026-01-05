import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config();

const schemaPath = path.resolve("scripts/schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

// ===== Helpers aman untuk tanggal =====
const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days); // aman, otomatis pindah bulan/tahun
  return d;
};

async function main() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "db_peminjaman_ruangan";

  // 1) Jalankan schema.sql (buat DB + tabel)
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });
  await conn.query(schema);

  // 2) Konek ke DB yang sudah dibuat
  const db = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
  });

  // 3) Bersihkan data (reset)
  await db.query("SET FOREIGN_KEY_CHECKS=0");
  await db.query("TRUNCATE TABLE notifications");
  await db.query("TRUNCATE TABLE letters");
  await db.query("TRUNCATE TABLE bookings");
  await db.query("TRUNCATE TABLE fixed_schedules");
  await db.query("TRUNCATE TABLE rooms");
  await db.query("TRUNCATE TABLE users");
  await db.query("SET FOREIGN_KEY_CHECKS=1");

  // 4) Insert users
  const adminPass = await bcrypt.hash("Admin123", 10);
  const dosenPass = await bcrypt.hash("Dosen123", 10);
  const mhsPass = await bcrypt.hash("Mhs123", 10);

  await db.query(
    `INSERT INTO users (name, username, email, password_hash, role) VALUES
    ('Admin Kampus','admin','admin@kampus.ac.id',?, 'ADMIN'),
    ('Dosen Budi','dosen_budi','budi@kampus.ac.id',?, 'DOSEN'),
    ('Dosen Sari','dosen_sari','sari@kampus.ac.id',?, 'DOSEN'),
    ('Mahasiswa Andi','mhs_andi','andi@student.ac.id',?, 'MAHASISWA'),
    ('Mahasiswa Rina','mhs_rina','rina@student.ac.id',?, 'MAHASISWA')`,
    [adminPass, dosenPass, dosenPass, mhsPass, mhsPass]
  );

  // 5) Insert rooms
  await db.query(
    `INSERT INTO rooms (code, name, type, location, capacity, facilities, photo_url) VALUES
    ('LAB-KOM1','Lab Komputer 1','LAB','Gedung A Lt.2',35,'PC 35 unit, Proyektor, AC, WiFi','/images/labkom1.jpg'),
    ('LAB-KOM2','Lab Komputer 2','LAB','Gedung A Lt.2',30,'PC 30 unit, Proyektor, AC, WiFi','/images/labkom2.jpg'),
    ('R-101','Ruang Kelas 101','KELAS','Gedung B Lt.1',40,'Proyektor, Whiteboard, AC','/images/r101.jpg'),
    ('R-102','Ruang Kelas 102','KELAS','Gedung B Lt.1',40,'Proyektor, Whiteboard, AC','/images/r102.jpg'),
    ('AULA','Aula Kampus','AULA','Gedung Utama',200,'Sound system, Panggung, Kursi, AC','/images/aula.jpg'),
    ('LAB-MULTI','Lab Multimedia','LAB','Gedung C Lt.1',25,'PC 25 unit, Kamera, Lighting, Proyektor','/images/labmulti.jpg')`
  );

  // 6) Insert fixed schedules (INI YANG TADI ERROR — SUDAH BERSIH TANPA "31")
  await db.query(
    `INSERT INTO fixed_schedules (room_id, schedule_set, day_of_week, start_time, end_time, course_name, lecturer_name, class_name) VALUES
    (1,'A',1,'08:00:00','10:00:00','Praktikum Algoritma','Dosen Budi','TI-2A'),
    (1,'A',3,'13:00:00','15:00:00','Basis Data','Dosen Sari','SI-2B'),
    (1,'B',2,'09:00:00','11:00:00','Jaringan Komputer','Dosen Budi','TI-3A'),
    (1,'B',4,'10:00:00','12:00:00','Pemrograman Web','Dosen Sari','SI-3B'),

    (2,'A',1,'10:00:00','12:00:00','Sistem Operasi','Dosen Sari','TI-2B'),
    (2,'A',4,'13:00:00','15:00:00','Multimedia','Dosen Budi','DKV-2A'),
    (2,'B',3,'08:00:00','10:00:00','Keamanan Jaringan','Dosen Budi','TI-4A'),
    (2,'B',5,'13:00:00','15:00:00','Data Mining','Dosen Sari','SI-4B')`
  );

  // 7) Tanggal dummy aman (besok & lusa)
  const today = new Date();
  const date1 = formatDate(addDays(today, 1));
  const date2 = formatDate(addDays(today, 2));
  const yyyy = today.getFullYear();
  const mm = pad2(today.getMonth() + 1);

  // 8) Ambil id user
  const [[andi]] = await db.query("SELECT id FROM users WHERE username='mhs_andi' LIMIT 1");
  const [[rina]] = await db.query("SELECT id FROM users WHERE username='mhs_rina' LIMIT 1");
  const [[admin]] = await db.query("SELECT id FROM users WHERE username='admin' LIMIT 1");

  // 9) Insert bookings
  await db.query(
    `INSERT INTO bookings (booking_code, user_id, room_id, booking_date, start_time, end_time, purpose, status)
     VALUES
     ('BK-0001', ?, 1, ?, '13:00:00','15:00:00','Rapat HIMA','PENDING'),
     ('BK-0002', ?, 1, ?, '15:30:00','17:00:00','Belajar Kelompok','APPROVED'),
     ('BK-0003', ?, 3, ?, '10:30:00','12:00:00','Kegiatan UKM','COUNTERED')`,
    [andi.id, date1, rina.id, date1, andi.id, date2]
  );

  // 10) Surat untuk booking APPROVED
  const [[bk2]] = await db.query("SELECT id FROM bookings WHERE booking_code='BK-0002' LIMIT 1");
  await db.query("INSERT INTO letters (booking_id, letter_number) VALUES (?, ?)", [
    bk2.id,
    `421.5/PK-RUANG/${yyyy}/${mm}/0002`,
  ]);

  // 11) Admin ajukan perubahan untuk BK-0003 (COUNTERED)
  const [[bk3]] = await db.query("SELECT id FROM bookings WHERE booking_code='BK-0003' LIMIT 1");
  await db.query(
    `UPDATE bookings SET admin_id=?, admin_action_at=NOW(),
      proposed_date=?, proposed_start_time='13:00:00', proposed_end_time='14:30:00',
      proposed_note='Bentrok dengan jadwal lain, mohon geser jam.',
      admin_note='Bentrok dengan jadwal lain, mohon geser jam.'
     WHERE id=?`,
    [admin.id, date2, bk3.id]
  );

  // 12) Notifications
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES
     (?,?,?,?),
     (?,?,?,?)`,
    [
      andi.id,
      "CHANGE_PROPOSED",
      "Perubahan jadwal diajukan admin",
      "Admin mengusulkan perubahan jadwal untuk booking BK-0003. Silakan terima atau tolak.",
      admin.id,
      "INFO",
      "Seed berhasil",
      "Database dummy sudah dibuat. Siap testing.",
    ]
  );

  await db.end();
  await conn.end();

  console.log("✅ Seed selesai!");
  console.log("Akun login:");
  console.log("- Admin: admin / Admin123");
  console.log("- Dosen: dosen_budi / Dosen123");
  console.log("- Mahasiswa: mhs_andi / Mhs123");
}

main().catch((e) => {
  console.error("Seed gagal:", e);
  process.exit(1);
});
