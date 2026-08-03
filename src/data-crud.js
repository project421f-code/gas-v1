async function loadKPIMntData() {
  try {
    var data = await apiCall('getMaintenanceKPI', []);
    var tbody = document.getElementById('tbody-kpimnt');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      return '<tr><td>' + escapeHtml(d.nama_staff || '-') + '</td><td>' + (d.total_tiket || 0) + '</td><td>' + (d.tiket_selesai || 0) + '</td>' +
        '<td>' + (d.persen_sla || 0) + '%</td><td>' + (d.rata_rata_rating || '-') + '</td><td><strong>' + (d.skor_performa || 0) + '</strong></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadBookingData() {
  try {
    var data = await apiCall('getAllBookings', []);
    data = (data || []).slice(0, 20);
    var tbody = document.getElementById('tbody-booking');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_booking === 'Approved (Auto)' ? 'badge-green' : (d.status_booking === 'Pending' ? 'badge-amber' : 'badge-red');
      return '<tr><td>' + escapeHtml(d.nama_peminjam || '-') + '</td><td>' + escapeHtml(d.nama_aset || '-') + '</td>' +
        '<td>' + escapeHtml(d.waktu_mulai || '-') + '</td><td>' + escapeHtml(d.waktu_selesai || '-') + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_booking) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadAssetListData() {
  try {
    var data = await apiCall('getAllAssetList', []);
    _assetListData = data;
    var tbody = document.getElementById('tbody-assetlist');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada data. Klik "+ Tambah Aset" untuk menambah.</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var statusCls = d.status_operasional === 'Tersedia' ? 'badge-green' : (d.status_operasional === 'Maintenance' ? 'badge-amber' : 'badge-red');
      return '<tr><td>' + escapeHtml(d.kategori || '-') + '</td><td>' + escapeHtml(d.nama_aset || '-') + '</td>' +
        '<td>' + escapeHtml(d.detail_kapasitas || '-') + '</td>' +
        '<td><span class="badge ' + statusCls + '">' + escapeHtml(d.status_operasional) + '</span></td>' +
        '<td class="actions">' +
        '<button class="btn btn-danger btn-xs" onclick="delAssetItem(' + d._rowIndex + ')" title="Hapus">&#x1F5D1;</button>' +
        '</td></tr>';
    }).join('');
    injectMobileTableLabels();
  } catch(e) { console.error(e); }
}

// ════════════════════════════════════════════════════════════
// CRUD ASET — Form Tambah / Edit
// ════════════════════════════════════════════════════════════
function showAssetForm() {
  var overlay = document.getElementById('modal-asset-overlay');
  if (!overlay) return;
  document.getElementById('asset-form').reset();
  document.getElementById('asset-error').style.display = 'none';
  overlay.classList.add('show');
}

async function saveAssetForm() {
  var overlay = document.getElementById('modal-asset-overlay');
  var btn = document.getElementById('btn-save-asset');
  var errorEl = document.getElementById('asset-error');

  var kategori = document.getElementById('f-asset-kat').value;
  var nama = document.getElementById('f-asset-nama').value.trim();
  var detail = document.getElementById('f-asset-detail').value.trim();
  var status = document.getElementById('f-asset-status').value;

  if (!kategori || !nama || !status) {
    errorEl.textContent = 'Kategori, Nama Aset, dan Status wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  btn.disabled = true;
  btn.textContent = '\u23F3 Menyimpan...';

  try {
    await apiCall('saveAssetList', [{
      kategori: kategori,
      nama_aset: nama,
      detail_kapasitas: detail || '-',
      status_operasional: status
    }]);

    showToast('Aset "' + nama + '" berhasil ditambahkan!', 'success');
    if (overlay) overlay.classList.remove('show');
    if (APP.currentPage === 'assetlist') {
      renderAssetList(document.getElementById('main-content'));
    }
  } catch(e) {
    errorEl.textContent = 'Gagal: ' + e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '\uD83D\uDCBE Simpan';
  }
}

async function editAssetItem(id) {
  if (!id) return;
  var item = _assetListData.find(function(a) { return a._rowIndex === id; });
  if (!item) { showToast('Data aset tidak ditemukan', 'error'); return; }

  var overlay = document.getElementById('modal-asset-overlay');
  if (!overlay) return;

  document.getElementById('f-asset-kat').value = item.kategori || '';
  document.getElementById('f-asset-nama').value = item.nama_aset || '';
  document.getElementById('f-asset-detail').value = item.detail_kapasitas || '';
  document.getElementById('f-asset-status').value = item.status_operasional || 'Tersedia';
  document.getElementById('asset-error').style.display = 'none';
  overlay.classList.add('show');
}

async function delAssetItem(id) {
  if (!id) return;
  if (!confirm('Yakin ingin menghapus aset ini? Data akan dihapus permanen.')) return;

  try {
    await apiCall('deleteAssetItem', [id]);

    showToast('Aset berhasil dihapus!', 'success');
    var tbody = document.getElementById('tbody-assetlist');
    if (tbody) loadAssetListData();
  } catch(e) {
    showToast('Gagal menghapus: ' + e.message, 'error');
  }
}

async function loadMasterKosData() {
  try {
    var data = await apiCall('getAllKos', []);
    var tbody = document.getElementById('tbody-masterkos');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status === 'Aktif' ? 'badge-green' : 'badge-gray';
      return '<tr><td>' + escapeHtml(d.kode_kos || '-') + '</td><td><strong>' + escapeHtml(d.nama_kos || '-') + '</strong></td>' +
        '<td>' + (d.jumlah_kamar || 0) + '</td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadMasterKamarData() {
  try {
    var data = await apiCall('getAllKamar', []);
    var tbody = document.getElementById('tbody-masterkamar');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_kamar === 'Tersedia' ? 'badge-green' : (d.status_kamar === 'Terisi' ? 'badge-red' : 'badge-amber');
      return '<tr><td>' + escapeHtml(d.kode_kamar || '-') + '</td><td>' + escapeHtml(d.kode_kos || '-') + '</td>' +
        '<td>' + escapeHtml(d.tipe_kamar || '-') + '</td><td>' + (d.harga_sewa ? 'Rp ' + Number(d.harga_sewa).toLocaleString('id-ID') : '-') + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_kamar) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

// ═══ ADDITIONAL DATA LOADING HELPERS ═══

async function loadKPIHKData() {
  try {
    var [csList, gcList] = await Promise.all([
      apiCall('getAllDailyChecklists', []),
      apiCall('getAllGCExecutions', [])
    ]);
    var csCount = (csList || []).length;
    var gcCount = (gcList || []).length;
    var el1 = document.getElementById('hk-daily-rate');
    var el2 = document.getElementById('hk-gc-rate');
    if (el1) el1.textContent = csCount;
    if (el2) el2.textContent = gcCount;
  } catch(e) { console.error(e); }
  try {
    var staff = await apiCall('getStaffByTeam', ['Housekeeping']);
    var tbody = document.getElementById('tbody-kpihk');
    if (!tbody) return;
    if (staff.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = staff.map(function(s) {
      return '<tr><td>' + escapeHtml(s.nama || '-') + '</td><td>' + escapeHtml(s.tim || '-') + '</td>' +
        '<td>0</td><td>0</td><td>0%</td><td>-</td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadCheckpointsData() {
  try {
    var data = await apiCall('getAllPatrolCheckpoints', []);
    var tbody = document.getElementById('tbody-checkpoints');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada checkpoint</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status === 'Aktif' ? 'badge-green' : 'badge-gray';
      return '<tr><td><strong>' + escapeHtml(d.id_pos || '-') + '</strong></td><td>' + escapeHtml(d.nama_pos || '-') + '</td>' +
        '<td>' + escapeHtml(d.area || '-') + '</td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadSchedulesData() {
  try {
    var data = await apiCall('getAllPatrolSchedules', []);
    var tbody = document.getElementById('tbody-schedules');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada jadwal</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      return '<tr><td><strong>' + escapeHtml(d.hari || '-') + '</strong></td><td>' + escapeHtml(d.shift || '-') + '</td>' +
        '<td>' + escapeHtml(d.nama_personel || '-') + '</td><td>' + escapeHtml(d.jam_mulai || '-') + '</td>' +
        '<td>' + escapeHtml(d.jam_selesai || '-') + '</td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadChecklistData() {
  try {
    var data = await apiCall('getAllDailyChecklists', []);
    data = (data || []).slice(0, 20);
    var tbody = document.getElementById('tbody-checklist');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada data checklist</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_pekerjaan === 'Selesai' ? 'badge-green' : 'badge-red';
      return '<tr><td>' + formatTime(d.timestamp) + '</td><td>' + escapeHtml(d.nama_staf || '-') + '</td>' +
        '<td>' + escapeHtml(d.lokasi_area || '-') + '</td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_pekerjaan) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadAuditData() {
  try {
    var data = await apiCall('getAllAudits', []);
    data = (data || []).slice(0, 20);
    var tbody = document.getElementById('tbody-audit');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada data audit</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_kelayakan === 'Layak' ? 'badge-green' : 'badge-red';
      return '<tr><td>' + formatTime(d.timestamp) + '</td><td>' + escapeHtml(d.nama_auditor || '-') + '</td>' +
        '<td>' + escapeHtml(d.lokasi_area || '-') + '</td><td>⭐ ' + (d.skor_kebersihan || '-') + '/5</td>' +
        '<td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_kelayakan || '-') + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadGCData() {
  try {
    var data = await apiCall('getAllGCExecutions', []);
    data = (data || []).slice(0, 20);
    var tbody = document.getElementById('tbody-gc');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada data GC</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_eksekusi === 'Selesai' ? 'badge-green' : (d.status_eksekusi === 'In Progress' ? 'badge-amber' : 'badge-gray');
      return '<tr><td>' + escapeHtml(d.lokasi_area || '-') + '</td><td>' + escapeHtml(d.jenis_pekerjaan || '-') + '</td>' +
        '<td>' + escapeHtml(d.tanggal_target || '-') + '</td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_eksekusi) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadGuestBookingData() {
  try {
    var [kamar, bookingData] = await Promise.all([
      apiCall('getAllKamar', []),
      apiCall('getAllGuestBookings', [])
    ]);
    // Stats
    kamar = kamar || [];
    var tersedia = kamar.filter(function(k) { return k.status_kamar === 'Tersedia'; }).length;
    var terisi = kamar.filter(function(k) { return k.status_kamar === 'Terisi'; }).length;
    var el1 = document.getElementById('gb-tersedia');
    var el2 = document.getElementById('gb-terisi');
    if (el1) el1.textContent = tersedia;
    if (el2) el2.textContent = terisi;
    // Table
    var data = (bookingData || []).slice(0, 20);
    var tbody = document.getElementById('tbody-guestbooking');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada booking</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status === 'Aktif' ? 'badge-green' : (d.status === 'Check Out' ? 'badge-gray' : 'badge-amber');
      return '<tr><td>' + escapeHtml(d.kode_kamar || '-') + '</td><td><strong>' + escapeHtml(d.nama_tamu || '-') + '</strong></td>' +
        '<td>' + (d.tanggal_check_in || '-') + '</td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status) + '</span></td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadRoomStatusData() {
  try {
    var data = await apiCall('getAllKamar', []);
    var tbody = document.getElementById('tbody-roomstatus');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Belum ada data kamar</td></tr>'; return; }
    tbody.innerHTML = data.map(function(d) {
      var badgeCls = d.status_kamar === 'Tersedia' ? 'badge-green' : (d.status_kamar === 'Terisi' ? 'badge-red' : 'badge-amber');
      return '<tr><td><strong>' + escapeHtml(d.kode_kamar || '-') + '</strong></td><td><span class="badge ' + badgeCls + '">' + escapeHtml(d.status_kamar) + '</span></td>' +
        '<td>' + escapeHtml(d.kode_kos || '-') + '</td></tr>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function loadSurveyConfigData() {
  try {
    var config = await apiCall('getSurveyConfig', []);
    var el = document.querySelector('#page-surveyconfig .card-body');
    if (el) {
      var teams = (config.TEAMS || []).map(function(t) { return t.label || t.id; }).join(', ') || 'Belum diatur';
      var criteria = (config.CRITERIA || []).map(function(c) { return c.label || c.id; }).join(', ') || 'Belum diatur';
      el.innerHTML = '<div style="padding:20px"><strong>Tim:</strong> ' + escapeHtml(teams) + '<br><br><strong>Kriteria:</strong> ' + escapeHtml(criteria) + '</div>';
    }
  } catch(e) {
    var el = document.querySelector('#page-surveyconfig .card-body');
    if (el) el.innerHTML = '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px">Konfigurasi belum tersedia. Buat konfigurasi survey GA melalui halaman Survey GA.</div>';
  }
}