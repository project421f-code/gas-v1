-- ═══════════════════════════════════════════════════════════════
-- PHASE 2A: MIGRASI SUPABASE AUTH
-- ═══════════════════════════════════════════════════════════════
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. TAMBAHKAN KOLOM auth_id DI user_list
ALTER TABLE user_list ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);
ALTER TABLE user_list ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. BUAT FUNCTION UNTUK MEMBUAT AUTH USER
CREATE OR REPLACE FUNCTION create_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_user_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmed_at,
    created_at, updated_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    p_user_metadata,
    FALSE, FALSE
  );

  -- Insert identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BUAT AUTH USERS UNTUK SEMUA USER DI user_list
-- Password default: 'GAops2026!' — user WAJIB ganti password setelah login

DO $$
DECLARE
  user_rec RECORD;
  new_auth_id UUID;
BEGIN
  FOR user_rec IN SELECT * FROM user_list WHERE auth_id IS NULL LOOP
    BEGIN
      new_auth_id := create_auth_user(
        user_rec.email,
        'GAops2026!',
        jsonb_build_object(
          'nama', user_rec.nama,
          'role', user_rec.role,
          'tim', user_rec.tim
        )
      );
      
      UPDATE user_list SET 
        auth_id = new_auth_id,
        updated_at = NOW()
      WHERE id = user_rec.id;
      
      RAISE NOTICE '✅ Created auth user for: % (%)', user_rec.nama, user_rec.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed for % (%): %', user_rec.nama, user_rec.email, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4. HAPUS FUNCTION (sudah tidak diperlukan lagi)
DROP FUNCTION IF EXISTS create_auth_user(TEXT, TEXT, JSONB);

-- 5. BUAT INDEX UNTUK AUTH_ID
CREATE INDEX IF NOT EXISTS idx_user_list_auth_id ON user_list(auth_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES UNTUK AUTHENTICATED USERS
-- ═══════════════════════════════════════════════════════════════

-- HAPUS POLICY PUBLIC READ YANG LAMA (dari Phase 1)
-- Ganti dengan: Public bisa SELECT, Authenticated bisa INSERT/UPDATE/DELETE

-- TABLE: asset_list
DROP POLICY IF EXISTS "Allow public SELECT on asset_list" ON asset_list;
CREATE POLICY "Public read access" ON asset_list FOR SELECT USING (true);
CREATE POLICY "Auth users can insert" ON asset_list FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update" ON asset_list FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete" ON asset_list FOR DELETE TO authenticated USING (true);

-- TABLE: user_list
DROP POLICY IF EXISTS "Allow public SELECT on user_list" ON user_list;
CREATE POLICY "Public read access" ON user_list FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON user_list FOR UPDATE 
  TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- TABLE: asset_booking
DROP POLICY IF EXISTS "Allow public SELECT on asset_booking" ON asset_booking;
CREATE POLICY "Public read access" ON asset_booking FOR SELECT USING (true);
CREATE POLICY "Auth users can insert booking" ON asset_booking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update booking" ON asset_booking FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete booking" ON asset_booking FOR DELETE TO authenticated USING (true);

-- TABLE: master_kos
DROP POLICY IF EXISTS "Allow public SELECT on master_kos" ON master_kos;
CREATE POLICY "Public read access" ON master_kos FOR SELECT USING (true);
CREATE POLICY "Auth users can manage kos" ON master_kos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_kamar
DROP POLICY IF EXISTS "Allow public SELECT on master_kamar" ON master_kamar;
CREATE POLICY "Public read access" ON master_kamar FOR SELECT USING (true);
CREATE POLICY "Auth users can manage kamar" ON master_kamar FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_sla
DROP POLICY IF EXISTS "Allow public SELECT on master_sla" ON master_sla;
CREATE POLICY "Public read access" ON master_sla FOR SELECT USING (true);
CREATE POLICY "Auth users can manage SLA" ON master_sla FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_cs_schedule
DROP POLICY IF EXISTS "Allow public SELECT on master_cs_schedule" ON master_cs_schedule;
CREATE POLICY "Public read access" ON master_cs_schedule FOR SELECT USING (true);
CREATE POLICY "Auth users can manage CS schedule" ON master_cs_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: patrol_log
DROP POLICY IF EXISTS "Allow public SELECT on patrol_log" ON patrol_log;
CREATE POLICY "Public read access" ON patrol_log FOR SELECT USING (true);
CREATE POLICY "Auth users can manage patrol" ON patrol_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: asset_inspection
DROP POLICY IF EXISTS "Allow public SELECT on asset_inspection" ON asset_inspection;
CREATE POLICY "Public read access" ON asset_inspection FOR SELECT USING (true);
CREATE POLICY "Auth users can manage inspection" ON asset_inspection FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: main_data
DROP POLICY IF EXISTS "Allow public SELECT on main_data" ON main_data;
CREATE POLICY "Public read access" ON main_data FOR SELECT USING (true);
CREATE POLICY "Auth users can manage maintenance" ON main_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: cs_daily_checklist
DROP POLICY IF EXISTS "Allow public SELECT on cs_daily_checklist" ON cs_daily_checklist;
CREATE POLICY "Public read access" ON cs_daily_checklist FOR SELECT USING (true);
CREATE POLICY "Auth users can manage checklist" ON cs_daily_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: audit_housekeeping
DROP POLICY IF EXISTS "Allow public SELECT on audit_housekeeping" ON audit_housekeeping;
CREATE POLICY "Public read access" ON audit_housekeeping FOR SELECT USING (true);
CREATE POLICY "Auth users can manage audit" ON audit_housekeeping FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: gc_execution
DROP POLICY IF EXISTS "Allow public SELECT on gc_execution" ON gc_execution;
CREATE POLICY "Public read access" ON gc_execution FOR SELECT USING (true);
CREATE POLICY "Auth users can manage GC" ON gc_execution FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: survey_ga
DROP POLICY IF EXISTS "Allow public SELECT on survey_ga" ON survey_ga;
CREATE POLICY "Public read access" ON survey_ga FOR SELECT USING (true);
CREATE POLICY "Auth users can insert survey" ON survey_ga FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update survey" ON survey_ga FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_patrol_checkpoints
DROP POLICY IF EXISTS "Allow public SELECT on master_patrol_checkpoints" ON master_patrol_checkpoints;
CREATE POLICY "Public read access" ON master_patrol_checkpoints FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_patrol_checkpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_patrol_schedule
DROP POLICY IF EXISTS "Allow public SELECT on master_patrol_schedule" ON master_patrol_schedule;
CREATE POLICY "Public read access" ON master_patrol_schedule FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_patrol_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_survey_config
DROP POLICY IF EXISTS "Allow public SELECT on master_survey_config" ON master_survey_config;
CREATE POLICY "Public read access" ON master_survey_config FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_survey_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: kpi_security
DROP POLICY IF EXISTS "Allow public SELECT on kpi_security" ON kpi_security;
CREATE POLICY "Public read access" ON kpi_security FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON kpi_security FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: kpi_mnt (di-skip karena tabel tidak ada di project ini)
-- Error sebelumnya: relation "kpi_mnt" does not exist
-- Hapus baris ini jika suatu saat tabel kpi_mnt dibuat

-- ═══════════════════════════════════════════════════════════════
-- VERIFIKASI
-- ═══════════════════════════════════════════════════════════════

-- Cek jumlah auth users yang sudah dibuat
SELECT '✅ Auth users created:' AS info, COUNT(*) AS total FROM auth.users;

-- Cek user_list yang sudah terlink
SELECT '✅ Users linked:' AS info, COUNT(*) AS total FROM user_list WHERE auth_id IS NOT NULL;

-- Cek user_list yang BELUM terlink
SELECT '❌ Users NOT linked:' AS info, COUNT(*) AS total FROM user_list WHERE auth_id IS NULL;
