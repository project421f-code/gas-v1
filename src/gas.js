// ════════════════════════════════════════════════════════════
// src/gas.js — Client Backend Google Apps Script + Spreadsheet
// GA Operations Management System v2.0
// ════════════════════════════════════════════════════════════
// PENGGAANTI TOTAL src/supabase.js — TANPA Supabase.
//
// Backend: Google Apps Script Web App (doPost → executeAction)
// Database: Google Spreadsheet (via DB_Layer.gs)
// Hosting frontend: GitHub Pages (file statis, tidak perlu server)
//
// CARA SETUP (sekali):
// 1. Deploy GAS sebagai Web App ("Anyone" / Siapa saja)
// 2. Salin URL Web App → tempel di menu Pengaturan → "URL Web App GAS"
//    (disimpan di localStorage key 'ga_app_url')
// ════════════════════════════════════════════════════════════

// ─── GLOBAL APP STATE ───────────────────────────────────────
var APP = { user: null, token: '', currentPage: 'dashboard', charts: {}, surveyTab: 'garating', darkMode: false };

// URL Web App GAS — fallback default (dapat ditimpa via Settings)
var GAS_APP_URL = '';

/**
 * Ambil URL Web App GAS yang aktif (dari localStorage, atau default)
 */
function getGasUrl() {
  var url = localStorage.getItem('ga_app_url') || GAS_APP_URL;
  return String(url || '').replace(/\/+$/, '');
}

function gasConfigured() {
  return !!getGasUrl();
}

// ─── API CALL ───────────────────────────────────────────────
/**
 * Panggil action GAS (via doPost → executeAction).
 * @param {string} actionName - nama fungsi GAS (contoh: 'getAllComplaints')
 * @param {Array}  args       - array argumen fungsi
 * @return {Promise} resolve(data) | reject(Error)
 */
function apiCall(actionName, args) {
  return new Promise(function(resolve, reject) {
    if (!gasConfigured()) {
      reject(new Error('URL Web App GAS belum diatur. Buka menu Pengaturan untuk mengisinya.'));
      return;
    }
    var email = (APP && APP.user) ? (APP.user.email || '') : '';
    var token = (APP && APP.token) ? APP.token : '';
    fetch(getGasUrl(), {
      method: 'POST',
      // text/plain menghindari CORS preflight — doPost tetap bisa baca body JSON
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ email: email, sessionToken: token, actionName: actionName, args: args || [] })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(res) {
      if (!res) { reject(new Error('Tidak ada respon dari server.')); return; }
      if (res.sessionExpired) {
        clearSession();
        // Saat logout sengaja, jangan tampilkan toast 'Sesi berakhir'
        if (actionName !== 'logoutUser') showSessionExpired();
        reject(new Error(res.error || 'Sesi telah berakhir. Silakan login ulang.'));
        return;
      }
      if (res.success) {
        resolve(res.data);
      } else {
        reject(new Error(res.error || 'Terjadi kesalahan pada server.'));
      }
    })
    .catch(function(err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('load failed') !== -1) {
        msg = 'Gagal terhubung ke server. Periksa koneksi internet atau URL Web App GAS.';
      }
      reject(new Error(msg));
    });
  });
}

// ─── SESSION MANAGEMENT ─────────────────────────────────────
function saveSession(user, token) {
  APP.user = user;
  APP.token = token;
  try {
    localStorage.setItem('ga_session_user', JSON.stringify(user));
    localStorage.setItem('ga_session_token', token);
  } catch (e) { /* storage penuh / private mode */ }
}

function loadSession() {
  try {
    var u = localStorage.getItem('ga_session_user');
    var t = localStorage.getItem('ga_session_token');
    if (u && t) {
      APP.user = JSON.parse(u);
      APP.token = t;
      return true;
    }
  } catch (e) { /* data korup */ }
  return false;
}

function clearSession() {
  APP.user = null;
  APP.token = '';
  try {
    localStorage.removeItem('ga_session_user');
    localStorage.removeItem('ga_session_token');
  } catch (e) { /* ignore */ }
}

function showSessionExpired() {
  var layout = document.getElementById('app-layout');
  if (layout) layout.classList.remove('show');
  if (typeof hideLoading === 'function') hideLoading();
  if (typeof showLoginScreen === 'function') showLoginScreen();
  if (typeof showToast === 'function') showToast('Sesi berakhir. Silakan login ulang.', 'warning');
}

/**
 * Pulihkan sesi saat halaman dimuat ulang.
 * Validasi token ke server via getMyProfile.
 * @param {Function} cb - cb(true) jika sesi valid, cb(false) jika tidak
 */
function restoreSession(cb) {
  cb = cb || function() {};
  if (!gasConfigured()) { cb(false); return; }
  if (!loadSession()) { cb(false); return; }
  apiCall('getMyProfile', [])
    .then(function(profile) {
      if (profile && profile.status === 'Aktif') {
        APP.user = profile;
        saveSession(profile, APP.token);
        cb(true);
      } else {
        clearSession();
        cb(false);
      }
    })
    .catch(function() {
      clearSession();
      cb(false);
    });
}


