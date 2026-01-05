# Sistem Peminjaman Ruangan (React + Express + MySQL/XAMPP)

## Fitur sesuai tugas
- Jadwal baku A/B bergantian (minggu ganjil = A, minggu genap = B)
- Ruangan **tidak bisa dipinjam** di jam jadwal baku aktif
- Mahasiswa bisa register sendiri
- Admin bisa tambah akun dosen
- Booking ruangan (PENDING) bisa **diubah sebelum di-approve**
- Mahasiswa bisa lihat antrian booking per ruangan & tanggal
- Admin approve/reject booking
- Setelah approved, peminjam bisa **download Surat Keterangan (PDF)** langsung dari web

---

## Cara Menjalankan (Windows + XAMPP)
### 1) Database
- Nyalakan MySQL di XAMPP (port 3306)
- Masuk folder `backend`, install dan seed:
  ```bash
  cd backend
  npm install
  copy .env.example .env
  npm run seed
  npm run dev
  ```

### 2) Frontend
Buka terminal baru:
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5001

---

## Akun Dummy
- Admin: **admin / Admin123**
- Dosen: **dosen_budi / Dosen123**
- Mahasiswa: **mhs_andi / Mhs123**

> Logo kampus: taruh file `logo-kampus.png` di folder `frontend/public/`


## Catatan Download Surat
Tombol **Download Surat** menggunakan request `axios` (mengirim token Authorization) agar tidak error `Unauthorized`.


## Logo Surat (PDF)
Taruh file logo untuk kop surat di: `backend/assets/logo-kampus.png`.
Jika path berbeda, atur `CAMPUS_LOGO_PATH` di `backend/.env`.


## Konfigurasi Kampus (Default)
File `backend/.env.example` sudah diisi default untuk **STMIK Lombok (Praya)**. Kamu bisa edit jika ada perbedaan data resmi di kampus.


## Workflow Perubahan Jadwal (Interaktif)
- User mengajukan booking => **PENDING**
- Admin bisa: **Approve**, **Reject**, atau **Ubah Jadwal** (mengusulkan perubahan) => **COUNTERED**
- User menerima perubahan => **APPROVED** + surat bisa diunduh + jadwal muncul sebagai **Tambahan**
- User menolak perubahan => **REJECTED** (dengan notifikasi)

## Notifikasi
Sistem membuat notifikasi otomatis untuk user/admin saat ada perubahan status (approve/reject/usulan/peresetujuan user).


## Jadwal (Publik)
- Halaman **/schedule** bisa dilihat tanpa login.
- Menampilkan **Kalender Bulanan** per ruangan: Jadwal BAKU + Booking APPROVED.
- Menu **Jadwal** tersedia baik sebelum maupun sesudah login.
