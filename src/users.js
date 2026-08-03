async function generateUserId() {
  try {
    var data = await apiCall('getAllUsers', []);
    var maxNum = 0;
    (data || []).forEach(function(u) {
      var m = String(u.user_id || '').match(/USR-(\d+)/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    _userIdCounter = maxNum + 1;
  } catch(e) {
    _userIdCounter++;
  }
  return 'USR-' + String(_userIdCounter).padStart(3, '0');
}

async function renderUsers(content) {
  content.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px">Memuat data user...</div>';
  try {
    var data = await apiCall('getAllUsers', []);
    _usersData = data;

    var total = data.length;
    var aktif = data.filter(function(u) { return u.status === 'Aktif'; }).length;
    var nonaktif = data.filter(function(u) { return u.status === 'Nonaktif'; }).length;
    var admin = data.filter(function(u) { return u.role === 'Admin'; }).length;
    var staff = data.filter(function(u) { return u.role === 'Staff'; }).length;
    var supervisor = data.filter(function(u) { return u.role === 'Supervisor'; }).length;

    var html = '<div class="page-header"><div class="page-title">Manajemen User</div><div class="page-desc">Kelola pengguna sistem GA Operations</div></div>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total User</div><div class="stat-value blue">' + total + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Aktif</div><div class="stat-value green">' + aktif + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Nonaktif</div><div class="stat-value ' + (nonaktif > 0 ? 'red' : 'green') + '">' + nonaktif + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Admin</div><div class="stat-value purple">' + admin + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Staff</div><div class="stat-value orange">' + staff + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Supervisor</div><div class="stat-value blue">' + supervisor + '</div></div>';
    html += '</div>';

    html += '<div class="section-card">';
    html += '<div class="section-title">&#x1F465; Daftar User';
    html += ' <button class="hk-tab-btn" onclick="showUserForm()" style="margin-left:auto;' +
      'background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;' +
      'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">+ Tambah</button>';
    html += '</div>';

    if (data.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada user terdaftar</div>';
    } else {
      data.forEach(function(u, idx) {
        var statusColor = u.status === 'Aktif' ? '#34d399' : '#f87171';
        var roleBadge = '';
        if (u.role === 'Admin') roleBadge = ' <span style="background:rgba(99,102,241,0.2);color:#a5b4fc;padding:1px 8px;border-radius:8px;font-size:0.65rem">ADMIN</span>';
        else if (u.role === 'Supervisor') roleBadge = ' <span style="background:rgba(251,191,36,0.15);color:#fcd34d;padding:1px 8px;border-radius:8px;font-size:0.65rem">SPV</span>';
        else roleBadge = ' <span style="background:rgba(148,163,184,0.15);color:#94a3b8;padding:1px 8px;border-radius:8px;font-size:0.65rem">STAFF</span>';

        html += '<div class="activity-item">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(u.nama) + '</strong>' + roleBadge;
        html += '<br><span style="color:#e0e7ff">' + escapeHtml(u.email) + '</span>';
        html += ' <span style="color:#64748b">| ' + escapeHtml(u.tim || '-') + ' | ' + escapeHtml(u.no_wa || '-') + '</span>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">';
        html += '<button onclick="showUserForm(' + idx + ')" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:0.7rem">Edit</button>';
        html += '<button onclick="toggleUserStatus(' + idx + ')" style="background:' + (u.status === 'Aktif' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)') + ';color:' + (u.status === 'Aktif' ? '#fca5a5' : '#34d399') + ';border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:0.7rem">' + (u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan') + '</button>';
        html += '<button onclick="deleteUser(' + idx + ')" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:0.7rem">Hapus</button>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(u.status) + '</div>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Manajemen User</div><div class="page-desc">Kelola pengguna sistem</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

function showUserForm(idx) {
  var overlay = document.getElementById('modal-user-overlay');
  var form = document.getElementById('user-form');
  if (!overlay || !form) return;

  _editingUserId = null;
  form.reset();
  document.getElementById('user-form-title').textContent = 'Tambah User Baru';

  // Generate user ID async
  generateUserId().then(function(id) {
    document.getElementById('user-id-display').textContent = id;
    document.getElementById('user-form-id').value = id;
  });

  document.getElementById('user-form-password-group').style.display = 'block';
  document.getElementById('user-form-password').value = '';

  if (idx !== undefined && _usersData[idx]) {
    var u = _usersData[idx];
    _editingUserId = u.user_id;
    document.getElementById('user-form-title').textContent = 'Edit User: ' + u.nama;
    document.getElementById('user-id-display').textContent = u.user_id;
    document.getElementById('user-form-id').value = u.user_id;
    document.getElementById('user-form-nama').value = u.nama;
    document.getElementById('user-form-email').value = u.email;
    document.getElementById('user-form-wa').value = u.no_wa || '';
    document.getElementById('user-form-tim').value = u.tim || '';
    document.getElementById('user-form-role').value = u.role || 'Staff';
    document.getElementById('user-form-password-group').style.display = 'none';
    document.getElementById('user-form-password').value = '';
  }

  overlay.classList.add('show');
}

async function saveUserForm() {
  var form = document.getElementById('user-form');
  var overlay = document.getElementById('modal-user-overlay');
  var btn = form.querySelector('button[type="submit"]');

  var user_id = document.getElementById('user-form-id').value;
  var nama = document.getElementById('user-form-nama').value.trim();
  var email = document.getElementById('user-form-email').value.trim();
  var no_wa = document.getElementById('user-form-wa').value.trim();
  var tim = document.getElementById('user-form-tim').value.trim();
  var role = document.getElementById('user-form-role').value;

  if (!nama || !email) {
    showToast('Nama dan Email wajib diisi.', 'error');
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan...';

  try {
    var password = document.getElementById('user-form-password').value;

    if (_editingUserId) {
      // UPDATE
      var payload = {
        user_id: _editingUserId,
        nama: nama,
        email: email,
        no_wa: no_wa,
        tim: tim,
        role: role
      };
      if (password) payload.password = password;
      await apiCall('saveUser', [payload]);
      showToast('User ' + nama + ' berhasil diupdate!', 'success');
    } else {
      // INSERT — password wajib (dipakai untuk login)
      if (!password) {
        showToast('Password wajib diisi untuk user baru.', 'error');
        btn.disabled = false;
        btn.textContent = 'Simpan';
        return;
      }
      await apiCall('saveUser', [{
        user_id: user_id,
        nama: nama,
        email: email,
        no_wa: no_wa,
        tim: tim,
        role: role,
        password: password,
        status: 'Aktif'
      }]);
      showToast('User ' + nama + ' berhasil ditambahkan!', 'success');
    }

    // Success: close modal and refresh if still on users page
    if (overlay) overlay.classList.remove('show');
    if (APP.currentPage === 'users') {
      var content = document.getElementById('main-content');
      if (content) renderUsers(content);
    }
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

async function toggleUserStatus(idx) {
  var u = _usersData[idx];
  if (!u) return;

  var newStatus = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
  var konfirmasi = confirm('Ubah status ' + u.nama + ' menjadi ' + newStatus + '?');
  if (!konfirmasi) return;

  try {
    await apiCall('toggleUserStatus', [u.user_id]);
    showToast('Status ' + u.nama + ' menjadi ' + newStatus, 'success');
    var content = document.getElementById('main-content');
    if (content) renderUsers(content);
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function deleteUser(idx) {
  var u = _usersData[idx];
  if (!u) return;

  var konfirmasi = confirm('Hapus user ' + u.nama + ' (' + u.email + ')?\n\n⚠️ Tindakan ini tidak bisa dibatalkan!');
  if (!konfirmasi) return;

  try {
    await apiCall('deleteUser', [u.user_id]);
    showToast('User ' + u.nama + ' berhasil dihapus', 'success');
    var content = document.getElementById('main-content');
    if (content) renderUsers(content);
  } catch(e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}
// ════════════════════════════════════════════════════════════
// PAGE: SETTINGS — Konfigurasi Sistem & WA Notification
// ════════════════════════════════════════════════════════════

var _settings = {
  gaUrl: localStorage.getItem('ga_app_url') || '',
  waToken: ''
};

function saveSettings() {
  localStorage.setItem('ga_app_url', _settings.gaUrl);
}

function renderSettings(content) {
  var html = '<div class="page-header"><div class="page-title">Pengaturan</div><div class="page-desc">Konfigurasi sistem & integrasi WhatsApp</div></div>';

  // Koneksi Backend GAS
  html += '<div class="section-card">';
  html += '<div class="section-title">&#x1F4E1; Koneksi Backend (Google Apps Script)</div>';
  html += '<div class="login-form-group">';
  html += '<label class="login-label">URL Web App GAS</label>';
  html += '<input type="text" class="login-input" id="setting-ga-url" value="' + escapeHtml(_settings.gaUrl) + '" placeholder="https://script.google.com/macros/s/XXXX/exec">';
  html += '<div style="color:#475569;font-size:0.72rem;margin-top:6px">Deploy project GAS sebagai Web App (akses: Siapa saja) lalu salin URL-nya ke sini. Disimpan di browser Anda.</div>';
  html += '</div>';
  html += '</div>';

  // WA Token
  html += '<div class="section-card">';
  html += '<div class="section-title">&#x1F4AC; WhatsApp Integration (Fonnte)</div>';
  html += '<div class="login-form-group">';
  html += '<label class="login-label">Fonnte API Token</label>';
  html += '<input type="password" class="login-input" id="setting-wa-token" value="' + escapeHtml(_settings.waToken) + '" placeholder="Masukkan token Fonnte Anda...">';
  html += '<div style="color:#475569;font-size:0.72rem;margin-top:6px">Dapatkan token dari <a href="https://fonnte.com" target="_blank" style="color:#a5b4fc">fonnte.com</a> &mdash; disimpan aman di server (PropertiesService)</div>';
  html += '</div>';
  html += '<button class="login-btn login-btn-primary" id="btn-test-wa" onclick="testWAConnection()" style="margin-top:4px">&#x1F50C; Test Koneksi WA</button>';
  html += '<div id="wa-test-result" style="margin-top:10px;font-size:0.82rem;color:#64748b"></div>';
  html += '</div>';

  // Send Test Message
  html += '<div class="section-card">';
  html += '<div class="section-title">&#x2709; Kirim Pesan Test</div>';
  html += '<div class="login-form-group">';
  html += '<label class="login-label">Nomor WA Tujuan</label>';
  html += '<input type="text" class="login-input" id="setting-test-phone" placeholder="6281234567890">';
  html += '</div>';
  html += '<div class="login-form-group">';
  html += '<label class="login-label">Pesan</label>';
  html += '<textarea class="login-input" id="setting-test-message" rows="3" placeholder="Isi pesan..." style="resize:vertical;font-family:var(--font)">Test pesan dari GA Operations</textarea>';
  html += '</div>';
  html += '<button class="login-btn login-btn-primary" id="btn-send-test" onclick="sendTestWA()">&#x1F4E8; Kirim Test</button>';
  html += '<div id="wa-send-result" style="margin-top:10px;font-size:0.82rem;color:#64748b"></div>';
  html += '</div>';

  // Info
  html += '<div class="section-card">';
  html += '<div class="section-title">&#x2139; Informasi</div>';
  html += '<div style="color:#94a3b8;font-size:0.82rem;line-height:1.7">';
  html += '<p><strong>Webhook URL untuk Fonnte (pesan masuk → tiket komplain):</strong></p>';
  html += '<code style="display:block;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;margin:8px 0;font-size:0.78rem;word-break:break-all;color:#a5b4fc">' + escapeHtml(getGasUrl()) + '</code>';
  html += '<p style="margin-top:12px">Konfigurasi webhook ini di dashboard Fonnte agar pesan masuk otomatis menjadi tiket komplain.</p>';
  html += '<p style="margin-top:8px">&#x1F517; <a href="https://fonnte.com" target="_blank" style="color:#a5b4fc">Buka Fonnte Dashboard</a></p>';
  html += '</div>';
  html += '</div>';

  // Save button
  html += '<button class="login-btn login-btn-primary" onclick="saveSettingsForm()" style="margin-bottom:24px">&#x1F4BE; Simpan Pengaturan</button>';

  content.innerHTML = html;

  // Muat token WA dari server
  apiCall('getSettings', [])
    .then(function(s) {
      _settings.waToken = (s && s.WA_API_TOKEN) ? s.WA_API_TOKEN : '';
      var el = document.getElementById('setting-wa-token');
      if (el) el.value = _settings.waToken;
    })
    .catch(function() { /* token opsional */ });
}

function saveSettingsForm() {
  _settings.gaUrl = document.getElementById('setting-ga-url').value.trim();
  saveSettings();
  var token = document.getElementById('setting-wa-token').value.trim();
  apiCall('saveSettings', [{ WA_API_TOKEN: token }])
    .then(function() { showToast('Pengaturan berhasil disimpan!', 'success'); })
    .catch(function(e) { showToast('Gagal simpan pengaturan: ' + e.message, 'error'); });
}

async function testWAConnection() {
  var btn = document.getElementById('btn-test-wa');
  var resultEl = document.getElementById('wa-test-result');

  var token = document.getElementById('setting-wa-token').value.trim();
  if (!token) {
    resultEl.innerHTML = '❌ Token WA belum diisi.';
    resultEl.style.color = '#f87171';
    return;
  }
  try { await apiCall('saveSettings', [{ WA_API_TOKEN: token }]); } catch(e) { /* lanjut */ }

  btn.disabled = true;
  btn.textContent = '⏳ Testing...';
  resultEl.innerHTML = '⏳ Menguji koneksi...';
  resultEl.style.color = '#94a3b8';

  try {
    var phone = document.getElementById('setting-test-phone').value.trim();
    var data = await apiCall('testWhatsAppConnection', [phone || null]);
    resultEl.innerHTML = '✅ ' + (data.message || 'Koneksi WA berhasil!');
    resultEl.style.color = '#34d399';
    showToast('Koneksi WA berhasil!', 'success');
  } catch (e) {
    resultEl.innerHTML = '❌ ' + e.message;
    resultEl.style.color = '#f87171';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔌 Test Koneksi WA';
  }
}

async function sendTestWA() {
  var btn = document.getElementById('btn-send-test');
  var resultEl = document.getElementById('wa-send-result');
  var phone = document.getElementById('setting-test-phone').value.trim();
  var message = document.getElementById('setting-test-message').value.trim();

  if (!phone || !message) {
    resultEl.innerHTML = '❌ Nomor WA dan pesan wajib diisi.';
    resultEl.style.color = '#f87171';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Mengirim...';
  resultEl.innerHTML = '⏳ Mengirim pesan...';
  resultEl.style.color = '#94a3b8';

  try {
    await apiCall('sendWaMessage', [phone, message]);
    resultEl.innerHTML = '✅ Pesan berhasil dikirim!';
    resultEl.style.color = '#34d399';
    showToast('Pesan WA berhasil dikirim!', 'success');
  } catch (e) {
    resultEl.innerHTML = '❌ ' + e.message;
    resultEl.style.color = '#f87171';
  } finally {
    btn.disabled = false;
    btn.textContent = '📨 Kirim Test';
  }
}

// ════════════════════════════════════════════════════════════
// PAGE: MASTER SLA — Target SLA Berdasarkan Kategori & Urgensi
// ════════════════════════════════════════════════════════════
var _slaData = [];

