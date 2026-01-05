-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 05, 2026 at 11:22 AM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_peminjaman_ruangan`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int NOT NULL,
  `booking_code` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `purpose` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('PENDING','COUNTERED','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PENDING',
  `proposed_date` date DEFAULT NULL,
  `proposed_start_time` time DEFAULT NULL,
  `proposed_end_time` time DEFAULT NULL,
  `proposed_note` text COLLATE utf8mb4_general_ci,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `admin_id` int DEFAULT NULL,
  `admin_note` text COLLATE utf8mb4_general_ci,
  `admin_action_at` timestamp NULL DEFAULT NULL,
  `decision_at` timestamp NULL DEFAULT NULL,
  `user_note` text COLLATE utf8mb4_general_ci,
  `user_decision_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_id`, `booking_date`, `start_time`, `end_time`, `purpose`, `status`, `proposed_date`, `proposed_start_time`, `proposed_end_time`, `proposed_note`, `requested_at`, `updated_at`, `admin_id`, `admin_note`, `admin_action_at`, `decision_at`, `user_note`, `user_decision_at`) VALUES
(1, 'BK-0001', 4, 1, '2026-01-06', '13:00:00', '15:00:00', 'Rapat HIMA', 'PENDING', NULL, NULL, NULL, NULL, '2026-01-05 11:10:36', '2026-01-05 11:10:36', NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'BK-0002', 5, 1, '2026-01-06', '15:30:00', '17:00:00', 'Belajar Kelompok', 'APPROVED', NULL, NULL, NULL, NULL, '2026-01-05 11:10:36', '2026-01-05 11:10:36', NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'BK-0003', 4, 3, '2026-01-07', '10:30:00', '12:00:00', 'Kegiatan UKM', 'COUNTERED', '2026-01-07', '13:00:00', '14:30:00', 'Bentrok dengan jadwal lain, mohon geser jam.', '2026-01-05 11:10:36', '2026-01-05 11:10:36', 1, 'Bentrok dengan jadwal lain, mohon geser jam.', '2026-01-05 11:10:36', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fixed_schedules`
--

CREATE TABLE `fixed_schedules` (
  `id` int NOT NULL,
  `room_id` int NOT NULL,
  `schedule_set` enum('A','B') COLLATE utf8mb4_general_ci NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `course_name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `lecturer_name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `class_name` varchar(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fixed_schedules`
--

INSERT INTO `fixed_schedules` (`id`, `room_id`, `schedule_set`, `day_of_week`, `start_time`, `end_time`, `course_name`, `lecturer_name`, `class_name`, `note`, `created_at`) VALUES
(1, 1, 'A', 1, '08:00:00', '10:00:00', 'Praktikum Algoritma', 'Dosen Budi', 'TI-2A', NULL, '2026-01-05 11:10:36'),
(2, 1, 'A', 3, '13:00:00', '15:00:00', 'Basis Data', 'Dosen Sari', 'SI-2B', NULL, '2026-01-05 11:10:36'),
(3, 1, 'B', 2, '09:00:00', '11:00:00', 'Jaringan Komputer', 'Dosen Budi', 'TI-3A', NULL, '2026-01-05 11:10:36'),
(4, 1, 'B', 4, '10:00:00', '12:00:00', 'Pemrograman Web', 'Dosen Sari', 'SI-3B', NULL, '2026-01-05 11:10:36'),
(5, 2, 'A', 1, '10:00:00', '12:00:00', 'Sistem Operasi', 'Dosen Sari', 'TI-2B', NULL, '2026-01-05 11:10:36'),
(6, 2, 'A', 4, '13:00:00', '15:00:00', 'Multimedia', 'Dosen Budi', 'DKV-2A', NULL, '2026-01-05 11:10:36'),
(7, 2, 'B', 3, '08:00:00', '10:00:00', 'Keamanan Jaringan', 'Dosen Budi', 'TI-4A', NULL, '2026-01-05 11:10:36'),
(8, 2, 'B', 5, '13:00:00', '15:00:00', 'Data Mining', 'Dosen Sari', 'SI-4B', NULL, '2026-01-05 11:10:36');

-- --------------------------------------------------------

--
-- Table structure for table `letters`
--

CREATE TABLE `letters` (
  `id` int NOT NULL,
  `booking_id` int NOT NULL,
  `letter_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `letters`
--

INSERT INTO `letters` (`id`, `booking_id`, `letter_number`, `generated_at`) VALUES
(1, 2, '421.5/PK-RUANG/2026/01/0002', '2026-01-05 11:10:36');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('INFO','CHANGE_PROPOSED','APPROVED','REJECTED','USER_RESPONSE') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'INFO',
  `title` varchar(140) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`) VALUES
(1, 4, 'CHANGE_PROPOSED', 'Perubahan jadwal diajukan admin', 'Admin mengusulkan perubahan jadwal untuk booking BK-0003. Silakan terima atau tolak.', 0, '2026-01-05 11:10:36'),
(2, 1, 'INFO', 'Seed berhasil', 'Database dummy sudah dibuat. Siap testing.', 0, '2026-01-05 11:10:36');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('LAB','KELAS','AULA') COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `capacity` int NOT NULL DEFAULT '0',
  `facilities` text COLLATE utf8mb4_general_ci,
  `photo_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `code`, `name`, `type`, `location`, `capacity`, `facilities`, `photo_url`, `is_active`, `created_at`) VALUES
(1, 'LAB-KOM1', 'Lab Komputer 1', 'LAB', 'Gedung A Lt.2', 35, 'PC 35 unit, Proyektor, AC, WiFi', '/images/labkom1.jpg', 1, '2026-01-05 11:10:36'),
(2, 'LAB-KOM2', 'Lab Komputer 2', 'LAB', 'Gedung A Lt.2', 30, 'PC 30 unit, Proyektor, AC, WiFi', '/images/labkom2.jpg', 1, '2026-01-05 11:10:36'),
(3, 'R-101', 'Ruang Kelas 101', 'KELAS', 'Gedung B Lt.1', 40, 'Proyektor, Whiteboard, AC', '/images/r101.jpg', 1, '2026-01-05 11:10:36'),
(4, 'R-102', 'Ruang Kelas 102', 'KELAS', 'Gedung B Lt.1', 40, 'Proyektor, Whiteboard, AC', '/images/r102.jpg', 1, '2026-01-05 11:10:36'),
(5, 'AULA', 'Aula Kampus', 'AULA', 'Gedung Utama', 200, 'Sound system, Panggung, Kursi, AC', '/images/aula.jpg', 1, '2026-01-05 11:10:36'),
(6, 'LAB-MULTI', 'Lab Multimedia', 'LAB', 'Gedung C Lt.1', 25, 'PC 25 unit, Kamera, Lighting, Proyektor', '/images/labmulti.jpg', 1, '2026-01-05 11:10:36');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('ADMIN','DOSEN','MAHASISWA') COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin Kampus', 'admin', 'admin@kampus.ac.id', '$2a$10$y2XZXZ.aa5ngWa4.XVPx2uowtUOvodnW5Oa0QmZJiN6VtOtgHCaIa', 'ADMIN', '2026-01-05 11:10:36'),
(2, 'Dosen Budi', 'dosen_budi', 'budi@kampus.ac.id', '$2a$10$s/j6oSnly5xyDGq2FhFbreLeQwNmQqFeemFm5WLUxLxp76DR5lW5i', 'DOSEN', '2026-01-05 11:10:36'),
(3, 'Dosen Sari', 'dosen_sari', 'sari@kampus.ac.id', '$2a$10$s/j6oSnly5xyDGq2FhFbreLeQwNmQqFeemFm5WLUxLxp76DR5lW5i', 'DOSEN', '2026-01-05 11:10:36'),
(4, 'Mahasiswa Andi', 'mhs_andi', 'andi@student.ac.id', '$2a$10$NIzI8OCV0Rw.E06yHwvHHuk6mnPCvDx5FJlthb0X7RI1lGc/ldWS2', 'MAHASISWA', '2026-01-05 11:10:36'),
(5, 'Mahasiswa Rina', 'mhs_rina', 'rina@student.ac.id', '$2a$10$NIzI8OCV0Rw.E06yHwvHHuk6mnPCvDx5FJlthb0X7RI1lGc/ldWS2', 'MAHASISWA', '2026-01-05 11:10:36');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_code` (`booking_code`),
  ADD KEY `fk_booking_user` (`user_id`),
  ADD KEY `fk_booking_room` (`room_id`),
  ADD KEY `fk_booking_admin` (`admin_id`);

--
-- Indexes for table `fixed_schedules`
--
ALTER TABLE `fixed_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_fixed_room` (`room_id`);

--
-- Indexes for table `letters`
--
ALTER TABLE `letters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notif_user` (`user_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `fixed_schedules`
--
ALTER TABLE `fixed_schedules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `letters`
--
ALTER TABLE `letters`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_booking_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `fixed_schedules`
--
ALTER TABLE `fixed_schedules`
  ADD CONSTRAINT `fk_fixed_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `letters`
--
ALTER TABLE `letters`
  ADD CONSTRAINT `fk_letter_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
