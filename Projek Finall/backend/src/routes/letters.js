import { Router } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function fmtDateID(dateStr) {
  // YYYY-MM-DD -> DD/MM/YYYY
  const s = String(dateStr || "").slice(0, 10);
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function fmtTime(t) {
  return String(t || "").slice(0, 5);
}

function tryLogoPath() {
  const p = process.env.CAMPUS_LOGO_PATH || "assets/logo-kampus.png";
  const abs = path.resolve(p);
  return fs.existsSync(abs) ? abs : null;
}

router.get("/bookings/:id/letter", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT b.*, 
              r.name AS room_name, r.code AS room_code, r.location,
              u.name AS borrower_name, u.role AS borrower_role,
              l.letter_number,
              a.name AS admin_name
       FROM bookings b
       JOIN rooms r ON r.id=b.room_id
       JOIN users u ON u.id=b.user_id
       LEFT JOIN letters l ON l.booking_id=b.id
       LEFT JOIN users a ON a.id=b.admin_id
       WHERE b.id=? LIMIT 1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const data = rows[0];

    // akses: pemilik booking atau admin
    if (req.user.role !== "ADMIN" && req.user.id !== data.user_id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (data.status !== "APPROVED") {
      return res.status(400).json({ message: "Surat belum tersedia (booking belum APPROVED)" });
    }
    if (!data.letter_number) {
      return res.status(400).json({ message: "Nomor surat belum dibuat" });
    }

    // kop surat (bisa diubah di .env)
    const CAMPUS_NAME = process.env.CAMPUS_NAME || "NAMA KAMPUS";
    const CAMPUS_UNIT = process.env.CAMPUS_UNIT || "";
    const CAMPUS_ADDRESS = process.env.CAMPUS_ADDRESS || "Alamat kampus";
    const CAMPUS_CONTACT = process.env.CAMPUS_CONTACT || "Kontak kampus";
    const CAMPUS_CITY = process.env.CAMPUS_CITY || "Kota";
    const ADMIN_TITLE = process.env.ADMIN_TITLE || "Admin Kampus";
    const ADMIN_NIP = process.env.ADMIN_NIP || "NIP: -";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Surat-Peminjaman-${data.booking_code}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    // ===== KOP SURAT + LOGO =====
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    const logo = tryLogoPath();
    const kopTopY = doc.y;

    if (logo) {
      // logo kiri
      doc.image(logo, left, kopTopY, { width: 55 });
    }

    // text kop center (geser sedikit kalau ada logo)
    const kopTextX = left + (logo ? 65 : 0);
    const kopTextW = (right - kopTextX);

    doc.font("Helvetica-Bold").fontSize(14).text(CAMPUS_NAME, kopTextX, kopTopY, { align: "center", width: kopTextW });
    if (CAMPUS_UNIT) doc.font("Helvetica").fontSize(11).text(CAMPUS_UNIT, { align: "center", width: kopTextW });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).text(CAMPUS_ADDRESS, { align: "center", width: kopTextW });
    doc.font("Helvetica").fontSize(10).text(CAMPUS_CONTACT, { align: "center", width: kopTextW });

    // garis kop
    doc.moveDown(0.6);
    const yLine = doc.y;
    doc.moveTo(left, yLine).lineTo(right, yLine).stroke();
    doc.moveDown(0.8);

    // ===== JUDUL =====
    doc.font("Helvetica-Bold").fontSize(13).text("SURAT KETERANGAN PEMINJAMAN RUANGAN", { align: "center" });
    doc.font("Helvetica").fontSize(11).text(`Nomor: ${data.letter_number}`, { align: "center" });
    doc.moveDown(1);

    // ===== ISI =====
    doc.font("Helvetica").fontSize(11).text("Yang bertanda tangan di bawah ini menerangkan bahwa:");
    doc.moveDown(0.8);

    const labelX = left;
    const valueX = left + 150;

    const lines = [
      ["Nama Peminjam", data.borrower_name],
      ["Status", data.borrower_role],
      ["Kode Booking", data.booking_code],
      ["Ruangan", `${data.room_code} - ${data.room_name}`],
      ["Lokasi", data.location || "-"],
      ["Tanggal", fmtDateID(data.booking_date)],
      ["Waktu (Disetujui)", `${fmtTime(data.start_time)} - ${fmtTime(data.end_time)}`],
      ["Keperluan", data.purpose],
    ];

    for (const [k, v] of lines) {
      const y0 = doc.y;
      doc.font("Helvetica").text(k, labelX, y0);
      doc.text(`: ${v}`, valueX, y0);
      doc.moveDown(0.35);
    }

    doc.moveDown(0.8);
    doc.text(
      "Dengan ini dinyatakan bahwa peminjaman ruangan tersebut TELAH DISETUJUI oleh pihak kampus dan dapat digunakan sesuai jadwal di atas. " +
      "Harap menjaga kebersihan dan ketertiban selama penggunaan ruangan."
    );

    // ===== TANDA TANGAN =====
    doc.moveDown(2.2);
    const signX = right - 220;

    const decisionDate = data.decision_at ? String(data.decision_at).slice(0, 10) : String(data.booking_date).slice(0, 10);
    doc.text(`${CAMPUS_CITY}, ${fmtDateID(decisionDate)}`, signX);
    doc.moveDown(0.6);
    doc.text("Mengetahui,", signX);
    doc.text(ADMIN_TITLE, signX);
    doc.moveDown(3.2);
    doc.font("Helvetica-Bold").text(data.admin_name || "Admin Kampus", signX);
    doc.font("Helvetica").text(ADMIN_NIP, signX);

    doc.end();
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

export default router;
