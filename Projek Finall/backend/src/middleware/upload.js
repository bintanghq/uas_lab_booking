import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve("uploads/rooms");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `room-${safe}${ext || ".jpg"}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  if (!ok) return cb(new Error("File harus jpg/png/webp"), false);
  cb(null, true);
}

export const uploadRoomPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
