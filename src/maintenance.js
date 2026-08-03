async function loadKPISecData() {
  var tbody = document.getElementById('tbody-kpisec');
  if (!tbody) return;
  try {
    var data = await apiCall('getSecurityKPI', []);
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#475569">Belum ada data KPI. Klik \"Kalkulasi Ulang\".</td></tr>';
      return;
    }
    var html = '';
    data.forEach(function(d) {
      var perfColor = d.skor_performa === 'Baik' ? '#34d399' : (d.skor_performa === 'Cukup' ? '#fb923c' : '#f87171');
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">';
      html += '<td style="padding:8px"><strong>' + escapeHtml(d.nama_anggota) + '</strong></td>';
      html += '<td style="padding:8px;color:#64748b">' + escapeHtml(d.shift_dominan || '-') + '</td>';
      html += '<td style="padding:8px;color:#a5b4fc;font-weight:600">' + d.persen_kepatuhan_patroli + '%</td>';
      html += '<td style="padding:8px">' + (d.inspeksi_selesai || 0) + '</td>';
      html += '<td style="padding:8px;color:' + (d.insiden_keamanan > 0 ? '#f87171' : '#34d399') + '">' + (d.insiden_keamanan || 0) + '</td>';
      html += '<td style="padding:8px"><span style="background:' + perfColor + '20;color:' + perfColor + ';padding:2px 8px;border-radius:6px;font-size:0.7rem;font-weight:600">' + escapeHtml(d.skor_performa || '-') + '</span></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  } catch(e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#f87171">Gagal: ' + e.message + '</td></tr>';
  }
}

async function recalcKPISec() {
  var btn = document.querySelector('[onclick="recalcKPISec()"]');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menghitung...'; }
  try {
    // Kalkulasi + simpan KPI Security dilakukan di backend GAS
    await apiCall('calculateSecurityKPI', []);
    showToast('KPI Security berhasil dikalkulasi!', 'success');
    if (APP.currentPage === 'patrol' && _patrolTab === 'kpisec') renderPatrol(document.getElementById('main-content'));
  } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDD04 Kalkulasi Ulang KPI'; } }
}

var _mntData = [];
var _mntFilter = 'All';
var _mntTab = 'tickets';

function switchTab(tab) {
  _mntTab = tab;
  if (APP.currentPage === 'maintenance') {
    var content = document.getElementById('main-content');
    if (content) renderMaintenance(content);
  }
}

function renderTabButtons() {
  var tabs = [
    { key: 'tickets', label: '&#x1F4CB; Tiket' },
    { key: 'kpi', label: '&#x1F4CA; KPI' }
  ];
  var html = '<div style="display:flex;gap:6px;margin-bottom:14px">';
  tabs.forEach(function(t) {
    var active = t.key === _mntTab;
    html += '<button onclick="switchTab(\'' + t.key + '\')" style="' +
      'background:' + (active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)') + ';' +
      'color:' + (active ? '#a5b4fc' : '#94a3b8') + ';' +
      'border:1px solid ' + (active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)') + ';' +
      'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '600' : '500') + '">' +
      t.label + '</button>';
  });
  html += '</div>';
  return html;
}

async function recalcKPIMnt() {
  var btn = document.querySelector('[onclick="recalcKPIMnt()"]');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menghitung...'; }

  try {
    // Kalkulasi + simpan KPI Maintenance dilakukan di backend GAS
    await apiCall('calculateMaintenanceKPI', []);
    showToast('KPI Maintenance berhasil dikalkulasi ulang!', 'success');
    if (APP.currentPage === 'maintenance') {
      var content = document.getElementById('main-content');
      if (content) renderMaintenance(content);
    }
  } catch(e) {
    showToast('Gagal kalkulasi: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDD04 Kalkulasi Ulang'; }
  }
}

function showMntDetail(idx) {
  var m = _mntData[idx];
  if (!m) return;
  showModal('Tiket ' + m.tiket_id, [
    {label: 'Tiket ID', value: m.tiket_id, highlight: true},
    {label: 'Pelapor', value: m.nama_customer},
    {label: 'No. WA', value: m.no_wa},
    {label: 'Lokasi', value: m.lokasi},
    {label: 'Kategori', value: m.kategori},
    {label: 'Sub Kategori', value: m.sub_kategori},
    {label: 'Urgensi', value: m.urgensi, highlight: m.urgensi === 'High'},
    {label: 'Deskripsi', value: m.deskripsi},
    {label: 'Status', value: m.status, highlight: true},
    {label: 'Teknisi', value: m.teknisi || '-'},
    {label: 'Catatan', value: m.catatan},
    {label: 'Target SLA', value: m.target_sla_jam ? m.target_sla_jam + ' jam' : '-'},
    {label: 'Status SLA', value: m.status_sla || '-'},
    {label: 'Rating', value: m.rating_survei ? m.rating_survei + '/5' : '-'}
  ]);
}

function filterMnt(status) {
  _mntFilter = status;
  if (APP.currentPage === 'maintenance') {
    var content = document.getElementById('main-content');
    if (content) renderMaintenance(content);
  }
}

async function renderMaintenance(content) {
  content.innerHTML = renderSkeleton('cards');

  // Always show header + tabs
  var html = '<div class="page-header"><div class="page-title">Maintenance</div><div class="page-desc">Tiket perbaikan & pemeliharaan</div></div>';
  html += renderTabButtons();

  try {
    if (_mntTab === 'kpi') {
      // KPI tab: render KPI body
      html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
      html += '<button onclick="recalcKPIMnt()" style="background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">&#x1F504; Kalkulasi Ulang</button>';
      html += '</div>';

      var kpiData = await apiCall('getMaintenanceKPI', []);

      html += '<div class="section-card">';
      if (kpiData.length === 0) {
        html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data KPI. Klik "Kalkulasi Ulang" untuk menghitung performa staff.</div>';
      } else {
        kpiData.forEach(function(d) {
          var perfColor = d.skor_performa === 'Perlu Perbaikan' || d.persen_sla < 50 ? '#f87171' : (d.skor_performa === 'Cukup' || d.persen_sla < 80 ? '#fb923c' : '#34d399');
          var perfLabel = d.skor_performa || (d.persen_sla < 50 ? 'Perlu Perbaikan' : (d.persen_sla < 80 ? 'Cukup' : 'Baik'));

          html += '<div class="activity-item">';
          html += '<div class="activity-dot" style="background:' + perfColor + '"></div>';
          html += '<div class="activity-text">';
          html += '<strong>' + escapeHtml(d.nama_staff) + '</strong>';
          html += ' <span style="background:' + perfColor + '20;color:' + perfColor + ';padding:1px 8px;border-radius:8px;font-size:0.65rem;font-weight:600">' + escapeHtml(perfLabel) + '</span>';
          html += '<br><span style="color:#64748b">Total: ' + d.total_tiket + ' tiket</span>';
          html += ' <span style="color:#34d399">Selesai: ' + d.tiket_selesai + '</span>';
          html += ' <span style="color:#a5b4fc">SLA: ' + d.persen_sla + '%</span>';
          html += ' <span style="color:#fbbf24">Rating: &#11088; ' + d.rata_rata_rating + '</span>';
          html += '</div>';
          html += '<div class="activity-time" style="color:' + perfColor + ';font-weight:600">' + escapeHtml(perfLabel) + '</div>';
          html += '</div>';
        });
      }
      html += '</div>';
      content.innerHTML = html;
      return;
    }

    // Tickets tab
    var filters = _mntFilter !== 'All' ? { status: _mntFilter } : null;
    var data = await apiCall('getAllComplaints', [filters]);
    _mntData = data;

    // Stats dari TOTAL data (unfiltered)
    var allData = await apiCall('getAllComplaints', []);
    var total = allData.length;
    var open = allData.filter(function(m) { return m.status === 'Open'; }).length;
    var inProgress = allData.filter(function(m) { return m.status === 'In Progress'; }).length;
    var selesai = allData.filter(function(m) { return m.status === 'Selesai' || m.status === 'Closed'; }).length;
    var highUrgency = allData.filter(function(m) { return m.urgensi === 'High'; }).length;

    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total Tiket</div><div class="stat-value blue">' + total + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Open</div><div class="stat-value red">' + open + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">In Progress</div><div class="stat-value orange">' + inProgress + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Selesai</div><div class="stat-value green">' + selesai + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Urgent (High)</div><div class="stat-value ' + (highUrgency > 0 ? 'red' : 'green') + '">' + highUrgency + '</div></div>';
    html += '</div>';

    // Filter buttons
    var filters = ['All', 'Open', 'In Progress', 'Selesai'];
    html += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
    filters.forEach(function(f) {
      var active = f === _mntFilter;
      html += '<button onclick="filterMnt(\'' + f + '\')" style="' +
        'background:' + (active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)') + ';' +
        'color:' + (active ? '#a5b4fc' : '#94a3b8') + ';' +
        'border:1px solid ' + (active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)') + ';' +
        'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '600' : '500') + '">' + f + '</button>';
    });
    html += '<button onclick="showComplaintForm()" style="' +
      'background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;' +
      'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">+ Tiket Baru</button>';
    html += '<button onclick="exportTicketsCSV()" style="' +
      'background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3);' +
      'padding:6px 12px;border-radius:10px;cursor:pointer;font-size:0.72rem;font-weight:600">&#x1F4E5; Export CSV</button>';
    html += '</div>';

    html += '<div class="section-card">';
    if (data.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada tiket maintenance' + (_mntFilter !== 'All' ? ' dengan status ' + _mntFilter : '') + '</div>';
    } else {
      data.forEach(function(m, idx) {
        var statusColor = '#34d399';
        if (m.status === 'Open') statusColor = '#f87171';
        else if (m.status === 'In Progress') statusColor = '#fb923c';
        else if (m.status === 'Selesai' || m.status === 'Closed') statusColor = '#34d399';

        var urgensiBadge = '';
        if (m.urgensi === 'High') urgensiBadge = ' <span style="background:rgba(239,68,68,0.2);color:#fca5a5;padding:1px 8px;border-radius:8px;font-size:0.65rem">HIGH</span>';
        else if (m.urgensi === 'Medium') urgensiBadge = ' <span style="background:rgba(251,191,36,0.15);color:#fcd34d;padding:1px 8px;border-radius:8px;font-size:0.65rem">MED</span>';

        html += '<div class="activity-item">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong onclick="showMntDetail(' + idx + ')" style="cursor:pointer">' + escapeHtml(m.tiket_id) + '</strong>' + urgensiBadge;
        html += '<br><span style="color:#e0e7ff">' + escapeHtml(m.nama_customer || '-') + '</span>';
        html += ' <span style="color:#64748b">| ' + escapeHtml(m.kategori || '-') + ' | ' + escapeHtml(m.lokasi || '-') + '</span>';
        if (m.teknisi) html += '<br><span style="color:#475569">Teknisi: ' + escapeHtml(m.teknisi) + '</span>';
        html += '</div>';
        html += '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">';
        html += '<button onclick="sendTicketWA(\'' + m.tiket_id + '\')" style="background:rgba(16,185,129,0.12);color:#6ee7b7;border:none;padding:4px 6px;border-radius:6px;cursor:pointer;font-size:0.65rem" title="Kirim WA">&#x1F4E8;</button>';
        if (m.status !== 'Selesai') {
          html += '<button onclick="showComplaintForm(' + idx + ')" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:none;padding:4px 8px;border-radius:8px;cursor:pointer;font-size:0.7rem">Edit</button>';
          html += '<button onclick="showUpdateStatusForm(' + idx + ')" style="background:rgba(251,191,36,0.15);color:#fcd34d;border:none;padding:4px 8px;border-radius:8px;cursor:pointer;font-size:0.7rem">Update</button>';
        } else {
          html += '<button onclick="showComplaintForm(' + idx + ')" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:none;padding:4px 8px;border-radius:8px;cursor:pointer;font-size:0.7rem">Detail</button>';
        }
        html += '<button onclick="showDeleteTicketConfirm(\'' + m.tiket_id + '\')" style="background:rgba(239,68,68,0.12);color:#fca5a5;border:none;padding:4px 6px;border-radius:6px;cursor:pointer;font-size:0.65rem" title="Hapus">&#x1F5D1;</button>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(m.status) + '</div>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Maintenance</div><div class="page-desc">Tiket perbaikan & pemeliharaan</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Form Tambah / Edit
// ════════════════════════════════════════════════════════════
function showComplaintForm(idx) {
  var isEdit = idx !== undefined && idx >= 0 && _mntData[idx];
  var data = isEdit ? _mntData[idx] : null;
  var overlay = document.getElementById('modal-complaint-overlay');
  if (!overlay) return;

  document.getElementById('complaint-form').reset();
  document.getElementById('complaint-form-title').textContent = isEdit ? 'Edit Tiket ' + data.tiket_id : '+ Tiket Komplain Baru';
  document.getElementById('cf-tiket-id').value = isEdit ? data.tiket_id : '';
  document.getElementById('cf-nama').value = isEdit ? data.nama_customer : '';
  document.getElementById('cf-wa').value = isEdit ? (data.no_wa || '') : '';
  document.getElementById('cf-lokasi').value = isEdit ? (data.lokasi || '') : '';
  document.getElementById('cf-kategori').value = isEdit ? (data.kategori || '') : '';
  document.getElementById('cf-urgensi').value = isEdit ? (data.urgensi || '') : '';
  document.getElementById('cf-deskripsi').value = isEdit ? (data.deskripsi || '') : '';
  document.getElementById('cf-foto').value = isEdit ? (data.foto_kerusakan || '') : '';
  document.getElementById('foto-preview-complaint').style.display = 'none';
  document.getElementById('complaint-error').style.display = 'none';
  // Stop camera if active
  stopCameraComplaint();

  // Load sub-kategori AFTER setting kategori (loadSubKategori replaces innerHTML)
  if (document.getElementById('cf-kategori').value) {
    loadSubKategori();
    document.getElementById('cf-subkat').value = isEdit ? (data.sub_kategori || '') : '';
  } else {
    document.getElementById('cf-subkat').value = isEdit ? (data.sub_kategori || '') : '';
  }
  overlay.classList.add('show');
}

function loadSubKategori() {
  var kategori = document.getElementById('cf-kategori').value;
  var subSelect = document.getElementById('cf-subkat');
  var map = {
    'Plumbing': ['Pipa Bocor', 'Keran Rusak', 'Toilet Mampet', 'Lainnya'],
    'Electrical': ['Lampu Mati', 'Stopkontak Rusak', 'Korsleting', 'Lainnya'],
    'AC/HVAC': ['AC Tidak Dingin', 'AC Bocor', 'Remote Rusak', 'Lainnya'],
    'Furniture': ['Meja Rusak', 'Kursi Rusak', 'Lemari Rusak', 'Lainnya'],
    'IT/Network': ['WiFi Error', 'Komputer Rusak', 'Printer Error', 'Lainnya'],
    'Lainnya': ['-']
  };
  var sub = map[kategori] || ['-'];
  subSelect.innerHTML = '<option value="">- Pilih -</option>' + sub.map(function(s) {
    return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
  }).join('');
}

async function saveComplaintForm() {
  var overlay = document.getElementById('modal-complaint-overlay');
  var btn = document.getElementById('btn-save-complaint');
  var errorEl = document.getElementById('complaint-error');

  var tiketId = document.getElementById('cf-tiket-id').value;
  var nama = document.getElementById('cf-nama').value.trim();
  var wa = document.getElementById('cf-wa').value.trim();
  var lokasi = document.getElementById('cf-lokasi').value.trim();
  var kategori = document.getElementById('cf-kategori').value;
  var subkat = document.getElementById('cf-subkat').value;
  var urgensi = document.getElementById('cf-urgensi').value;
  var deskripsi = document.getElementById('cf-deskripsi').value.trim();
  var foto = document.getElementById('cf-foto').value.trim();

  if (!nama || !lokasi || !kategori || !urgensi) {
    errorEl.textContent = 'Nama, Lokasi, Kategori, dan Urgensi wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  btn.disabled = true;
  btn.textContent = '\u23F3 Menyimpan...';

  try {
    if (tiketId) {
      // UPDATE existing — saveComplaint menangani update via tiket_id
      await apiCall('saveComplaint', [{
        tiket_id: tiketId,
        nama_customer: nama,
        no_wa: wa,
        lokasi: lokasi,
        kategori: kategori,
        sub_kategori: subkat,
        urgensi: urgensi,
        deskripsi: deskripsi,
        foto_kerusakan: foto
      }]);
      showToast('Tiket ' + tiketId + ' berhasil diupdate!', 'success');
    } else {
      // INSERT — tiket_id digenerate otomatis di backend (MNT-YYYY-NNNN)
      await apiCall('saveComplaint', [{
        nama_customer: nama,
        no_wa: wa,
        lokasi: lokasi,
        kategori: kategori,
        sub_kategori: subkat,
        urgensi: urgensi,
        deskripsi: deskripsi,
        foto_kerusakan: foto
      }]);
      showToast('Tiket baru berhasil dibuat!', 'success');
    }

    if (overlay) overlay.classList.remove('show');
    if (APP.currentPage === 'maintenance') {
      var content = document.getElementById('main-content');
      if (content) renderMaintenance(content);
    }
  } catch(e) {
    errorEl.textContent = 'Gagal: ' + e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '\uD83D\uDCBE Simpan';
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Update Status / Assign Teknisi
// ════════════════════════════════════════════════════════════
function showUpdateStatusForm(idx) {
  var m = _mntData[idx];
  if (!m) return;
  var overlay = document.getElementById('modal-status-overlay');
  if (!overlay) return;

  var nextStatus = m.status === 'Open' ? 'In Progress' : 'Selesai';
  document.getElementById('status-form-title').textContent = 'Update Status \u2014 ' + m.tiket_id;
  document.getElementById('sf-tiket-id').value = m.tiket_id;
  document.getElementById('sf-new-status').value = nextStatus;
  document.getElementById('sf-teknisi').value = (APP.user && APP.user.nama) || '';
  document.getElementById('sf-catatan').value = '';
  document.getElementById('sf-foto').value = '';
  document.getElementById('foto-preview-status').style.display = 'none';
  document.getElementById('status-error').style.display = 'none';
  // Stop camera if active
  stopCameraStatus();
  overlay.classList.add('show');
}

async function doUpdateStatus() {
  var overlay = document.getElementById('modal-status-overlay');
  var btn = document.getElementById('btn-update-status');
  var errorEl = document.getElementById('status-error');

  var tiketId = document.getElementById('sf-tiket-id').value;
  var newStatus = document.getElementById('sf-new-status').value;
  var teknisi = document.getElementById('sf-teknisi').value.trim();
  var catatan = document.getElementById('sf-catatan').value.trim();
  var foto = document.getElementById('sf-foto').value.trim();

  if (!teknisi) {
    errorEl.textContent = 'Nama teknisi wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  btn.disabled = true;
  btn.textContent = '\u23F3 Mengupdate...';

  try {
    var assignData = { teknisi: teknisi };
    if (catatan) assignData.catatan = catatan;
    if (foto) assignData.foto_perbaikan = foto;
    // updateComplaintStatus juga menghitung durasi, status SLA, & kirim notifikasi WA
    await apiCall('updateComplaintStatus', [tiketId, newStatus, assignData]);

    showToast('Tiket ' + tiketId + ' \u2192 ' + newStatus, 'success');
    if (overlay) overlay.classList.remove('show');
    if (APP.currentPage === 'maintenance') {
      var content = document.getElementById('main-content');
      if (content) renderMaintenance(content);
    }
  } catch(e) {
    errorEl.textContent = 'Gagal: ' + e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '\uD83D\uDCBE Update';
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Camera Functions
// ════════════════════════════════════════════════════════════
var _cameraStreamStatus = null;

// ════════════════════════════════════════════════════════════
// SHARED — Base64 to Blob & Upload to Supabase Storage
// ════════════════════════════════════════════════════════════
async function uploadPhoto(dataUrl, folder) {
  try {
    var fileName = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    // Kirim base64 murni (tanpa prefix data:image/...) → GAS simpan ke Google Drive
    var data = await apiCall('uploadAuditPhoto', [String(dataUrl).split(',')[1] || dataUrl, fileName]);
    if (data && data.url) return data.url;
    console.warn('Upload foto: URL kosong');
    return null;
  } catch(e) {
    console.warn('Upload failed:', e.message);
    return null;
  }
}

function toggleCameraStatus() {
  var container = document.getElementById('camera-container-status');
  var btn = document.getElementById('btn-camera-status');
  if (!container || !btn) return;

  if (_cameraStreamStatus) {
    // Camera is on, stop it
    stopCameraStatus();
    return;
  }

  // Start camera
  container.style.display = 'block';
  btn.innerHTML = '&#x23F3; Memuat kamera...';
  btn.disabled = true;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(function(stream) {
        _cameraStreamStatus = stream;
        var video = document.getElementById('camera-preview-status');
        if (video) {
          video.srcObject = stream;
          video.play();
        }
        btn.innerHTML = '&#x25B6; Kamera Nyala';
        btn.style.background = 'rgba(16,185,129,0.2)';
        btn.style.color = '#6ee7b7';
        btn.style.borderColor = 'rgba(16,185,129,0.4)';
        btn.disabled = false;
      })
      .catch(function(err) {
        container.style.display = 'none';
        btn.innerHTML = '&#x1F4F7; Buka Kamera';
        btn.style.background = 'rgba(99,102,241,0.15)';
        btn.style.color = '#a5b4fc';
        btn.style.borderColor = 'rgba(99,102,241,0.3)';
        btn.disabled = false;
        showToast('Kamera tidak tersedia: ' + err.message, 'error');
      });
  } else {
    container.style.display = 'none';
    btn.innerHTML = '&#x1F4F7; Buka Kamera';
    btn.style.background = 'rgba(99,102,241,0.15)';
    btn.style.color = '#a5b4fc';
    btn.disabled = false;
    showToast('Browser tidak mendukung akses kamera', 'error');
  }
}

async function capturePhotoStatus() {
  var video = document.getElementById('camera-preview-status');
  var canvas = document.getElementById('canvas-status');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to base64 data URL (JPEG, quality 0.7)
  var dataUrl = canvas.toDataURL('image/jpeg', 0.7);

  // Upload to Supabase Storage
  var fotoInput = document.getElementById('sf-foto');
  var previewContainer = document.getElementById('foto-preview-status');
  var previewImg = document.getElementById('foto-img-preview-status');

  // Show preview immediately (from base64)
  if (previewContainer && previewImg) {
    previewImg.src = dataUrl;
    previewContainer.style.display = 'block';
  }

  // Upload to Storage (async)
  var publicUrl = await uploadPhoto(dataUrl, 'status');
  if (publicUrl && fotoInput) {
    fotoInput.value = publicUrl;
    console.log('Foto uploaded:', publicUrl);
  } else if (fotoInput) {
    // Fallback: store base64 directly
    fotoInput.value = dataUrl;
    showToast('Foto disimpan lokal (gagal upload ke Storage)', 'warning');
  }

  // Stop camera after capture
  stopCameraStatus();

  showToast('Foto berhasil diambil!', 'success');
}

function stopCameraStatus() {
  var container = document.getElementById('camera-container-status');
  var btn = document.getElementById('btn-camera-status');

  if (_cameraStreamStatus) {
    _cameraStreamStatus.getTracks().forEach(function(track) { track.stop(); });
    _cameraStreamStatus = null;
  }

  var video = document.getElementById('camera-preview-status');
  if (video) {
    video.srcObject = null;
  }

  if (container) container.style.display = 'none';
  if (btn) {
    btn.innerHTML = '&#x1F4F7; Buka Kamera';
    btn.style.background = 'rgba(99,102,241,0.15)';
    btn.style.color = '#a5b4fc';
    btn.style.borderColor = 'rgba(99,102,241,0.3)';
    btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Camera Functions (Complaint Form)
// ════════════════════════════════════════════════════════════
var _cameraStreamComplaint = null;

function toggleCameraComplaint() {
  var container = document.getElementById('camera-container-complaint');
  var btn = document.getElementById('btn-camera-complaint');
  if (!container || !btn) return;

  if (_cameraStreamComplaint) {
    stopCameraComplaint();
    return;
  }

  container.style.display = 'block';
  btn.innerHTML = '&#x23F3; Memuat kamera...';
  btn.disabled = true;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(function(stream) {
        _cameraStreamComplaint = stream;
        var video = document.getElementById('camera-preview-complaint');
        if (video) {
          video.srcObject = stream;
          video.play();
        }
        btn.innerHTML = '&#x25B6; Kamera Nyala';
        btn.style.background = 'rgba(16,185,129,0.2)';
        btn.style.color = '#6ee7b7';
        btn.style.borderColor = 'rgba(16,185,129,0.4)';
        btn.disabled = false;
      })
      .catch(function(err) {
        container.style.display = 'none';
        btn.innerHTML = '&#x1F4F7; Buka Kamera';
        btn.style.background = 'rgba(99,102,241,0.15)';
        btn.style.color = '#a5b4fc';
        btn.style.borderColor = 'rgba(99,102,241,0.3)';
        btn.disabled = false;
        showToast('Kamera tidak tersedia: ' + err.message, 'error');
      });
  } else {
    container.style.display = 'none';
    btn.innerHTML = '&#x1F4F7; Buka Kamera';
    btn.style.background = 'rgba(99,102,241,0.15)';
    btn.style.color = '#a5b4fc';
    btn.disabled = false;
    showToast('Browser tidak mendukung akses kamera', 'error');
  }
}

async function capturePhotoComplaint() {
  var video = document.getElementById('camera-preview-complaint');
  var canvas = document.getElementById('canvas-complaint');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  var dataUrl = canvas.toDataURL('image/jpeg', 0.7);

  var fotoInput = document.getElementById('cf-foto');
  var previewContainer = document.getElementById('foto-preview-complaint');
  var previewImg = document.getElementById('foto-img-preview-complaint');

  // Show preview immediately
  if (previewContainer && previewImg) {
    previewImg.src = dataUrl;
    previewContainer.style.display = 'block';
  }

  // Upload to Supabase Storage
  var publicUrl = await uploadPhoto(dataUrl, 'complaint');
  if (publicUrl && fotoInput) {
    fotoInput.value = publicUrl;
    console.log('Foto uploaded:', publicUrl);
  } else if (fotoInput) {
    // Fallback: store base64 directly
    fotoInput.value = dataUrl;
    showToast('Foto disimpan lokal (gagal upload ke Storage)', 'warning');
  }

  stopCameraComplaint();
  showToast('Foto berhasil diambil!', 'success');
}

function stopCameraComplaint() {
  var container = document.getElementById('camera-container-complaint');
  var btn = document.getElementById('btn-camera-complaint');

  if (_cameraStreamComplaint) {
    _cameraStreamComplaint.getTracks().forEach(function(track) { track.stop(); });
    _cameraStreamComplaint = null;
  }

  var video = document.getElementById('camera-preview-complaint');
  if (video) {
    video.srcObject = null;
  }

  if (container) container.style.display = 'none';
  if (btn) {
    btn.innerHTML = '&#x1F4F7; Buka Kamera';
    btn.style.background = 'rgba(99,102,241,0.15)';
    btn.style.color = '#a5b4fc';
    btn.style.borderColor = 'rgba(99,102,241,0.3)';
    btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Delete Ticket
// ════════════════════════════════════════════════════════════
function showDeleteTicketConfirm(tiketId) {
  var overlay = document.getElementById('modal-delete-ticket-overlay');
  if (!overlay) return;
  document.getElementById('dt-tiket-id').value = tiketId;
  document.getElementById('dt-tiket-label').textContent = 'Yakin ingin menghapus tiket ' + tiketId + '?';
  document.getElementById('delete-ticket-error').style.display = 'none';
  overlay.classList.add('show');
}

async function confirmDeleteTicket() {
  var tiketId = document.getElementById('dt-tiket-id').value;
  var btn = document.getElementById('btn-confirm-delete-ticket');
  var errorEl = document.getElementById('delete-ticket-error');
  if (!tiketId) return;

  btn.disabled = true;
  btn.textContent = '\u23F3 Menghapus...';

  try {
    await apiCall('deleteComplaint', [tiketId]);

    showToast('Tiket ' + tiketId + ' berhasil dihapus!', 'success');
    document.getElementById('modal-delete-ticket-overlay').classList.remove('show');
    if (APP.currentPage === 'maintenance') {
      var content = document.getElementById('main-content');
      if (content) renderMaintenance(content);
    }
  } catch(e) {
    errorEl.textContent = 'Gagal menghapus: ' + e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '\u2705 Ya, Hapus';
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Send WhatsApp Notification
// ════════════════════════════════════════════════════════════
async function sendTicketWA(tiketId) {
  var overlay = document.getElementById('modal-wa-ticket-overlay');
  if (!overlay) return;

  try {
    // Fetch ticket data dari backend
    var all = await apiCall('getAllComplaints', []);
    var t = (all || []).find(function(x) { return x.tiket_id === tiketId; });
    if (!t) { showToast('Tiket tidak ditemukan', 'error'); return; }
    if (!t.no_wa) { showToast('Nomor WA tidak tersedia', 'error'); return; }

    document.getElementById('wa-tiket-id').value = tiketId;
    document.getElementById('wa-tiket-info').textContent = tiketId + ' — ' + (t.nama_customer || '-') + ' | ' + (t.status || '-');
    document.getElementById('wa-tiket-number').value = t.no_wa;
    document.getElementById('wa-message').value = generateWAMessage(t);
    document.getElementById('wa-error').style.display = 'none';
    overlay.classList.add('show');
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error');
  }
}

function generateWAMessage(t) {
  var msg = 'Halo *' + (t.nama_customer || 'Customer') + '*,\n\n';
  msg += 'Kami informasikan status tiket komplain Anda sebagai berikut:\n\n';
  msg += '📋 *ID Tiket:* ' + t.tiket_id + '\n';
  msg += '📌 *Status:* ' + (t.status || '-') + '\n';
  msg += '🔧 *Kategori:* ' + (t.kategori || '-') + '\n';
  msg += '📍 *Lokasi:* ' + (t.lokasi || '-') + '\n';
  if (t.teknisi) msg += '👨‍🔧 *Teknisi:* ' + t.teknisi + '\n';
  if (t.catatan) msg += '📝 *Catatan:* ' + t.catatan + '\n';
  msg += '\nTerima kasih atas perhatiannya.\n';
  msg += '— *GA Operations Team*';
  return msg;
}

async function doSendWA() {
  var tiketId = document.getElementById('wa-tiket-id').value;
  var number = document.getElementById('wa-tiket-number').value.trim();
  var message = document.getElementById('wa-message').value.trim();
  var btn = document.getElementById('btn-send-wa');
  var errorEl = document.getElementById('wa-error');

  if (!number || !message) {
    errorEl.textContent = 'Nomor WA dan pesan wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }

  // Clean number: remove +, spaces, etc.
  number = number.replace(/[^0-9]/g, '');
  if (!number.startsWith('62')) {
    if (number.startsWith('0')) number = '62' + number.slice(1);
    else number = '62' + number;
  }

  btn.disabled = true;
  btn.textContent = '\u23F3 Mengirim...';

  try {
    // Kirim via backend GAS (token Fonnte tersimpan di PropertiesService)
    await apiCall('sendWaMessage', [number, message]);
    showToast('Notifikasi WA berhasil dikirim ke ' + number, 'success');
    document.getElementById('modal-wa-ticket-overlay').classList.remove('show');
  } catch(e) {
    // Fallback: open WhatsApp web directly
    var waUrl = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
    window.open(waUrl, '_blank');
    showToast('WA Web dibuka. Silakan kirim manual.', 'warning');
    document.getElementById('modal-wa-ticket-overlay').classList.remove('show');
  } finally {
    btn.disabled = false;
    btn.textContent = '\uD83D\uDCE8 Kirim WA';
  }
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Export CSV
// ════════════════════════════════════════════════════════════
function exportTicketsCSV() {
  if (!_mntData || _mntData.length === 0) {
    showToast('Tidak ada data tiket untuk di-export', 'warning');
    return;
  }

  // Define headers
  var headers = ['Tiket ID', 'Customer', 'No. WA', 'Lokasi', 'Kategori', 'Sub Kategori', 'Urgensi', 'Status', 'Teknisi', 'Deskripsi', 'Tanggal', 'Selesai', 'Rating'];

  // Build CSV rows
  var rows = _mntData.map(function(t) {
    return [
      t.tiket_id,
      t.nama_customer,
      t.no_wa,
      t.lokasi,
      t.kategori,
      t.sub_kategori,
      t.urgensi,
      t.status,
      t.teknisi || '',
      (t.deskripsi || '').replace(/"/g, '""'),
      t.timestamp ? new Date(t.timestamp).toLocaleDateString('id-ID') : '',
      t.waktu_selesai ? new Date(String(t.waktu_selesai).replace(' ', 'T')).toLocaleDateString('id-ID') : '',
      t.rating_survei || ''
    ];
  });

  // Build CSV string
  var csv = '\uFEFF'; // BOM for Excel UTF-8 support
  csv += headers.map(function(h) { return '"' + h + '"'; }).join(',') + '\n';
  rows.forEach(function(row) {
    csv += row.map(function(cell) {
      var val = String(cell || '');
      if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',') + '\n';
  });

  // Download
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'tiket_maintenance_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  showToast('Berhasil mengexport ' + _mntData.length + ' tiket!', 'success');
}

// ════════════════════════════════════════════════════════════
// TIKET KOMPLAIN — Load Open Ticket Badge
// ════════════════════════════════════════════════════════════
async function loadOpenTicketBadge() {
  try {
    var all = await apiCall('getAllComplaints', []);
    var badge = document.getElementById('badge-open');
    if (!badge) return;
    var count = (all || []).filter(function(m) { return m.status === 'Open'; }).length;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {
    // Silently fail - badge is optional
  }
}

// ════════════════════════════════════════════════════════════
// PAGE: PATROL — Log Patroli
// ════════════════════════════════════════════════════════════
var _patrolLogData = [];
var _patrolCPData = [];
var _patrolTab = 'logs';

