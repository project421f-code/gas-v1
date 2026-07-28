-- ═══════════════════════════════════════════════════════════════
-- ADD superadmin@ga.com TO user_list & LINK TO AUTH
-- ═══════════════════════════════════════════════════════════════
-- Jalankan di: Supabase Dashboard → SQL Editor
-- 🔗 https://supabase.com/dashboard/project/ytoopikqfmiomgfzhoem/sql/new

DO $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Cari auth_id dari user yang sudah dibuat via Dashboard
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'superadmin@ga.com';
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION '❌ superadmin@ga.com belum ada di auth.users! Buat dulu via Dashboard → Authentication → Add User, dengan password: GAops2026!';
  ELSE
    -- Cek apakah sudah ada di user_list
    IF EXISTS (SELECT 1 FROM user_list WHERE email = 'superadmin@ga.com') THEN
      -- Update auth_id
      UPDATE user_list SET auth_id = v_auth_id, updated_at = NOW() WHERE email = 'superadmin@ga.com';
      RAISE NOTICE '✅ auth_id untuk superadmin@ga.com sudah diupdate.';
    ELSE
      -- Insert user baru
      INSERT INTO user_list (email, auth_id, user_id, nama, password, no_wa, tim, role, status, created_at, updated_at)
      VALUES (
        'superadmin@ga.com',
        v_auth_id,
        'SUPERADMIN',
        'Super Admin',
        '',
        '',
        'GA',
        'Admin',
        'Aktif',
        NOW(),
        NOW()
      );
      RAISE NOTICE '✅ superadmin@ga.com BERHASIL ditambahkan ke user_list.';
    END IF;
  END IF;
END $$;

-- Verifikasi hasil
SELECT ul.id, ul.email, ul.nama, ul.role, ul.status, 
       CASE WHEN ul.auth_id IS NOT NULL THEN '✅ LINKED' ELSE '❌ NOT LINKED' END as auth_status
FROM user_list ul
WHERE ul.email = 'superadmin@ga.com';
