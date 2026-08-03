async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;
  hideLoginError();
  if (!email || !password) { showLoginError('Email dan password wajib diisi.'); return; }

  var btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = '\u23F3 Memproses...';

  // Check backend GAS
  if (!gasConfigured()) {
    btn.disabled = false; btn.textContent = 'Login';
    showLoginError('URL Web App GAS belum diatur. Hubungi Admin untuk mengisi URL di menu Pengaturan.');
    return;
  }

  try {
    // Login via GAS — verifikasi email & password di spreadsheet
    var data = await apiCall('loginWithEmailAndPassword', [email, password]);

    // data: { email, nama, role, tim, userId, token, loginMode }
    var user = {
      user_id: data.userId || '',
      email: data.email,
      nama: data.nama,
      role: data.role,
      tim: data.tim,
      status: 'Aktif',
      no_wa: data.no_wa || ''
    };
    saveSession(user, data.token);

    btn.disabled = false; btn.textContent = 'Login';
    showToast('Selamat datang, ' + data.nama + '!', 'success');
    hideLoginScreen();
    initApp();
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Login';
    showLoginError(e.message || 'Gagal terhubung ke server.');
  }
}

function doLogout() {
  // Informasikan server (fire-and-forget), lalu bersihkan sesi lokal
  try { apiCall('logoutUser', []).catch(function() {}); } catch(e) { /* ignore */ }
  clearSession();

  // Reset form
  var emailEl = document.getElementById('login-email');
  var passEl = document.getElementById('login-password');
  if (emailEl) emailEl.value = '';
  if (passEl) passEl.value = '';
  hideLoginError();
  var layout = document.getElementById('app-layout');
  if (layout) layout.classList.remove('show');
  showLoginScreen();
  showToast('Berhasil logout', 'success');
}

// ════════════════════════════════════════════════════════════
// INIT APP
// ════════════════════════════════════════════════════════════
