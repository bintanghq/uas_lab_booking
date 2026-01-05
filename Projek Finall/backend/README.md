# Backend - Sistem Peminjaman Ruangan (Express + MySQL/XAMPP)

## Setup
1) Pastikan MySQL di XAMPP menyala (port 3306).
2) Masuk folder backend:
   ```bash
   cd backend
   npm install
   ```
3) Copy env:
   - Windows: copy `.env.example` menjadi `.env`
   - Edit jika perlu (user/password MySQL, dll)

4) Buat tabel + seed dummy data:
   ```bash
   npm run seed
   ```

5) Jalankan backend:
   ```bash
   npm run dev
   ```

Backend akan jalan di `http://localhost:5001`


## Status Booking
- PENDING: menunggu admin
- COUNTERED: admin mengusulkan perubahan (menunggu user)
- APPROVED: disetujui final (surat tersedia)
- REJECTED/CANCELLED
