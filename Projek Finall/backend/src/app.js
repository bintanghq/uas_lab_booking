import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import bookingsRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import lettersRoutes from "./routes/letters.js";
import notificationsRoutes from "./routes/notifications.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: false
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// static for uploaded photos
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", notificationsRoutes);
app.use("/api", lettersRoutes);

const port = Number(process.env.PORT || 5001);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
