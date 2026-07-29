async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;
  hideLoginError();
  if (!email || !password) { showLoginError('Email dan password wajib diisi.'); return; }

  var btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = '\u23F3 Memproses...';

  // Check if Supabase is ready
  if (!supabaseReady || !supabase) {
    btn.disabled = false; btn.textContent = 'Login';
    showLoginError('Gagal: Library Supabase tidak terload. Coba refresh halaman atau periksa koneksi internet.');
    console.error('Supabase not ready. CDN may have failed to load.');
    return;
  }

  try {
    // Use Supabase Auth to sign in
    var authRes = await supabase.auth.signInWithPassword({ email: email, password: password });

    if (authRes.error) {
      btn.disabled = false; btn.textContent = 'Login';
      if (authRes.error.message.includes('Invalid login')) {
        showLoginError('Email atau password salah.');
      } else {
        showLoginError(authRes.error.message);
      }
      return;
    }

    // Fetch user profile from user_list
    var profileRes = await supabase.from('user_list').select('*').eq('email', email).single();

    if (profileRes.error || !profileRes.data) {
      await supabase.auth.signOut();
      btn.disabled = false; btn.textContent = 'Login';
      showLoginError('Profil user tidak ditemukan. Hubungi Admin.');
      return;
    }

    if (profileRes.data.status !== 'Aktif') {
      await supabase.auth.signOut();
      btn.disabled = false; btn.textContent = 'Login';
      showLoginError('Akun Anda tidak aktif. Hubungi Admin.');
      return;
    }

    // Success
    APP.user = profileRes.data;
    btn.disabled = false; btn.textContent = 'Login';
    showToast('Selamat datang, ' + profileRes.data.nama + '!', 'success');
    hideLoginScreen();
    initApp();

  } catch(e) {
    btn.disabled = false; btn.textContent = 'Login';
    // Show actual error for debugging
    var msg = 'Gagal terhubung ke server.';
    if (e.message) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        msg += ' Periksa koneksi internet.';
      } else if (e.message.includes('timeout') || e.message.includes('timed out')) {
        msg += ' Koneksi timeout. Coba lagi.';
      } else {
        msg += ' ' + e.message;
      }
    }
    showLoginError(msg);
    console.error('Login error:', e);
  }
}

async function doLogout() {
  APP.user = null;
  await supabase.auth.signOut();
  // Reset form
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  hideLoginError();
  var layout = document.getElementById('app-layout');
  if (layout) layout.classList.remove('show');
  showLoginScreen();
  showToast('Berhasil logout', 'success');
}

// ════════════════════════════════════════════════════════════
// INIT APP
// ════════════════════════════════════════════════════════════
