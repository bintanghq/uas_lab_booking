import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};
    if (!name || !username || !password) {
      return res.status(400).json({ message: "name, username, password wajib diisi" });
    }

    const [dup] = await pool.query("SELECT id FROM users WHERE username=? OR email=?", [username, email || null]);
    if (dup.length) return res.status(409).json({ message: "Username/email sudah dipakai" });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?,?,?,?, 'MAHASISWA')",
      [name, username, email || null, hash]
    );

    return res.json({ message: "Registrasi berhasil", user_id: r.insertId });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: "username & password wajib" });

    const [rows] = await pool.query("SELECT * FROM users WHERE username=? LIMIT 1", [username]);
    if (!rows.length) return res.status(401).json({ message: "Login gagal" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Login gagal" });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: String(e.message || e) });
  }
});

export default router;
