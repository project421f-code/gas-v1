function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    var d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch(e) { return ts; }
}

// ════════════════════════════════════════════════════════════
// UTILITY & UI FUNCTIONS (ported from legacy version)
// ════════════════════════════════════════════════════════════

// ── Dark Mode ──
function toggleDarkMode() {
  APP.darkMode = !APP.darkMode;
  if (APP.darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ga_darkmode', 'true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ga_darkmode', '');
  }
}

// ── Clock ──
var _clockInterval = null;
function startClock() {
  _updateClock();
  if (_clockInterval) clearInterval(_clockInterval);
  _clockInterval = setInterval(_updateClock, 60000);
}
function _updateClock() {
  var now = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  var el = document.getElementById('topbar-time');
  if (el) el.textContent = now.toLocaleDateString('id-ID', options);
}

// ── Sidebar Toggle ──
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ── Button Loading State ──
function setBtnLoading(id, loading, labelSave) {
  var btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '\u23F3 Memproses...' : (labelSave || '\uD83D\uDCBE Simpan');
}

// ── Get URL Parameters ──
function getUrlParams() {
  var params = {};
  var query = window.location.search.substring(1);
  if (!query) return params;
  query.split('&').forEach(function(pair) {
    var parts = pair.split('=');
    if (parts.length === 2) {
      params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    }
  });
  return params;
}

// ── Format Local Datetime ──
function formatLocalDatetime(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var h = String(date.getHours()).padStart(2, '0');
  var min = String(date.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + d + 'T' + h + ':' + min;
}

// ── Badge CSS Class Helper ──
function badgeClass(status) {
  var map = {
    'Open': 'badge-amber',
    'In Progress': 'badge-blue',
    'Selesai': 'badge-green',
    'Closed': 'badge-green',
    'Achieved': 'badge-green',
    'Breached': 'badge-red',
    'Low': 'badge-green',
    'Medium': 'badge-amber',
    'High': 'badge-red',
    'Approved (Auto)': 'badge-green',
    'Rejected (Bentrok)': 'badge-red',
    'Completed': 'badge-blue',
    'Cancelled': 'badge-gray',
    'Pending': 'badge-amber',
    'Pass': 'badge-green',
    'Fail': 'badge-red',
    'Aktif': 'badge-green',
    'Nonaktif': 'badge-gray',
    'Tersedia': 'badge-green',
    'Terisi': 'badge-red',
    'Ya': 'badge-green',
    'Tidak': 'badge-red'
  };
  return map[status] || 'badge-gray';
}

// ── Mobile Table Labels Injection ──
function injectMobileTableLabels() {
  document.querySelectorAll('.table-wrap table:not(.labels-injected)').forEach(function(table) {
    var headers = [];
    table.querySelectorAll('thead th').forEach(function(th) {
      headers.push(th.textContent.trim());
    });
    if (headers.length === 0) {
      table.classList.add('labels-injected');
      return;
    }
    table.querySelectorAll('tbody tr').forEach(function(row) {
      row.querySelectorAll('td').forEach(function(td, i) {
        if (headers[i]) td.setAttribute('data-label', headers[i]);
      });
    });
    table.classList.add('labels-injected');
  });
}

// ── Toggle Kerusakan (Checklist) ──
function toggleKerusakan(selectId, wrapId) {
  selectId = selectId || 'f-cl-kondisi';
  wrapId = wrapId || 'f-cl-kerusakan-wrap';
  var v = document.getElementById(selectId);
  var w = document.getElementById(wrapId);
  if (v && w) {
    w.style.display = v.value === 'Ada Kerusakan' ? 'block' : 'none';
  }
}

// ── Send Link to WhatsApp ──
function sendLinkToWA(phoneId, resultId, btnId) {
  phoneId = phoneId || 'f-link-wa';
  resultId = resultId || 'link-result';
  btnId = btnId || 'btn-send-link';

  var phone = document.getElementById(phoneId).value.trim();
  var resultDiv = document.getElementById(resultId);
  var btn = document.getElementById(btnId);
  if (!phone) {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.style.background = 'rgba(239,68,68,0.15)';
      resultDiv.style.color = '#fca5a5';
      resultDiv.textContent = '\u274C Masukkan nomor WhatsApp.';
    }
    return;
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '\u23F3 Mengirim...'; }

  var waUrl = 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Halo, silakan cek ketersediaan aset GA melalui link berikut: ' + window.location.origin + '/public');
  window.open(waUrl, '_blank');

  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.style.background = 'rgba(16,185,129,0.15)';
    resultDiv.style.color = '#6ee7b7';
    resultDiv.innerHTML = '\u2705 Link berhasil dikirim!<br><small style="color:#94a3b8">WA terbuka di tab baru</small>';
  }
  if (btn) {
    btn.innerHTML = '\u2705 Terkirim!';
    setTimeout(function() { btn.disabled = false; btn.innerHTML = '\uD83D\uDCE4 Kirim Link'; }, 3000);
  }
}

// ── Note: showComplaintDetail digantikan oleh showMntDetail(idx) yang sudah ada

// ════════════════════════════════════════════════════════════
// PAGE: USERS — Manajemen User (user_list)
// ════════════════════════════════════════════════════════════
var _usersData = [];
var _editingUserId = null;

var _userIdCounter = 0;

