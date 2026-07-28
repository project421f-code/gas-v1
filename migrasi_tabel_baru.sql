-- ═══════════════════════════════════════════════════════════════
-- PHASE 2B: MIGRASI TABEL SUPABASE — Fitur Tambahan
-- ═══════════════════════════════════════════════════════════════
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════
-- CATATAN: Nama tabel disamakan dengan migration sebelumnya
-- (migrasi_supabase_auth.sql) untuk menghindari duplikasi.
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ 6 tabel sudah ada dari setup sebelumnya. CREATE TABLE IF NOT EXISTS
--    TIDAK mengubah tabel existing. Jadi kolom ditambah via ALTER TABLE.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. master_patrol_checkpoints — Master titik patroli security
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_patrol_checkpoints (
  id SERIAL PRIMARY KEY,
  id_pos TEXT UNIQUE NOT NULL,
  nama_pos TEXT NOT NULL,
  area TEXT,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. master_patrol_schedule — Jadwal patroli security
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_patrol_schedule (
  id SERIAL PRIMARY KEY,
  id_jadwal TEXT UNIQUE NOT NULL DEFAULT 'JAD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  hari TEXT NOT NULL,
  shift TEXT NOT NULL,
  nama_personel TEXT NOT NULL,
  jam_mulai TEXT,
  jam_selesai TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. cs_daily_checklist — Checklist harian cleaning service
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cs_daily_checklist (
  id SERIAL PRIMARY KEY,
  tim TEXT,
  nama_staf TEXT,
  lokasi_area TEXT,
  status_pekerjaan TEXT DEFAULT 'Belum Selesai',
  kesesuaian_jadwal TEXT DEFAULT 'On Schedule',
  kondisi_fasilitas TEXT DEFAULT 'Aman',
  detail_kerusakan TEXT,
  checklist_kerja TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. audit_housekeeping — Audit & supervisi kebersihan
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_housekeeping (
  id SERIAL PRIMARY KEY,
  nama_auditor TEXT,
  lokasi_area TEXT,
  tim_diaudit TEXT,
  nama_staf TEXT,
  skor_kebersihan INTEGER CHECK (skor_kebersihan >= 1 AND skor_kebersihan <= 5),
  status_kelayakan TEXT DEFAULT 'Layak' CHECK (status_kelayakan IN ('Layak', 'Tidak Layak')),
  catatan TEXT,
  foto_temuan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. gc_execution — Jadwal general cleaning
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gc_execution (
  id SERIAL PRIMARY KEY,
  lokasi TEXT,
  jenis TEXT,
  target_selesai TEXT,
  tim TEXT,
  pj TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Selesai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. guest_bookings — Check in / check out tamu kos (TABEL BARU)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS guest_bookings (
  id SERIAL PRIMARY KEY,
  id_booking TEXT UNIQUE NOT NULL DEFAULT 'BK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  kode_kamar TEXT NOT NULL,
  nama_tamu TEXT NOT NULL,
  no_wa TEXT,
  durasi_sewa TEXT DEFAULT 'Bulanan',
  harga_sewa NUMERIC DEFAULT 0,
  tanggal_check_in TEXT,
  catatan TEXT,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Check Out', 'Dibatalkan')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 7. room_status_log — Riwayat perubahan status kamar (TABEL BARU)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS room_status_log (
  id SERIAL PRIMARY KEY,
  kode_kamar TEXT NOT NULL,
  status_sebelum TEXT,
  status_sesudah TEXT,
  pic TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 8. master_survey_config — Konfigurasi survey GA (JSON)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_survey_config (
  id SERIAL PRIMARY KEY,
  teams JSONB DEFAULT '[]'::jsonb,
  criteria JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 9. kpi_housekeeping — KPI Housekeeping (TABEL BARU)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kpi_housekeeping (
  id SERIAL PRIMARY KEY,
  nama_staf TEXT NOT NULL,
  tim TEXT,
  total_checklist INTEGER DEFAULT 0,
  on_schedule INTEGER DEFAULT 0,
  persen_compliance NUMERIC DEFAULT 0,
  skor_audit NUMERIC DEFAULT 0,
  periode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. ALTER TABLE — Tambah kolom ke tabel EXISTING
-- ═══════════════════════════════════════════════════════════════
-- CREATE TABLE IF NOT EXISTS tidak mengubah tabel yang sudah ada.
-- Jadi setiap kolom yang dibutuhkan harus ditambah via ALTER TABLE.

-- master_patrol_checkpoints (existing)
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS id_pos TEXT;
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS nama_pos TEXT;
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE master_patrol_checkpoints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- master_patrol_schedule (existing)
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS id_jadwal TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS hari TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS nama_personel TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS jam_mulai TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS jam_selesai TEXT;
ALTER TABLE master_patrol_schedule ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- cs_daily_checklist (existing)
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS tim TEXT;
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS nama_staf TEXT;
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS lokasi_area TEXT;
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS status_pekerjaan TEXT DEFAULT 'Belum Selesai';
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS kesesuaian_jadwal TEXT DEFAULT 'On Schedule';
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS kondisi_fasilitas TEXT DEFAULT 'Aman';
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS detail_kerusakan TEXT;
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS checklist_kerja TEXT;
ALTER TABLE cs_daily_checklist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- audit_housekeeping (existing)
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS nama_auditor TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS lokasi_area TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS tim_diaudit TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS nama_staf TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS skor_kebersihan INTEGER;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS status_kelayakan TEXT DEFAULT 'Layak';
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS foto_temuan TEXT;
ALTER TABLE audit_housekeeping ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- gc_execution (existing)
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS lokasi TEXT;
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS jenis TEXT;
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS target_selesai TEXT;
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS tim TEXT;
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS pj TEXT;
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE gc_execution ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- master_survey_config (existing)
ALTER TABLE master_survey_config ADD COLUMN IF NOT EXISTS teams JSONB DEFAULT '[]'::jsonb;
ALTER TABLE master_survey_config ADD COLUMN IF NOT EXISTS criteria JSONB DEFAULT '[]'::jsonb;
ALTER TABLE master_survey_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE master_survey_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ═══════════════════════════════════════════════════════════════
-- 11. INDEXES
-- ═══════════════════════════════════════════════════════════════
-- Setelah kolom dipastikan ada via ALTER TABLE di atas, index aman dibuat.
CREATE INDEX IF NOT EXISTS idx_master_patrol_checkpoints_status ON master_patrol_checkpoints(status);
CREATE INDEX IF NOT EXISTS idx_master_patrol_schedule_hari ON master_patrol_schedule(hari);
CREATE INDEX IF NOT EXISTS idx_cs_daily_checklist_created ON cs_daily_checklist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_housekeeping_created ON audit_housekeeping(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gc_execution_status ON gc_execution(status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_status ON guest_bookings(status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_kamar ON guest_bookings(kode_kamar);
CREATE INDEX IF NOT EXISTS idx_room_status_log_kamar ON room_status_log(kode_kamar);
CREATE INDEX IF NOT EXISTS idx_kpi_housekeeping_periode ON kpi_housekeeping(periode);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES — Khusus untuk tabel yang BELUM punya policy
-- ═══════════════════════════════════════════════════════════════
-- Tabel yang SUDAH punya policy dari migration sebelumnya:
--   master_patrol_checkpoints, master_patrol_schedule,
--   cs_daily_checklist, audit_housekeeping, gc_execution, master_survey_config
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS for new tables only
ALTER TABLE guest_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_housekeeping ENABLE ROW LEVEL SECURITY;

-- Public read access
drop policy if exists "Public read guest_bookings" on guest_bookings;
CREATE POLICY "Public read guest_bookings" ON guest_bookings FOR SELECT USING (true);
drop policy if exists "Public read room_status_log" on room_status_log;
CREATE POLICY "Public read room_status_log" ON room_status_log FOR SELECT USING (true);
drop policy if exists "Public read kpi_housekeeping" on kpi_housekeeping;
CREATE POLICY "Public read kpi_housekeeping" ON kpi_housekeeping FOR SELECT USING (true);

-- Authenticated users can insert/update/delete
drop policy if exists "Auth can insert guest_bookings" on guest_bookings;
CREATE POLICY "Auth can insert guest_bookings" ON guest_bookings FOR INSERT TO authenticated WITH CHECK (true);
drop policy if exists "Auth can update guest_bookings" on guest_bookings;
CREATE POLICY "Auth can update guest_bookings" ON guest_bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
drop policy if exists "Auth can delete guest_bookings" on guest_bookings;
CREATE POLICY "Auth can delete guest_bookings" ON guest_bookings FOR DELETE TO authenticated USING (true);

drop policy if exists "Auth can insert room_status_log" on room_status_log;
CREATE POLICY "Auth can insert room_status_log" ON room_status_log FOR INSERT TO authenticated WITH CHECK (true);
drop policy if exists "Auth can update room_status_log" on room_status_log;
CREATE POLICY "Auth can update room_status_log" ON room_status_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

drop policy if exists "Auth can insert kpi_housekeeping" on kpi_housekeeping;
CREATE POLICY "Auth can insert kpi_housekeeping" ON kpi_housekeeping FOR INSERT TO authenticated WITH CHECK (true);
drop policy if exists "Auth can update kpi_housekeeping" on kpi_housekeeping;
CREATE POLICY "Auth can update kpi_housekeeping" ON kpi_housekeeping FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
drop policy if exists "Auth can delete kpi_housekeeping" on kpi_housekeeping;
CREATE POLICY "Auth can delete kpi_housekeeping" ON kpi_housekeeping FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- VERIFIKASI
-- ═══════════════════════════════════════════════════════════════

SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'master_patrol_checkpoints', 'master_patrol_schedule',
    'cs_daily_checklist', 'audit_housekeeping', 'gc_execution',
    'guest_bookings', 'room_status_log',
    'master_survey_config', 'kpi_housekeeping'
  )
ORDER BY table_name;

SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'master_patrol_checkpoints', 'master_patrol_schedule',
    'cs_daily_checklist', 'audit_housekeeping', 'gc_execution',
    'guest_bookings', 'room_status_log',
    'master_survey_config', 'kpi_housekeeping'
  )
ORDER BY tablename, policyname;
