-- ============================================================================
-- SUPABASE POSTGRESQL MIGRATION & DATA IMPORT SCRIPT
-- Source Database: ai-studio-335dd8de-a015-4eda-8dd1-3c5f21c7e92e
-- Generated for Supabase SQL Editor
-- Export Date: 2026-07-26
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  "adminPassword" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (id, "adminPassword")
VALUES ('admin', 'admin123')
ON CONFLICT (id) DO UPDATE SET "adminPassword" = EXCLUDED."adminPassword";


-- ----------------------------------------------------------------------------
-- 2. CLASSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.classes (id, nama)
VALUES 
  ('kls-1', 'Kelas 1A'),
  ('kls-2', 'Kelas 2B'),
  ('kls-3', 'Kelas 3A'),
  ('kls-4', 'Kelas 4A'),
  ('kls-5', 'Kelas 5B'),
  ('kls-6', 'Kelas 6A')
ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama;


-- ----------------------------------------------------------------------------
-- 3. HALAQOH TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.halaqoh (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  "musyrifId" TEXT,
  "musyrifNama" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.halaqoh (id, nama, "musyrifId", "musyrifNama")
VALUES 
  ('hq-1', 'Halaqoh Al-Kahfi', 'usr-1', 'Ahmad Muzakki, S.Pd.'),
  ('hq-2', 'Halaqoh An-Nur', 'usr-2', 'Umar Al-Faruq'),
  ('hq-3', 'Halaqoh At-Tin', '', 'Belum Ditentukan')
ON CONFLICT (id) DO UPDATE SET 
  nama = EXCLUDED.nama,
  "musyrifId" = EXCLUDED."musyrifId",
  "musyrifNama" = EXCLUDED."musyrifNama";


-- ----------------------------------------------------------------------------
-- 4. MUSYRIF TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.musyrif (
  id TEXT PRIMARY KEY,
  nim TEXT,
  nama TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  "halaqohId" TEXT,
  "halaqohNama" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.musyrif (id, nim, nama, username, password, "halaqohId", "halaqohNama")
VALUES 
  ('usr-1', '202601001', 'Ahmad Muzakki, S.Pd.', 'ahmad', 'password123', 'hq-1', 'Halaqoh Al-Kahfi'),
  ('usr-2', '202601002', 'Umar Al-Faruq', 'umar', 'password123', 'hq-2', 'Halaqoh An-Nur')
ON CONFLICT (id) DO UPDATE SET 
  nim = EXCLUDED.nim,
  nama = EXCLUDED.nama,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  "halaqohId" = EXCLUDED."halaqohId",
  "halaqohNama" = EXCLUDED."halaqohNama";


-- ----------------------------------------------------------------------------
-- 5. STUDENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  "noInduk" TEXT,
  nama TEXT NOT NULL,
  "kelasId" TEXT,
  "kelasNama" TEXT,
  "halaqohId" TEXT,
  "halaqohNama" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.students (id, "noInduk", nama, "kelasId", "kelasNama", "halaqohId", "halaqohNama")
VALUES 
  ('sis-1', '1001', 'Abdurrahman Wahid', 'kls-1', 'Kelas 1A', 'hq-1', 'Halaqoh Al-Kahfi'),
  ('sis-2', '1002', 'Aisyah Humaira', 'kls-1', 'Kelas 1A', 'hq-1', 'Halaqoh Al-Kahfi'),
  ('sis-3', '1003', 'Muhammad Bilal', 'kls-2', 'Kelas 2B', 'hq-1', 'Halaqoh Al-Kahfi'),
  ('sis-4', '1004', 'Fathimah Az-Zahra', 'kls-2', 'Kelas 2B', 'hq-2', 'Halaqoh An-Nur'),
  ('sis-5', '1005', 'Yusuf Al-Banjari', 'kls-3', 'Kelas 3A', 'hq-2', 'Halaqoh An-Nur'),
  ('sis-6', '1006', 'Khadijah Al-Kubra', 'kls-3', 'Kelas 3A', 'hq-3', 'Halaqoh At-Tin')
ON CONFLICT (id) DO UPDATE SET 
  "noInduk" = EXCLUDED."noInduk",
  nama = EXCLUDED.nama,
  "kelasId" = EXCLUDED."kelasId",
  "kelasNama" = EXCLUDED."kelasNama",
  "halaqohId" = EXCLUDED."halaqohId",
  "halaqohNama" = EXCLUDED."halaqohNama";


-- ----------------------------------------------------------------------------
-- 6. CATATAN_HARIAN TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catatan_harian (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  "siswaId" TEXT,
  "siswaNama" TEXT,
  "noInduk" TEXT,
  "kelasNama" TEXT,
  "halaqohId" TEXT,
  "materiSetoran" TEXT,
  "evaluasiTahsin" TEXT,
  nilai TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.catatan_harian (id, tanggal, "siswaId", "siswaNama", "noInduk", "kelasNama", "halaqohId", "materiSetoran", "evaluasiTahsin", nilai)
VALUES 
  ('cat-1', '2026-06-18', 'sis-1', 'Abdurrahman Wahid', '1001', 'Kelas 1A', 'hq-1', 'An-Naba 1-15', 'Tahsin sangat lancar, perlu menjaga panjang pendek pada mad wajib.', 'A'),
  ('cat-2', '2026-06-18', 'sis-2', 'Aisyah Humaira', '1002', 'Kelas 1A', 'hq-1', 'An-Nazi''at 1-20', 'Hafalan agak terbata-bata di ayat 12-15, perlu muraja''ah kembali.', 'C'),
  ('cat-3', '2026-06-19', 'sis-1', 'Abdurrahman Wahid', '1001', 'Kelas 1A', 'hq-1', 'An-Naba 16-30', 'Bagus sekali, bacaannya tartil dan makhrajnya tepat.', 'A'),
  ('cat-4', '2026-06-19', 'sis-2', 'Aisyah Humaira', '1002', 'Kelas 1A', 'hq-1', 'An-Nazi''at 21-46', 'Ada peningkatan dari kemarin, pertahankan mad lazim-nya.', 'B'),
  ('cat-5', '2026-06-19', 'sis-4', 'Fathimah Az-Zahra', '1004', 'Kelas 2B', 'hq-2', 'Abasa 1-20', 'Alhamdulillah sudah setoran dengan tajwid yang memadai.', 'B')
ON CONFLICT (id) DO UPDATE SET 
  tanggal = EXCLUDED.tanggal,
  "siswaId" = EXCLUDED."siswaId",
  "siswaNama" = EXCLUDED."siswaNama",
  "noInduk" = EXCLUDED."noInduk",
  "kelasNama" = EXCLUDED."kelasNama",
  "halaqohId" = EXCLUDED."halaqohId",
  "materiSetoran" = EXCLUDED."materiSetoran",
  "evaluasiTahsin" = EXCLUDED."evaluasiTahsin",
  nilai = EXCLUDED.nilai;


-- ----------------------------------------------------------------------------
-- 7. ABSEN_MUSYRIF TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.absen_musyrif (
  id TEXT PRIMARY KEY,
  "musyrifId" TEXT,
  "musyrifNama" TEXT,
  tanggal TEXT,
  waktu TEXT,
  hari TEXT,
  "fotoUrl" TEXT,
  status TEXT DEFAULT 'Proses',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.absen_musyrif (id, "musyrifId", "musyrifNama", tanggal, waktu, hari, "fotoUrl", status)
VALUES 
  ('abs-m1', 'usr-1', 'Ahmad Muzakki, S.Pd.', '2026-06-19', '07:15', 'Jumat', '', 'Disetujui')
ON CONFLICT (id) DO UPDATE SET 
  "musyrifId" = EXCLUDED."musyrifId",
  "musyrifNama" = EXCLUDED."musyrifNama",
  tanggal = EXCLUDED.tanggal,
  waktu = EXCLUDED.waktu,
  hari = EXCLUDED.hari,
  "fotoUrl" = EXCLUDED."fotoUrl",
  status = EXCLUDED.status;


-- ----------------------------------------------------------------------------
-- 8. ABSEN_SISWA TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.absen_siswa (
  id TEXT PRIMARY KEY,
  tanggal TEXT,
  "siswaId" TEXT,
  "siswaNama" TEXT,
  "noInduk" TEXT,
  "kelasId" TEXT,
  "kelasNama" TEXT,
  status TEXT,
  "musyrifId" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.absen_siswa (id, tanggal, "siswaId", "siswaNama", "noInduk", "kelasId", "kelasNama", status, "musyrifId")
VALUES 
  ('abs-s1', '2026-06-19', 'sis-1', 'Abdurrahman Wahid', '1001', 'kls-1', 'Kelas 1A', 'Hadir', 'usr-1')
ON CONFLICT (id) DO UPDATE SET 
  tanggal = EXCLUDED.tanggal,
  "siswaId" = EXCLUDED."siswaId",
  "siswaNama" = EXCLUDED."siswaNama",
  "noInduk" = EXCLUDED."noInduk",
  "kelasId" = EXCLUDED."kelasId",
  "kelasNama" = EXCLUDED."kelasNama",
  status = EXCLUDED.status,
  "musyrifId" = EXCLUDED."musyrifId";

-- Migration Completed
