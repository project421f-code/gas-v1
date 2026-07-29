// ════════════════════════════════════════════════════════════
// SKELETON LOADING HELPERS
// ════════════════════════════════════════════════════════════

function renderSkeleton(type) {
  var types = {
    dashboard: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px">' +
      '<div class="skeleton skeleton-stat"></div>'.repeat(5) +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:24px">' +
      '<div class="skeleton skeleton-card"></div>'.repeat(3) +
      '</div>' +
      '<div class="skeleton skeleton-card" style="height:200px"></div>',
    list: '<div class="table-wrap">' +
      '<div class="skeleton skeleton-table-row"></div>'.repeat(5) +
      '</div>',
    cards: '<div style="display:grid;gap:8px">' +
      '<div class="skeleton skeleton-card" style="height:60px"></div>'.repeat(4) +
      '</div>',
    stats: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px">' +
      '<div class="skeleton skeleton-stat"></div>'.repeat(4) +
      '</div>',
    table: '<div class="skeleton skeleton-table-row"></div>'.repeat(6),
    form: '<div style="display:grid;gap:16px">' +
      '<div class="skeleton skeleton-h2" style="width:30%"></div>' +
      '<div class="skeleton skeleton-text"></div>'.repeat(3) +
      '<div class="skeleton skeleton-button"></div>' +
      '</div>'
  };
  return types[type] || types.cards;
}

function hideLoading() {
  var ls = document.getElementById('loading-screen');
  if (ls) ls.classList.add('hidden');
}

function showLoginScreen() {
  var ls = document.getElementById('login-screen');
  if (ls) ls.classList.add('show');
  hideLoginError();
}

function hideLoginScreen() {
  var ls = document.getElementById('login-screen');
  if (ls) ls.classList.remove('show');
}

function showLoginError(msg) {
  var el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideLoginError() {
  var el = document.getElementById('login-error');
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

// ════════════════════════════════════════════════════════════
// MODAL HELPERS
// ════════════════════════════════════════════════════════════
function showModal(title, fields) {
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl = document.getElementById('modal-body');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = fields.map(function(f) {
    var val = f.value !== undefined && f.value !== null && f.value !== '' ? f.value : '-';
    return '<div class="modal-field">' +
      '<div class="modal-field-label">' + escapeHtml(f.label) + '</div>' +
      '<div class="modal-field-value' + (f.highlight ? ' highlight' : '') + '">' + val + '</div>' +
      '</div>';
  }).join('');
  overlay.classList.add('show');
}

function hideModal() {
  var overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function showFormModal(title, fields, saveFn) {
  var overlay = document.getElementById('modal-form-overlay');
  var titleEl = document.getElementById('modal-form-title');
  var bodyEl = document.getElementById('modal-form-body');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = fields.map(function(f) {
    var inputHtml = '';
    if (f.type === 'select') {
      inputHtml = '<select class="login-input" id="' + f.id + '" style="cursor:pointer">';
      (f.options || []).forEach(function(o) {
        inputHtml += '<option value="' + o + '"' + (o === f.value ? ' selected' : '') + '>' + o + '</option>';
      });
      inputHtml += '</select>';
    } else {
      inputHtml = '<input type="' + (f.type || 'text') + '" class="login-input" id="' + f.id + '" value="' + escapeHtml(f.value || '') + '" placeholder="' + escapeHtml(f.placeholder || '') + '">';
    }
    return '<div class="login-form-group"><label class="login-label">' + escapeHtml(f.label) + '</label>' + inputHtml + '</div>';
  }).join('');
  bodyEl.innerHTML += '<div style="display:flex;gap:8px;margin-top:16px"><button class="login-btn login-btn-primary" id="btn-form-save" style="flex:1" onclick="' + saveFn + '">&#x1F4BE; Simpan</button><button class="login-btn" style="flex:1;background:rgba(255,255,255,0.06);color:#94a3b8" onclick="hideFormModal()">Batal</button></div>';
  overlay.classList.add('show');
}

function hideFormModal() {
  var overlay = document.getElementById('modal-form-overlay');
  if (overlay) overlay.classList.remove('show');
}

function showToast(msg, type) {
  type = type || 'success';
  var c = document.getElementById('toast-container');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function() {
    t.style.transition = 'all 0.4s ease';
    requestAnimationFrame(function() { t.style.opacity = '0'; t.style.transform = 'translateX(50px)'; });
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 500);
  }, 3000);
}

