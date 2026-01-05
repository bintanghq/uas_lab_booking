import { pool } from "../db.js";

export async function createNotification({ user_id, type = "INFO", title, message }) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES (?,?,?,?)`,
    [user_id, type, title, message]
  );
}
