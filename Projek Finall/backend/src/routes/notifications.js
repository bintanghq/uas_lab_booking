import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, type, title, message, is_read, created_at
     FROM notifications
     WHERE user_id=?
     ORDER BY created_at DESC
     LIMIT 80`,
    [req.user.id]
  );
  res.json(rows);
});

router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await pool.query(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`, [id, req.user.id]);
  res.json({ message: "OK" });
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  await pool.query(`UPDATE notifications SET is_read=1 WHERE user_id=?`, [req.user.id]);
  res.json({ message: "OK" });
});

export default router;
