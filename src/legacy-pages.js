// ════════════════════════════════════════════════════════════
// legacy-pages.js — Fitur migrasi dari versi stable
// Master Lokasi, Cleaning Tracker, Persiapan Kamar,
// Transaksi Kos, Global Search
// ════════════════════════════════════════════════════════════

// State global halaman legacy
var _lokasiEditRow = null;
var _prepFilter = 'Semua';
var _trxFilter = 'Semua';
var _trackerCache = null;
var _globalResults = null;

// ─── Helper form modal (memakai modal-form-overlay yang ada) ─
function legacyOpenForm(title, bodyHtml, saveFn, btnLabel) {
  var overlay = document.getElementById('modal-form-overlay');
  var titleEl = document.getElementById('modal-form-title');
  var bodyEl = document.getElementById('modal-form-body');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button class="login-btn login-btn-primary" id="btn-legacy-save" style="flex:1" onclick="' + saveFn + '">' + btnLabel + '</button>' +
    '<button class="login-btn" style="flex:1;background:rgba(255,255,255,0.06);color:#94a3b8" onclick="hideFormModal()">Batal</button></div>';
  overlay.classList.add('show');
}

function namaBulan(ym) {
  if (!ym) return 'Bulan ini';
  var parts = ym.split('-');
  if (parts.length !== 2) return ym;
  var bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var idx = parseInt(parts[1], 10) - 1;
  return bulanList[idx] + ' ' + parts[0];
}

// ════════════════════════════════════════════════════════════
// 1. MASTER LOKASI
// ════════════════════════════════════════════════════════════
async function renderMasterLokasi(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Lokasi</div><div class="page-desc">Area kebersihan & penanggungjawab</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CD; Daftar Lokasi</div><div class="card-actions">' +
    '<button class="btn btn-outline btn-sm" onclick="renderMasterLokasi(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button>' +
    '<button class="btn btn-primary btn-sm" onclick="showMasterLokasiForm()">+ Tambah Lokasi</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama Lokasi</th><th>Area</th><th>Tim</th><th>Status</th><th>Aksi</th></tr></thead>' +
    '<tbody id="tbody-masterlokasi"><tr><td colspan="6" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadMasterLokasiData();
}

async function loadMasterLokasiData() {
  var tbody = document.getElementById('tbody-masterlokasi');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Memuat...</td></tr>';
  try {
    var data = await apiCall('getAllMasterLokasi', []);
    data = data || [];
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada lokasi</td></tr>'; return; }
    var html = '';
    data.forEach(function(d) {
      html += '<tr><td>' + escapeHtml(d.id_lokasi) + '</td>' +
        '<td><strong>' + escapeHtml(d.nama_lokasi) + '</strong></td>' +
        '<td>' + escapeHtml(d.area || '-') + '</td>' +
        '<td>' + escapeHtml(d.tim_penanggungjawab || '-') + '</td>' +
        '<td><span class="badge ' + badgeClass(d.status) + '">' + escapeHtml(d.status) + '</span></td>' +
        '<td class="actions">' +
        '<button class="btn btn-warning btn-xs" onclick="showMasterLokasiForm(' + d._rowIndex + ')" style="margin-right:2px">&#x270F;&#xFE0F;</button>' +
        '<button class="btn btn-danger btn-xs" onclick="delMasterLokasi(' + d._rowIndex + ')">&#x1F5D1;&#xFE0F;</button></td></tr>';
    });
    tbody.innerHTML = html;
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty" style="color:#f87171">Gagal memuat: ' + escapeHtml(e.message) + '</td></tr>';
  }
}

function showMasterLokasiForm(rowIndex) {
  _lokasiEditRow = rowIndex || null;
  if (rowIndex) {
    apiCall('getAllMasterLokasi', []).then(function(data) {
      var item = null;
      for (var i = 0; i < (data || []).length; i++) {
        if (data[i]._rowIndex === rowIndex) { item = data[i]; break; }
      }
      if (!item) { showToast('Data tidak ditemukan.', 'error'); return; }
      renderLokasiForm(item);
    }).catch(function(e) { showToast(e.message, 'error'); });
  } else {
    renderLokasiForm(null);
  }
}

function renderLokasiForm(item) {
  var isEdit = !!item;
  var timOpts = '<option>Housekeeping</option><option>General Services</option><option>Security</option>';
  var body =
    '<div class="form-grid">' +
    '<div class="form-group"><label class="form-label">Nama Lokasi *</label><input type="text" class="form-control" id="f-lok-nama" value="' + (isEdit ? escapeHtml(item.nama_lokasi) : '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Area *</label><input type="text" class="form-control" id="f-lok-area" value="' + (isEdit ? escapeHtml(item.area || '') : '') + '" placeholder="Contoh: Lt.1, Lt.2"></div>' +
    '<div class="form-group"><label class="form-label">Tim Penanggungjawab</label><select class="form-control" id="f-lok-tim">' + timOpts + '</select></div>' +
    '<div class="form-group"><label class="form-label">Status</label><select class="form-control" id="f-lok-status"><option>Aktif</option><option>Nonaktif</option></select></div>' +
    '</div>';
  legacyOpenForm(isEdit ? '&#x270F;&#xFE0F; Edit Lokasi' : '&#x1F4CD; Tambah Lokasi Baru', body, 'saveMasterLokasi()', isEdit ? '&#x270F;&#xFE0F; Update' : '&#x1F4BE; Simpan');
  if (isEdit) {
    setTimeout(function() {
      if (item.tim_penanggungjawab) document.getElementById('f-lok-tim').value = item.tim_penanggungjawab;
      if (item.status) document.getElementById('f-lok-status').value = item.status;
    }, 50);
  }
}

async function saveMasterLokasi() {
  var payload = {
    nama_lokasi: document.getElementById('f-lok-nama').value,
    area: document.getElementById('f-lok-area').value,
    tim_penanggungjawab: document.getElementById('f-lok-tim').value,
    status: document.getElementById('f-lok-status').value
  };
  if (_lokasiEditRow) payload._rowIndex = _lokasiEditRow;
  if (!payload.nama_lokasi || !payload.area) { showToast('Nama lokasi dan area wajib diisi.', 'error'); return; }
  var btn = document.getElementById('btn-legacy-save');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menyimpan...'; }
  try {
    await apiCall('saveMasterLokasi', [payload]);
    showToast(_lokasiEditRow ? 'Lokasi berhasil diperbarui.' : 'Lokasi berhasil ditambahkan.', 'success');
    hideFormModal();
    _lokasiEditRow = null;
    loadMasterLokasiData();
  } catch (e) {
    showToast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = _lokasiEditRow ? 'Update' : 'Simpan'; }
  }
}

async function delMasterLokasi(rowIndex) {
  if (!confirm('Hapus lokasi ini?')) return;
  try {
    await apiCall('deleteMasterLokasi', [rowIndex]);
    showToast('Lokasi berhasil dihapus.', 'success');
    loadMasterLokasiData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// 2. CLEANING TRACKER
// ════════════════════════════════════════════════════════════
async function renderCleaningTracker(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Cleaning Tracker</div><div class="page-desc">Ranking kebersihan staff per bulan</div></div>' +
    '<div class="stats-grid" id="tracker-stats">' +
    '<div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon">&#x1F9F9;</div><div class="stat-card-label">Total Dibersihkan</div></div><div class="stat-value" id="trk-total">-</div><div class="stat-card-sub" id="trk-periode">Bulan ini</div></div>' +
    '<div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon">&#x1F465;</div><div class="stat-card-label">Staff Aktif</div></div><div class="stat-value" id="trk-staff">-</div><div class="stat-card-sub">Membersihkan bulan ini</div></div>' +
    '<div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon">&#x1F3C6;</div><div class="stat-card-label">Staff Terbaik</div></div><div class="stat-value" id="trk-top" style="font-size:0.95rem">-</div><div class="stat-card-sub" id="trk-top-count">Kamar terbanyak</div></div>' +
    '<div class="stat-card cyan"><div class="stat-card-header"><div class="stat-card-icon">&#x1F4C5;</div><div class="stat-card-label">Periode</div></div><div class="stat-value"><input type="month" class="form-control" id="trk-bulan" onchange="loadCleaningTrackerData()" style="font-size:0.85rem;padding:6px 10px"></div><div class="stat-card-sub">Pilih bulan</div></div>' +
    '</div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CA; Ranking Kebersihan Staff — <span id="trk-periode-label">Bulan Ini</span></div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderCleaningTracker(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>#</th><th>Nama Staff</th><th>Total Kamar</th><th>Check-in Prep</th><th>After Check-out</th><th>Maintenance</th></tr></thead>' +
    '<tbody id="tbody-tracker"><tr><td colspan="6" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CB; Detail Kamar — <span id="trk-detail-label">Pilih staff</span></div></div>' +
    '<div class="card-body" id="tracker-detail-body"><div style="color:#64748b;text-align:center;padding:20px">Klik baris staff untuk melihat detail kamar</div></div></div>';
  loadCleaningTrackerData();
}

async function loadCleaningTrackerData() {
  var bulan = document.getElementById('trk-bulan').value;
  if (!bulan) {
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    bulan = y + '-' + m;
    document.getElementById('trk-bulan').value = bulan;
  }
  document.getElementById('trk-periode').textContent = namaBulan(bulan);
  document.getElementById('trk-periode-label').textContent = namaBulan(bulan);
  document.getElementById('trk-detail-label').textContent = namaBulan(bulan);
  document.getElementById('tbody-tracker').innerHTML = '<tr><td colspan="6" class="table-empty">Memuat...</td></tr>';

  try {
    var data = await apiCall('getCleaningTracker', [bulan]);
    _trackerCache = data;
    document.getElementById('trk-total').textContent = data.totalCleaned || 0;
    document.getElementById('trk-staff').textContent = data.staffCount || 0;

    var rows = '';
    var topStaff = '-';
    var topCount = 0;

    if (data.staffRanking && data.staffRanking.length > 0) {
      topStaff = escapeHtml(data.staffRanking[0].nama);
      topCount = data.staffRanking[0].total;
      data.staffRanking.forEach(function(s, i) {
        rows += '<tr style="cursor:pointer" onclick="showTrackerDetail(\'' + escapeHtml(s.nama).replace(/'/g, "\\'") + '\')">' +
          '<td>' + (i + 1) + '</td><td><strong>' + escapeHtml(s.nama) + '</strong></td>' +
          '<td>' + s.total + '</td><td>' + s.check_in_prep + '</td><td>' + s.after_checkout + '</td><td>' + s.maintenance_clean + '</td></tr>';
      });
    } else {
      rows = '<tr><td colspan="6" class="table-empty">Belum ada data pembersihan di bulan ini</td></tr>';
    }
    document.getElementById('trk-top').textContent = topStaff;
    document.getElementById('trk-top-count').textContent = topCount + ' kamar';
    document.getElementById('tbody-tracker').innerHTML = rows;
  } catch (e) {
    document.getElementById('tbody-tracker').innerHTML = '<tr><td colspan="6" class="table-empty" style="color:#f87171">Gagal memuat: ' + escapeHtml(e.message) + '</td></tr>';
  }
}

function showTrackerDetail(nama) {
  if (!_trackerCache || !_trackerCache.staffRanking) return;
  var staff = null;
  _trackerCache.staffRanking.forEach(function(s) { if (s.nama === nama) staff = s; });
  var body = document.getElementById('tracker-detail-body');
  if (!staff || !staff.kamarList || staff.kamarList.length === 0) {
    body.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px">Tidak ada detail kamar untuk ' + escapeHtml(nama) + '</div>';
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr><th>Kamar</th><th>Kos</th><th>Jenis</th><th>Selesai</th></tr></thead><tbody>';
  staff.kamarList.forEach(function(k) {
    html += '<tr><td>' + escapeHtml(k.nama_kamar) + '</td><td>' + escapeHtml(k.nama_kos) + '</td><td>' + escapeHtml(k.jenis) + '</td><td>' + escapeHtml(k.selesai_pada) + '</td></tr>';
  });
  html += '</tbody></table></div>';
  body.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// 3. PERSIAPAN KAMAR
// ════════════════════════════════════════════════════════════
async function renderKosPrep(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Persiapan Kamar</div><div class="page-desc">Tugas housekeeping persiapan kamar</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F9F9; Tugas Persiapan</div><div class="card-actions">' +
    '<button class="btn btn-outline btn-sm" onclick="renderKosPrep(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button>' +
    '<button class="btn btn-primary btn-sm" onclick="showPersiapanForm()">+ Tugas Baru</button></div></div>' +
    '<div class="filter-chips" id="prep-filters">' +
    '<button class="filter-chip active" onclick="filterPrep(\'Semua\', this)">Semua</button>' +
    '<button class="filter-chip" onclick="filterPrep(\'Pending\', this)">&#x1F7E1; Pending</button>' +
    '<button class="filter-chip" onclick="filterPrep(\'In Progress\', this)">&#x1F535; In Progress</button>' +
    '<button class="filter-chip" onclick="filterPrep(\'Completed\', this)">&#x1F7E2; Completed</button></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Kos</th><th>Kamar</th><th>Jenis</th><th>Petugas</th><th>Status</th><th>Dibuat</th><th>Selesai</th><th>Aksi</th></tr></thead>' +
    '<tbody id="tbody-kosprep"><tr><td colspan="9" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadKosPrepData();
}

function filterPrep(status, btn) {
  _prepFilter = status;
  var chips = document.querySelectorAll('#prep-filters .filter-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  loadKosPrepData();
}

async function loadKosPrepData() {
  var tbody = document.getElementById('tbody-kosprep');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Memuat...</td></tr>';
  try {
    var resp = await apiCall('getAllPersiapanKamar', [_prepFilter]);
    var data = (resp && resp.data) ? resp.data : (resp || []);
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Belum ada tugas</td></tr>'; return; }
    var html = '';
    data.forEach(function(p) {
      var badge = badgeClass(p.status);
      var actions = '';
      if (p.status === 'Pending') actions = '<button class="btn btn-primary btn-xs" onclick="updatePrepStatus(\'' + p.id_persiapan + '\',\'In Progress\')">&#x1F535; Ambil</button> ';
      if (p.status === 'In Progress') actions = '<button class="btn btn-success btn-xs" onclick="updatePrepStatus(\'' + p.id_persiapan + '\',\'Completed\')">&#x2705; Selesai</button> ';
      actions += '<button class="btn btn-danger btn-xs" onclick="deletePrepTask(\'' + p.id_persiapan + '\')">&#x1F5D1;&#xFE0F;</button>';
      html += '<tr><td>' + escapeHtml(p.id_persiapan) + '</td><td>' + escapeHtml(p.nama_kos) + '</td><td><strong>' + escapeHtml(p.nama_kamar) + '</strong></td><td>' + escapeHtml(p.jenis) + '</td><td>' + escapeHtml(p.assigned_to || '-') + '</td><td><span class="badge ' + badge + '">' + escapeHtml(p.status) + '</span></td><td>' + p.timestamp + '</td><td>' + p.selesai_pada + '</td><td class="actions">' + actions + '</td></tr>';
    });
    tbody.innerHTML = html;
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty" style="color:#f87171">Gagal memuat: ' + escapeHtml(e.message) + '</td></tr>';
  }
}

async function showPersiapanForm() {
  try {
    var [kamarList, staffList] = await Promise.all([
      apiCall('getAllKamar', []),
      apiCall('getStaffByTeam', ['Housekeeping'])
    ]);
    kamarList = kamarList || [];
    staffList = staffList || [];

    var prepStatuses = ['Tersedia', 'Perbaikan', 'Persiapan'];
    var prep = kamarList.filter(function(r) { return prepStatuses.indexOf(r.status_kamar) >= 0; });

    var rmOpts = '<option value="">Pilih Kamar</option>';
    prep.forEach(function(r) { rmOpts += '<option value="' + escapeHtml(r.kode_kamar) + '">' + escapeHtml(r.nama_kamar) + ' (' + escapeHtml(r.status_kamar) + ')</option>'; });
    if (prep.length === 0) rmOpts = '<option value="">Tidak ada kamar tersedia</option>';

    var stOpts = '<option value="">Pilih Petugas</option>';
    var lastTim = '';
    staffList.forEach(function(s) {
      if (lastTim !== s.tim) {
        if (lastTim) stOpts += '</optgroup>';
        stOpts += '<optgroup label="' + escapeHtml(s.tim) + '">';
        lastTim = s.tim;
      }
      stOpts += '<option value="' + escapeHtml(s.nama) + '">' + escapeHtml(s.nama) + '</option>';
    });
    if (lastTim) stOpts += '</optgroup>';

    var body = '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">&#x1F6AA; Kamar *</label><select class="form-control" id="f-prep-kamar">' + rmOpts + '</select></div>' +
      '<div class="form-group"><label class="form-label">&#x1F9F9; Jenis *</label><select class="form-control" id="f-prep-jenis"><option>Check-in Prep</option><option>After Check-out</option><option>Maintenance Clean</option></select></div>' +
      '<div class="form-group"><label class="form-label">&#x1F465; Petugas</label><select class="form-control" id="f-prep-petugas">' + stOpts + '</select></div>' +
      '<div class="form-group full"><label class="form-label">&#x1F4DD; Catatan</label><textarea class="form-control" id="f-prep-catatan" placeholder="Instruksi khusus"></textarea></div></div>';
    legacyOpenForm('&#x1F9F9; Buat Tugas Persiapan', body, 'createPersiapanTask()', '&#x1F4BE; Buat Tugas');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function createPersiapanTask() {
  var p = {
    kode_kamar: document.getElementById('f-prep-kamar').value,
    jenis: document.getElementById('f-prep-jenis').value,
    assigned_to: document.getElementById('f-prep-petugas').value,
    catatan: document.getElementById('f-prep-catatan').value
  };
  if (!p.kode_kamar || !p.jenis) { showToast('Kamar dan jenis wajib diisi!', 'error'); return; }
  var btn = document.getElementById('btn-legacy-save');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menyimpan...'; }
  try {
    await apiCall('createPersiapanKamar', [p]);
    showToast('Tugas persiapan kamar berhasil dibuat.', 'success');
    hideFormModal();
    loadKosPrepData();
  } catch (e) {
    showToast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Buat Tugas'; }
  }
}

async function updatePrepStatus(id, status) {
  var label = status === 'Completed' ? 'Selesaikan' : 'Ambil';
  if (!confirm(label + ' tugas ini?')) return;
  try {
    await apiCall('updateStatusPersiapan', [id, status]);
    showToast('Status berhasil diubah.', 'success');
    loadKosPrepData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deletePrepTask(id) {
  if (!confirm('Hapus tugas ini?')) return;
  try {
    await apiCall('deletePersiapanKamar', [id]);
    showToast('Tugas dihapus.', 'success');
    loadKosPrepData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// 4. TRANSAKSI KOS (Check-in / Check-out)
// ════════════════════════════════════════════════════════════
async function renderKosTrx(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Transaksi Kos</div><div class="page-desc">Check-in / check-out kamar kos</div></div>' +
    '<div class="stats-grid" id="trx-stats">' +
    '<div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon">&#x1F4CB;</div><div class="stat-card-label">Transaksi Aktif</div></div><div class="stat-value" id="trx-active">-</div><div class="stat-card-sub">Tamu sedang menginap</div></div>' +
    '<div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon">&#x2705;</div><div class="stat-card-label">Selesai</div></div><div class="stat-value" id="trx-completed">-</div><div class="stat-card-sub">Riwayat check-out</div></div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CB; Check-in / Check-out Kamar Kos</div><div class="card-actions">' +
    '<button class="btn btn-outline btn-sm" onclick="renderKosTrx(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button>' +
    '<button class="btn btn-success btn-sm" onclick="showCheckInForm()">&#x2795; Check-in Baru</button></div></div>' +
    '<div class="filter-chips" id="trx-filters">' +
    '<button class="filter-chip active" onclick="filterTrx(\'Semua\', this)">Semua</button>' +
    '<button class="filter-chip" onclick="filterTrx(\'Active\', this)">&#x1F535; Active</button>' +
    '<button class="filter-chip" onclick="filterTrx(\'Completed\', this)">&#x1F7E2; Completed</button>' +
    '<button class="filter-chip" onclick="filterTrx(\'Cancelled\', this)">&#x1F534; Cancelled</button></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Tamu</th><th>No. WA</th><th>Kamar</th><th>Check-in</th><th>Rencana Check-out</th><th>Total Bayar</th><th>Status</th><th>Aksi</th></tr></thead>' +
    '<tbody id="tbody-kostrx"><tr><td colspan="9" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadKosTrxData();
}

function filterTrx(status, btn) {
  _trxFilter = status;
  var chips = document.querySelectorAll('#trx-filters .filter-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  loadKosTrxData();
}

async function loadKosTrxData() {
  var tbody = document.getElementById('tbody-kostrx');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Memuat...</td></tr>';
  try {
    var resp = await apiCall('getAllTransaksiKos', [_trxFilter]);
    var data = (resp && resp.data) ? resp.data : (resp || []);
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Belum ada data transaksi</td></tr>';
      var eActive = document.getElementById('trx-active'); if (eActive) eActive.textContent = '0';
      var eComp = document.getElementById('trx-completed'); if (eComp) eComp.textContent = '0';
      return;
    }
    var active = 0, completed = 0;
    data.forEach(function(t) { if (t.status === 'Active') active++; if (t.status === 'Completed') completed++; });
    var elA = document.getElementById('trx-active'); if (elA) elA.textContent = active;
    var elC = document.getElementById('trx-completed'); if (elC) elC.textContent = completed;

    var html = '';
    data.forEach(function(t) {
      var badge = badgeClass(t.status);
      var actions = '';
      if (t.status === 'Active') {
        actions = '<button class="btn btn-success btn-xs" onclick="showCheckOutConfirm(\'' + t.id_transaksi + '\')">&#x2705; Check-out</button> ' +
          '<button class="btn btn-warning btn-xs" onclick="cancelTransaksiTask(\'' + t.id_transaksi + '\')">&#x274C; Batal</button>';
      }
      html += '<tr><td>' + escapeHtml(t.id_transaksi) + '</td><td><strong>' + escapeHtml(t.nama_tamu) + '</strong></td><td>' + escapeHtml(t.no_wa_tamu) + '</td><td>' + escapeHtml(t.nama_kamar) + '</td><td>' + t.check_in + '</td><td>' + t.rencana_check_out + '</td><td>Rp ' + Number(t.total_bayar || 0).toLocaleString('id-ID') + '</td><td><span class="badge ' + badge + '">' + escapeHtml(t.status) + '</span></td><td class="actions">' + actions + '</td></tr>';
    });
    tbody.innerHTML = html;
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty" style="color:#f87171">Gagal memuat: ' + escapeHtml(e.message) + '</td></tr>';
  }
}

async function showCheckInForm() {
  try {
    var [kamarList, kosList] = await Promise.all([
      apiCall('getAllKamar', []),
      apiCall('getAllKos', [])
    ]);
    kamarList = kamarList || [];
    kosList = kosList || [];
    var kosMap = {};
    kosList.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });

    var avail = kamarList.filter(function(r) { return r.status_kamar === 'Tersedia'; });
    var opts = '<option value="">Pilih Kamar</option>';
    avail.forEach(function(r) {
      opts += '<option value="' + escapeHtml(r.kode_kamar) + '">' + escapeHtml(kosMap[r.kode_kos] || r.kode_kos) + ' — ' + escapeHtml(r.nama_kamar) + ' (' + escapeHtml(r.tipe_kamar || 'Reguler') + ', Rp ' + Number(r.harga_sewa || 0).toLocaleString('id-ID') + ')</option>';
    });
    if (avail.length === 0) opts = '<option value="">Tidak ada kamar tersedia</option>';

    var nowStr = new Date().toISOString().slice(0, 16);
    var body = '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">&#x1F6AA; Pilih Kamar *</label><select class="form-control" id="f-ci-kamar">' + opts + '</select></div>' +
      '<div class="form-group"><label class="form-label">&#x1F464; Nama Tamu *</label><input class="form-control" id="f-ci-nama" placeholder="Nama lengkap"></div>' +
      '<div class="form-group"><label class="form-label">&#x1F4F1; No. WA</label><input class="form-control" id="f-ci-wa" placeholder="62812xxxx"></div>' +
      '<div class="form-group"><label class="form-label">&#x1F4C5; Check-in *</label><input type="datetime-local" class="form-control" id="f-ci-mulai" value="' + nowStr + '"></div>' +
      '<div class="form-group"><label class="form-label">&#x1F4C5; Rencana Check-out</label><input type="datetime-local" class="form-control" id="f-ci-selesai"></div>' +
      '<div class="form-group"><label class="form-label">&#x1F4B0; Total Bayar</label><input type="number" class="form-control" id="f-ci-bayar" placeholder="0"></div>' +
      '<div class="form-group full"><label class="form-label">&#x1F4DD; Catatan</label><textarea class="form-control" id="f-ci-catatan" placeholder="Catatan check-in"></textarea></div></div>';
    legacyOpenForm('&#x2795; Check-in Baru', body, 'doCheckInTask()', '&#x2705; Konfirmasi Check-in');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function doCheckInTask() {
  var p = {
    kode_kamar: document.getElementById('f-ci-kamar').value,
    nama_tamu: document.getElementById('f-ci-nama').value,
    no_wa_tamu: document.getElementById('f-ci-wa').value,
    check_in: document.getElementById('f-ci-mulai').value,
    rencana_check_out: document.getElementById('f-ci-selesai').value,
    total_bayar: document.getElementById('f-ci-bayar').value || '0',
    catatan: document.getElementById('f-ci-catatan').value
  };
  if (!p.kode_kamar || !p.nama_tamu || !p.check_in) { showToast('Kamar, nama tamu, dan tanggal check-in wajib diisi!', 'error'); return; }
  var btn = document.getElementById('btn-legacy-save');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menyimpan...'; }
  try {
    await apiCall('checkInKos', [p]);
    showToast('Check-in berhasil!', 'success');
    hideFormModal();
    loadKosTrxData();
  } catch (e) {
    showToast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Konfirmasi Check-in'; }
  }
}

function showCheckOutConfirm(idTransaksi) {
  var now = new Date().toISOString().slice(0, 16);
  var body = '<div class="form-grid">' +
    '<div class="form-group full"><label class="form-label">&#x1F4C5; Check-out Aktual</label><input type="datetime-local" class="form-control" id="f-co-tgl" value="' + now + '"></div>' +
    '<div class="form-group full"><label class="form-label">&#x1F4DD; Catatan</label><textarea class="form-control" id="f-co-catatan" placeholder="Kondisi kamar, kekurangan, dll"></textarea></div></div>';
  legacyOpenForm('&#x2705; Konfirmasi Check-out', body, 'doCheckOutTask(\'' + idTransaksi + '\')', '&#x2705; Check-out Sekarang');
}

async function doCheckOutTask(idTransaksi) {
  var tgl = document.getElementById('f-co-tgl').value;
  var cat = document.getElementById('f-co-catatan').value;
  var btn = document.getElementById('btn-legacy-save');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Memproses...'; }
  try {
    await apiCall('checkOutKos', [idTransaksi, tgl, cat]);
    showToast('Check-out berhasil! Tugas pembersihan otomatis dibuat.', 'success');
    hideFormModal();
    loadKosTrxData();
  } catch (e) {
    showToast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Check-out Sekarang'; }
  }
}

async function cancelTransaksiTask(id) {
  if (!confirm('Batalkan transaksi ini?')) return;
  try {
    await apiCall('cancelTransaksiKos', [id]);
    showToast('Transaksi berhasil dibatalkan.', 'success');
    loadKosTrxData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// 5. GLOBAL SEARCH
// ════════════════════════════════════════════════════════════
async function renderGlobalSearch(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Pencarian Global</div><div class="page-desc">Cari tiket, kamar, transaksi, dan user</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F50D; Pencarian</div></div>' +
    '<div class="card-body" style="display:flex;gap:8px">' +
    '<input type="text" class="form-control" id="global-q" placeholder="Ketik minimal 2 huruf... (mis. tiket ID, nama tamu, nama staff)" onkeydown="if(event.key===\'Enter\')doGlobalSearch()" style="flex:1">' +
    '<button class="btn btn-primary" onclick="doGlobalSearch()">&#x1F50D; Cari</button></div></div>' +
    '<div id="global-results"><div class="section-card" style="color:#64748b;text-align:center;padding:30px">Masukkan kata kunci untuk mencari data di seluruh sistem.</div></div>';
  var q = document.getElementById('global-q');
  if (q) q.focus();
}

async function doGlobalSearch() {
  var q = document.getElementById('global-q');
  var container = document.getElementById('global-results');
  if (!q || !container) return;
  var query = q.value.trim();
  if (query.length < 2) { showToast('Ketik minimal 2 huruf.', 'error'); return; }

  container.innerHTML = '<div class="section-card" style="color:#64748b;text-align:center;padding:30px">Mencari...</div>';
  try {
    var res = await apiCall('globalSearch', [query]);
    _globalResults = res;
    var html = '<div style="margin-bottom:12px;color:#64748b;font-size:0.82rem">Ditemukan <strong>' + (res.total || 0) + '</strong> hasil untuk "' + escapeHtml(query) + '"</div>';

    html += renderSearchGroup('&#x1F527; Tiket Komplain', res.tiket, 'maintenance');
    html += renderSearchGroup('&#x1F6AA; Kamar Kos', res.kamar, 'roomstatus');
    html += renderSearchGroup('&#x1F4CB; Transaksi Kos', res.transaksi, 'kostrx');
    html += renderSearchGroup('&#x1F465; User', res.user, 'users');

    if ((res.total || 0) === 0) html += '<div class="section-card" style="color:#64748b;text-align:center;padding:30px">Tidak ada hasil.</div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="section-card" style="color:#f87171;text-align:center;padding:30px">Gagal mencari: ' + escapeHtml(e.message) + '</div>';
  }
}

function renderSearchGroup(title, items, fallbackPage) {
  items = items || [];
  if (items.length === 0) return '';
  var html = '<div class="section-card" style="margin-bottom:12px">' +
    '<div class="section-title" style="margin-bottom:8px">' + title + ' <span style="color:#64748b;font-size:0.75rem">(' + items.length + ')</span></div>';
  items.forEach(function(it) {
    html += '<div class="activity-item clickable" onclick="gotoSearchResult(\'' + escapeHtml(it.page || fallbackPage) + '\')">' +
      '<div class="activity-dot" style="background:' + searchStatusColor(it.status) + '"></div>' +
      '<div class="activity-text"><strong>' + escapeHtml(it.label) + '</strong><br><span style="color:#64748b;font-size:0.75rem">' + escapeHtml(it.sub || '') + '</span></div>' +
      '<div class="activity-time"><span class="badge ' + badgeClass(it.status) + '">' + escapeHtml(it.status || '-') + '</span></div></div>';
  });
  html += '</div>';
  return html;
}

function searchStatusColor(status) {
  var s = String(status || '').toLowerCase();
  if (s.indexOf('selesai') >= 0 || s.indexOf('completed') >= 0 || s.indexOf('closed') >= 0 || s === 'tersedia') return '#34d399';
  if (s.indexOf('open') >= 0 || s.indexOf('pending') >= 0 || s.indexOf('terisi') >= 0 || s.indexOf('active') >= 0) return '#fbbf24';
  if (s.indexOf('batal') >= 0 || s.indexOf('cancelled') >= 0 || s.indexOf('fail') >= 0) return '#f87171';
  return '#6366f1';
}

function gotoSearchResult(page) {
  if (page && typeof showPage === 'function') showPage(page);
}

// ════════════════════════════════════════════════════════════
// 6. IMPORT / EXPORT DATA (CSV)
// ════════════════════════════════════════════════════════════
async function renderDataTools(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Import / Export Data</div><div class="page-desc">Backup & transfer data via CSV</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4E4; Export CSV</div></div>' +
    '<div class="card-body">' +
    '<div class="form-grid"><div class="form-group"><label class="form-label">Pilih Data</label><select class="form-control" id="f-export-table">' +
    '<option value="maintenance">Tiket Maintenance</option>' +
    '<option value="patrol">Log Patroli</option>' +
    '<option value="inspection">Inspeksi Aset</option>' +
    '<option value="booking">Booking Aset</option>' +
    '<option value="checklist">Checklist Harian</option>' +
    '<option value="audit">Audit Housekeeping</option>' +
    '<option value="transaksi_kos">Transaksi Kos</option>' +
    '<option value="kamar">Master Kamar</option></select></div></div>' +
    '<button class="btn btn-primary" onclick="doExportCSV()">&#x1F4E4; Export CSV</button> ' +
    '<div id="export-result" style="margin-top:10px;font-size:0.82rem;color:#64748b"></div>' +
    '</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4E5; Import CSV</div></div>' +
    '<div class="card-body">' +
    '<div class="form-grid"><div class="form-group"><label class="form-label">Tujuan Master Data</label><select class="form-control" id="f-import-sheet">' +
    '<option value="Asset_List">Master Aset</option>' +
    '<option value="Master_SLA">Master SLA</option>' +
    '<option value="Master_CS_Schedule">Master Jadwal CS</option>' +
    '<option value="Master_Lokasi">Master Lokasi</option>' +
    '<option value="Master_Patrol_Checkpoints">Master Checkpoint</option>' +
    '<option value="Master_Patrol_Schedule">Master Jadwal Patroli</option>' +
    '<option value="User_List">User List</option></select></div>' +
    '<div class="form-group full"><label class="form-label">Data CSV (baris pertama = header)</label>' +
    '<textarea class="form-control" id="f-import-csv" rows="6" placeholder="kategori,nama_aset,detail_kapasitas,status_operasional&#10;Ruangan,Ruang Rapat Lt.2,Kapasitas 20 org,Tersedia"></textarea></div>' +
    '<div class="form-group full"><label class="form-label">atau upload file CSV</label>' +
    '<input type="file" class="form-control" id="f-import-file" accept=".csv,text/csv"></div></div>' +
    '<button class="btn btn-primary" onclick="doImportData()">&#x1F4E5; Import Data</button> ' +
    '<div id="import-result" style="margin-top:10px;font-size:0.82rem;color:#64748b"></div>' +
    '</div></div>';
}

async function doExportCSV() {
  var tableId = document.getElementById('f-export-table').value;
  var res = document.getElementById('export-result');
  res.textContent = 'Mengekspor...';
  try {
    var data = await apiCall('exportDataToCSV', [tableId]);
    if (!data || !data.csv) { res.textContent = 'Tidak ada data untuk diekspor.'; return; }
    var blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = data.filename || (tableId + '.csv');
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    res.textContent = 'Export berhasil: ' + (data.filename || '') + ' (' + data.csv.split('\n').length + ' baris) — file terunduh.';
  } catch (e) {
    res.textContent = 'Gagal export: ' + e.message;
  }
}

async function doImportData() {
  var sheetId = document.getElementById('f-import-sheet').value;
  var res = document.getElementById('import-result');
  if (!sheetId) { res.textContent = 'Pilih master data tujuan.'; return; }

  var csvText = document.getElementById('f-import-csv').value.trim();
  var fileInput = document.getElementById('f-import-file');
  if (!csvText && (!fileInput.files || fileInput.files.length === 0)) {
    res.textContent = 'Upload file atau tempel data CSV.';
    return;
  }

  try {
    var csvData = csvText;
    if (!csvData && fileInput.files.length > 0) {
      csvData = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function(e) { reject(new Error('Gagal membaca file.')); };
        reader.readAsText(fileInput.files[0], 'UTF-8');
      });
    }
    res.textContent = 'Mengimpor...';
    await apiCall('importMasterData', [sheetId, csvData]);
    res.textContent = 'Import berhasil! Data ditambahkan ke ' + sheetId + '.';
    document.getElementById('f-import-csv').value = '';
    fileInput.value = '';
  } catch (e) {
    res.textContent = 'Import gagal: ' + e.message;
  }
}
