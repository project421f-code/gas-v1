-- ═══════════════════════════════════════════════════════════════
-- PHASE 2A: MIGRASI SUPABASE AUTH (SIMPLIFIED)
-- ═══════════════════════════════════════════════════════════════
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. TAMBAHKAN KOLOM auth_id (jika belum ada)
ALTER TABLE user_list ADD COLUMN IF NOT EXISTS auth_id UUID;

-- 2. BUAT AUTH USERS — pendekatan sederhana, satu per satu
-- Password default: 'GAops2026!' — WAJIB ganti setelah login

-- admin@ga.com (Admin)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'admin@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Administrator","role":"Admin","tim":"Management"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'admin@ga.com'), 'email', 'admin@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'admin@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'admin@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'admin@ga.com') WHERE email = 'admin@ga.com';

-- supervisor@ga.com (Supervisor)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'supervisor@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Supervisor GA","role":"Supervisor","tim":"Management"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'supervisor@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'supervisor@ga.com'), 'email', 'supervisor@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'supervisor@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'supervisor@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'supervisor@ga.com') WHERE email = 'supervisor@ga.com';

-- ahmad@ga.com (Staff Maintenance)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'ahmad@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Ahmad Teknisi","role":"Staff","tim":"Maintenance"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ahmad@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'ahmad@ga.com'), 'email', 'ahmad@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'ahmad@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'ahmad@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'ahmad@ga.com') WHERE email = 'ahmad@ga.com';

-- budi@ga.com (Staff Security)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'budi@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Budi Security","role":"Staff","tim":"Security"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'budi@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'budi@ga.com'), 'email', 'budi@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'budi@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'budi@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'budi@ga.com') WHERE email = 'budi@ga.com';

-- citra@ga.com (Staff Housekeeping)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'citra@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Citra CS","role":"Staff","tim":"Housekeeping"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'citra@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'citra@ga.com'), 'email', 'citra@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'citra@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'citra@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'citra@ga.com') WHERE email = 'citra@ga.com';

-- dewi@ga.com (Staff General Services)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'dewi@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Dewi CS","role":"Staff","tim":"General Services"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dewi@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'dewi@ga.com'), 'email', 'dewi@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'dewi@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'dewi@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'dewi@ga.com') WHERE email = 'dewi@ga.com';

-- project421f@gmail.com (Arif - Admin)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'project421f@gmail.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Arif","role":"Admin","tim":"Management"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'project421f@gmail.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'project421f@gmail.com'), 'email', 'project421f@gmail.com', NOW(), NOW()
FROM auth.users WHERE email = 'project421f@gmail.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'project421f@gmail.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'project421f@gmail.com') WHERE email = 'project421f@gmail.com';

-- imronfariel@gmail.com (Imron - Staff Security)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'imronfariel@gmail.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Imron","role":"Staff","tim":"Security"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'imronfariel@gmail.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'imronfariel@gmail.com'), 'email', 'imronfariel@gmail.com', NOW(), NOW()
FROM auth.users WHERE email = 'imronfariel@gmail.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'imronfariel@gmail.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'imronfariel@gmail.com') WHERE email = 'imronfariel@gmail.com';

-- ardi@ga.com (Ardi - Staff Maintenance)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'ardi@ga.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Ardi","role":"Staff","tim":"Maintenance"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ardi@ga.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'ardi@ga.com'), 'email', 'ardi@ga.com', NOW(), NOW()
FROM auth.users WHERE email = 'ardi@ga.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'ardi@ga.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'ardi@ga.com') WHERE email = 'ardi@ga.com';

-- amrh209081977@gmail.com (Udin - Staff Maintenance)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'amrh209081977@gmail.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Udin","role":"Staff","tim":"Maintenance"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'amrh209081977@gmail.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'amrh209081977@gmail.com'), 'email', 'amrh209081977@gmail.com', NOW(), NOW()
FROM auth.users WHERE email = 'amrh209081977@gmail.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'amrh209081977@gmail.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'amrh209081977@gmail.com') WHERE email = 'amrh209081977@gmail.com';

-- lcpcandra@gmail.com (Hanafi Candra - Staff Security)
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'lcpcandra@gmail.com', crypt('GAops2026!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"nama":"Hanafi Candra","role":"Staff","tim":"Security"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lcpcandra@gmail.com');
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), id, jsonb_build_object('sub', id, 'email', 'lcpcandra@gmail.com'), 'email', 'lcpcandra@gmail.com', NOW(), NOW()
FROM auth.users WHERE email = 'lcpcandra@gmail.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'lcpcandra@gmail.com');
UPDATE user_list SET auth_id = (SELECT id FROM auth.users WHERE email = 'lcpcandra@gmail.com') WHERE email = 'lcpcandra@gmail.com';

-- 3. VERIFIKASI
SELECT '✅ AUTH USERS CREATED' AS info;
SELECT email, COALESCE(last_sign_in_at::text, 'never') as last_login FROM auth.users ORDER BY email;
SELECT '✅ USERS LINKED:' AS info, COUNT(*) FROM user_list WHERE auth_id IS NOT NULL;
SELECT '❌ USERS NOT LINKED:' AS info, COUNT(*) FROM user_list WHERE auth_id IS NULL;

-- 4. BUAT INDEX
CREATE INDEX IF NOT EXISTS idx_user_list_auth_id ON user_list(auth_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES UNTUK AUTHENTICATED USERS
-- ═══════════════════════════════════════════════════════════════

-- HAPUS POLICY PUBLIC READ YANG LAMA (dari Phase 1)
-- Ganti dengan: Public bisa SELECT, Authenticated bisa INSERT/UPDATE/DELETE

-- Hapus semua policy yang mungkin sudah ada (idempotent)
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND (policyname LIKE 'Auth users%' OR policyname = 'Public read access' OR policyname LIKE 'Allow public%') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- TABLE: asset_list
CREATE POLICY "Public read access" ON asset_list FOR SELECT USING (true);
CREATE POLICY "Auth users can insert" ON asset_list FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update" ON asset_list FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete" ON asset_list FOR DELETE TO authenticated USING (true);

-- TABLE: user_list
CREATE POLICY "Public read access" ON user_list FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON user_list FOR UPDATE 
  TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- TABLE: asset_booking
CREATE POLICY "Public read access" ON asset_booking FOR SELECT USING (true);
CREATE POLICY "Auth users can insert booking" ON asset_booking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update booking" ON asset_booking FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete booking" ON asset_booking FOR DELETE TO authenticated USING (true);

-- TABLE: master_kos
CREATE POLICY "Public read access" ON master_kos FOR SELECT USING (true);
CREATE POLICY "Auth users can manage kos" ON master_kos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_kamar
CREATE POLICY "Public read access" ON master_kamar FOR SELECT USING (true);
CREATE POLICY "Auth users can manage kamar" ON master_kamar FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_sla
CREATE POLICY "Public read access" ON master_sla FOR SELECT USING (true);
CREATE POLICY "Auth users can manage SLA" ON master_sla FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_cs_schedule
CREATE POLICY "Public read access" ON master_cs_schedule FOR SELECT USING (true);
CREATE POLICY "Auth users can manage CS schedule" ON master_cs_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: patrol_log
CREATE POLICY "Public read access" ON patrol_log FOR SELECT USING (true);
CREATE POLICY "Auth users can manage patrol" ON patrol_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: asset_inspection
CREATE POLICY "Public read access" ON asset_inspection FOR SELECT USING (true);
CREATE POLICY "Auth users can manage inspection" ON asset_inspection FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: main_data
CREATE POLICY "Public read access" ON main_data FOR SELECT USING (true);
CREATE POLICY "Auth users can manage maintenance" ON main_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: cs_daily_checklist
CREATE POLICY "Public read access" ON cs_daily_checklist FOR SELECT USING (true);
CREATE POLICY "Auth users can manage checklist" ON cs_daily_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: audit_housekeeping
CREATE POLICY "Public read access" ON audit_housekeeping FOR SELECT USING (true);
CREATE POLICY "Auth users can manage audit" ON audit_housekeeping FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: gc_execution
CREATE POLICY "Public read access" ON gc_execution FOR SELECT USING (true);
CREATE POLICY "Auth users can manage GC" ON gc_execution FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: survey_ga
CREATE POLICY "Public read access" ON survey_ga FOR SELECT USING (true);
CREATE POLICY "Auth users can insert survey" ON survey_ga FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update survey" ON survey_ga FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_patrol_checkpoints
CREATE POLICY "Public read access" ON master_patrol_checkpoints FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_patrol_checkpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_patrol_schedule
CREATE POLICY "Public read access" ON master_patrol_schedule FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_patrol_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: master_survey_config
CREATE POLICY "Public read access" ON master_survey_config FOR SELECT USING (true);
CREATE POLICY "Auth users can manage" ON master_survey_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE: kpi_security
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
