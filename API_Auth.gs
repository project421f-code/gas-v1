/**
 * ============================================================
 * API_Auth.gs — Autentikasi & Manajemen User
 * GA Operations Management System v1.0
 * ============================================================
 */

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi User_List ke Supabase
 */


// ─── LOGIN FUNCTIONS ────────────────────────────────────────

/**
 * Login dengan Google SSO (Auto-Login)
 * Menggunakan Session.getActiveUser().getEmail()
 */
function loginWithGoogleSSO() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) {
      return errorResponse('Tidak dapat mendeteksi akun Google. Gunakan login manual.');
    }

    var found = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'email', email);
    if (!found) {
      return errorResponse('Email "' + email + '" tidak terdaftar dalam sistem.');
    }
    if (found.data.status !== 'Aktif') {
      return errorResponse('Akun Anda dinonaktifkan. Hubungi Admin.');
    }

    // Generate session token
    var token = generateUUID();
    setSessionToken(email, token);
    CURRENT_USER_EMAIL = email;

    return successResponse({
      email: found.data.email,
      nama: found.data.nama,
      role: found.data.role,
      tim: found.data.tim,
      userId: found.data.user_id,
      token: token,
      loginMode: 'sso'
    }, 'Login berhasil! Selamat datang, ' + found.data.nama + '.');

  } catch (e) {
    return errorResponse('Gagal login SSO: ' + e.message);
  }
}

/**
 * Login dengan Email + Password (Manual)
 */
function loginWithEmailAndPassword(email, password) {
  try {
    if (!email || !password) {
      return errorResponse('Email dan password wajib diisi.');
    }

    var found = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'email', email.trim().toLowerCase());
    if (!found) {
      return errorResponse('Email tidak terdaftar dalam sistem.');
    }
    if (found.data.status !== 'Aktif') {
      return errorResponse('Akun Anda dinonaktifkan. Hubungi Admin.');
    }

    // Verifikasi password
    var hashedInput = hashPassword(password);
    if (hashedInput !== found.data.password) {
      return errorResponse('Password salah.');
    }

    // Generate session token
    var token = generateUUID();
    setSessionToken(found.data.email, token);
    CURRENT_USER_EMAIL = found.data.email;

    return successResponse({
      email: found.data.email,
      nama: found.data.nama,
      role: found.data.role,
      tim: found.data.tim,
      userId: found.data.user_id,
      token: token,
      loginMode: 'manual'
    }, 'Login berhasil! Selamat datang, ' + found.data.nama + '.');

  } catch (e) {
    return errorResponse('Gagal login: ' + e.message);
  }
}

/**
 * Logout user — hapus session token
 */
function logoutUser() {
  try {
    if (CURRENT_USER_EMAIL) {
      removeSessionToken(CURRENT_USER_EMAIL);
    }
    return successResponse(null, 'Logout berhasil.');
  } catch (e) {
    return errorResponse('Gagal logout: ' + e.message);
  }
}

// ─── USER MANAGEMENT (Admin Only) ───────────────────────────

/**
 * Mendapatkan daftar semua user
 */
function getAllUsers() {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    var data = getDataFromSupabase('user_list', CONFIG.SHEETS.USER_LIST);
    // Jangan kirim password ke frontend
    data = data.map(function(d) {
      return {
        user_id: d.user_id,
        nama: d.nama,
        email: d.email,
        no_wa: d.no_wa || '',
        tim: d.tim,
        role: d.role,
        status: d.status
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan user (Create / Update) — LANGSUNG ke Supabase
 */
function saveUser(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (!payload.nama || !payload.email || !payload.role || !payload.tim) {
      throw new Error('Nama, email, role, dan tim wajib diisi.');
    }

    if (payload.user_id) {
      // UPDATE via Supabase PATCH
      var found = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'user_id', payload.user_id);
      if (!found) throw new Error('User tidak ditemukan.');

      var updates = {
        nama: payload.nama,
        email: payload.email.trim().toLowerCase(),
        no_wa: payload.no_wa || '',
        tim: payload.tim,
        role: payload.role
      };
      if (payload.password && payload.password.trim() !== '') {
        updates.password = hashPassword(payload.password);
      }

      var result = fetchSupabase('PATCH', 'user_list', {
        query: 'user_id=eq.' + encodeURIComponent(payload.user_id),
        data: updates
      });
      if (result && result.success === false) throw new Error(result.error || 'Gagal update user');
      return successResponse(null, 'User "' + payload.nama + '" berhasil diperbarui.');
    } else {
      // CREATE — cek email duplikat via Supabase
      var existing = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'email', payload.email.trim().toLowerCase());
      if (existing) throw new Error('Email "' + payload.email + '" sudah terdaftar.');
      if (!payload.password || payload.password.trim() === '') {
        throw new Error('Password wajib diisi untuk user baru.');
      }

      var newId = generateSupabaseSequentialId('USR', 'user_list', 'user_id');
      var result = fetchSupabase('POST', 'user_list', {
        data: {
          user_id: newId,
          nama: payload.nama,
          email: payload.email.trim().toLowerCase(),
          password: hashPassword(payload.password),
          no_wa: payload.no_wa || '',
          tim: payload.tim,
          role: payload.role,
          status: 'Aktif'
        }
      });
      if (result && result.success === false) throw new Error(result.error || 'Gagal tambah user');
      return successResponse({ user_id: newId }, 'User "' + payload.nama + '" berhasil ditambahkan.');
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Toggle status user (Aktif/Nonaktif) — LANGSUNG ke Supabase
 */
function toggleUserStatus(userId) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    var found = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'user_id', userId);
    if (!found) throw new Error('User tidak ditemukan.');
    if (found.data.email === user.email) {
      throw new Error('Anda tidak bisa menonaktifkan akun sendiri.');
    }

    var newStatus = found.data.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    var result = fetchSupabase('PATCH', 'user_list', {
      query: 'user_id=eq.' + encodeURIComponent(userId),
      data: { status: newStatus }
    });
    if (result && result.success === false) throw new Error(result.error || 'Gagal ubah status');
    return successResponse({ status: newStatus }, 'Status user berhasil diubah ke "' + newStatus + '".');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus user — LANGSUNG dari Supabase
 */
function deleteUser(userId) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    var found = findInSupabase('user_list', CONFIG.SHEETS.USER_LIST, 'user_id', userId);
    if (!found) throw new Error('User tidak ditemukan.');
    if (found.data.email === user.email) {
      throw new Error('Anda tidak bisa menghapus akun sendiri.');
    }

    var result = fetchSupabase('DELETE', 'user_list', {
      query: 'user_id=eq.' + encodeURIComponent(userId)
    });
    if (result && result.success === false) throw new Error(result.error || 'Gagal hapus user');
    return successResponse(null, 'User berhasil dihapus.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan daftar staff berdasarkan tim
 */
function getStaffByTeam(teamName) {
  try {
    var data = getDataFromSupabase('user_list', CONFIG.SHEETS.USER_LIST);
    var filtered = data.filter(function(d) {
      return d.status === 'Aktif' && (teamName ? d.tim === teamName : true);
    }).map(function(d) {
      return { user_id: d.user_id, nama: d.nama, email: d.email, no_wa: d.no_wa || '', tim: d.tim, role: d.role };
    });

    return successResponse(filtered);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan profil user yang sedang login
 */
function getMyProfile() {
  try {
    var user = getActiveUserSession();
    return successResponse(user);
  } catch (e) {
    return errorResponse(e.message);
  }
}
