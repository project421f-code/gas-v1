function showKamarDetail(i) {
  var k = _guestKamarData[i];
  if (!k) return;
  var kos = _guestKosData.find(function(g) { return g.kode_kos === k.kode_kos; });
  showModal('Detail Kamar', [
    {label: 'Kode Kamar', value: k.kode_kamar},
    {label: 'Nama Kamar', value: k.nama_kamar},
    {label: 'Kos', value: kos ? kos.nama_kos : k.kode_kos},
    {label: 'Tipe', value: k.tipe_kamar},
    {label: 'Kapasitas', value: String(k.kapasitas) + ' orang'},
    {label: 'Harga Sewa', value: k.harga_sewa ? 'Rp ' + Number(k.harga_sewa).toLocaleString('id-ID') : '-'},
    {label: 'Status', value: k.status_kamar, highlight: true},
    {label: 'Keterangan', value: k.keterangan}
  ]);
}

async function renderGuests(content) {
  content.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px">Memuat data kos...</div>';
  try {
    var [kosRes, kamarRes, guestRes] = await Promise.all([
      supabase.from('master_kos').select('*').order('kode_kos'),
      supabase.from('master_kamar').select('*').order('kode_kamar'),
      supabase.from('guest_bookings').select('*').order('created_at', { ascending: false })
    ]);
    if (kosRes.error) throw kosRes.error;
    if (kamarRes.error) throw kamarRes.error;
    if (guestRes.error) throw guestRes.error;

    var kosList = kosRes.data || [];
    var kamarList = kamarRes.data || [];
    var guestList = guestRes.data || [];
    _guestKamarData = kamarList;
    _guestKosData = kosList;

    // Stats
    var totalKos = kosList.length;
    var totalKamar = kamarList.length;
    var terisi = kamarList.filter(function(k) { return k.status_kamar === 'Terisi'; }).length;
    var tersedia = kamarList.filter(function(k) { return k.status_kamar === 'Tersedia'; }).length;
    var tamuAktif = guestList.filter(function(g) { return g.status === 'Aktif'; }).length;

    var html = '<div class="page-header"><div class="page-title">Tamu Kos</div><div class="page-desc">Manajemen penghuni & status kamar</div></div>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total Kos</div><div class="stat-value blue">' + totalKos + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Total Kamar</div><div class="stat-value purple">' + totalKamar + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Terisi</div><div class="stat-value orange">' + terisi + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Tersedia</div><div class="stat-value green">' + tersedia + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Tamu Aktif</div><div class="stat-value green">' + tamuAktif + '</div></div>';
    html += '</div>';

    // Group kamar by kos
    kosList.forEach(function(kos) {
      var kamarKos = kamarList.filter(function(k) { return k.kode_kos === kos.kode_kos; });
      html += '<div class="section-card" style="margin-bottom:12px">';
      html += '<div class="section-title" style="margin-bottom:8px">' + escapeHtml(kos.nama_kos) + ' <span style="color:#64748b;font-size:0.75rem">(' + escapeHtml(kos.alamat || '-') + ')</span></div>';

      kamarKos.forEach(function(k) {
        var statusColor = k.status_kamar === 'Tersedia' ? '#34d399' : (k.status_kamar === 'Terisi' ? '#fb923c' : '#f87171');
        var guest = guestList.find(function(g) { return g.kode_kamar === k.kode_kamar && g.status === 'Aktif'; });
        var kamarIdx = kamarList.indexOf(k);

        html += '<div class="activity-item clickable" onclick="showKamarDetail(' + kamarIdx + ')">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(k.nama_kamar) + '</strong>';
        html += ' <span style="color:#64748b;font-size:0.75rem">(' + escapeHtml(k.tipe_kamar || 'Reguler') + ')</span>';
        if (guest) {
          html += '<br><span style="color:#e0e7ff">' + escapeHtml(guest.nama_tamu) + '</span>';
          html += ' <span style="color:#475569">| Check-in: ' + guest.tanggal_check_in + ' | Durasi: ' + escapeHtml(guest.durasi_sewa || '-') + '</span>';
        } else {
          html += '<br><span style="color:#475569">Kosong / ' + escapeHtml(k.status_kamar) + '</span>';
        }
        html += '</div>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(k.status_kamar) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });

    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Tamu Kos</div><div class="page-desc">Manajemen penghuni kos</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

// PAGE: MAINTENANCE — Tiket Perbaikan (main_data)
// ════════════════════════════════════════════════════════════
// ═══ KPI SECURITY — Functions ═══

async function renderMasterSLA(content) {
  content.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px">Memuat data SLA...</div>';
  try {
    var res = await supabase.from('master_sla').select('*').order('kategori').order('urgensi');
    if (res.error) throw res.error;
    var data = res.data || [];
    _slaData = data;

    var total = data.length;
    var low = data.filter(function(s) { return s.urgensi === 'Low'; }).length;
    var medium = data.filter(function(s) { return s.urgensi === 'Medium'; }).length;
    var high = data.filter(function(s) { return s.urgensi === 'High'; }).length;

    var html = '<div class="page-header"><div class="page-title">Master SLA</div><div class="page-desc">Target Service Level Agreement berdasarkan kategori & urgensi</div></div>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total SLA</div><div class="stat-value blue">' + total + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Low</div><div class="stat-value green">' + low + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Medium</div><div class="stat-value orange">' + medium + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">High</div><div class="stat-value red">' + high + '</div></div>';
    html += '</div>';

    html += '<div class="section-card">';
    html += '<div class="section-title">&#x23F0; Daftar SLA';
    html += ' <button onclick="showSLAForm()" style="margin-left:auto;' +
      'background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;' +
      'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">+ Tambah SLA</button>';
    html += '</div>';

    if (data.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data SLA</div>';
    } else {
      data.forEach(function(s, idx) {
        var urgColor = s.urgensi === 'Low' ? '#34d399' : (s.urgensi === 'Medium' ? '#fb923c' : '#f87171');
        var urgBadge = ' <span style="background:' + urgColor + '20;color:' + urgColor + ';padding:1px 10px;border-radius:8px;font-size:0.65rem;font-weight:600">' + s.urgensi + '</span>';

        html += '<div class="activity-item">';
        html += '<div class="activity-dot" style="background:' + urgColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(s.kategori) + '</strong>' + urgBadge;
        html += '<br><span style="color:#64748b">' + escapeHtml(s.sub_kategori || '-') + '</span>';
        html += '</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">';
        html += '<div style="text-align:right"><span style="color:#a5b4fc;font-size:1.1rem;font-weight:700">' + s.target_sla_jam + '</span> <span style="color:#64748b;font-size:0.7rem">jam</span></div>';
        html += '<button onclick="deleteSLA(' + s.id + ')" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:0.7rem">Hapus</button>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Master SLA</div><div class="page-desc">Target SLA</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

function showSLAForm() {
  var overlay = document.getElementById('modal-sla-overlay');
  if (!overlay) return;
  document.getElementById('sla-form').reset();
  document.getElementById('sla-form-title').textContent = 'Tambah SLA Baru';
  document.getElementById('f-sla-target').value = 24;
  document.getElementById('sla-error').style.display = 'none';
  overlay.classList.add('show');
}

async function saveSLAForm() {
  var overlay = document.getElementById('modal-sla-overlay');
  var btn = document.getElementById('btn-save-sla');
  var errorEl = document.getElementById('sla-error');

  var kategori = document.getElementById('f-sla-kat').value.trim();
  var sub_kategori = document.getElementById('f-sla-sub').value.trim();
  var urgensi = document.getElementById('f-sla-urg').value;
  var target_sla_jam = parseInt(document.getElementById('f-sla-target').value, 10);

  if (!kategori || !target_sla_jam || target_sla_jam < 1) {
    errorEl.textContent = 'Kategori dan Target SLA (min 1 jam) wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan...';

  try {
    var res = await supabase.from('master_sla').insert({
      kategori: kategori,
      sub_kategori: sub_kategori || '-',
      urgensi: urgensi,
      target_sla_jam: target_sla_jam
    });

    if (res.error) {
      if (res.error.message.includes('duplicate') || res.error.message.includes('unique')) {
        throw new Error('SLA untuk ' + kategori + ' / ' + sub_kategori + ' / ' + urgensi + ' sudah ada!');
      }
      throw res.error;
    }

    showToast('SLA ' + kategori + ' (' + urgensi + ') berhasil ditambahkan!', 'success');
    if (overlay) overlay.classList.remove('show');
    if (APP.currentPage === 'mastersla') {
      var content = document.getElementById('main-content');
      if (content) renderMasterSLA(content);
    }
  } catch(e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan';
  }
}

async function deleteSLA(id) {
  var item = _slaData.find(function(s) { return s.id === id; });
  if (!item) return;
  if (!confirm('Hapus SLA: ' + item.kategori + ' / ' + (item.sub_kategori || '-') + ' / ' + item.urgensi + '?')) return;

  var res = await supabase.from('master_sla').delete().eq('id', id);
  if (res.error) {
    showToast('Gagal hapus: ' + res.error.message, 'error');
  } else {
    showToast('SLA berhasil dihapus', 'success');
    if (APP.currentPage === 'mastersla') {
      var content = document.getElementById('main-content');
      if (content) renderMasterSLA(content);
    }
  }
}
// ════════════════════════════════════════════════════════════
// MISSING PAGES — Stub implementations
// ════════════════════════════════════════════════════════════

async function renderKPIMnt(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">KPI Maintenance</div><div class="page-desc">Performa teknisi maintenance</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CA; Performa Teknisi</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderKPIMnt(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Total Tiket</th><th>Selesai</th><th>% SLA</th><th>Rating</th><th>Skor</th></tr></thead>' +
    '<tbody id="tbody-kpimnt"><tr><td colspan="6" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadKPIMntData();
}

async function renderKPISec(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">KPI Security</div><div class="page-desc">Performa anggota security</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CA; Performa Security</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderKPISec(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Shift</th><th>% Patroli</th><th>Inspeksi</th><th>Insiden</th><th>Skor</th></tr></thead>' +
    '<tbody id="tbody-kpisec"><tr><td colspan="6" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadKPISecData();
}

async function renderKPIHK(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">KPI Housekeeping</div><div class="page-desc">Performa staf housekeeping</div></div>' +
    '<div class="stats-grid" id="hk-stats"><div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon">&#x2705;</div><div class="stat-card-label">CS Compliance</div></div><div class="stat-value" id="hk-daily-rate">-</div></div>' +
    '<div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon">&#x1F9F9;</div><div class="stat-card-label">GC Compliance</div></div><div class="stat-value" id="hk-gc-rate">-</div></div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CA; Per Staf</div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Tim</th><th>Checklist</th><th>On Time</th><th>% Compl</th><th>Audit</th></tr></thead>' +
    '<tbody id="tbody-kpihk"><tr><td colspan="6" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadKPIHKData();
}

async function renderCheckpoints(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Checkpoint</div><div class="page-desc">Titik patroli security</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CD; Daftar Checkpoint</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderCheckpoints(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>ID Pos</th><th>Nama Pos</th><th>Area</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-checkpoints"><tr><td colspan="4" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadCheckpointsData();
}

async function renderSchedules(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Jadwal</div><div class="page-desc">Jadwal patroli security</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4C5; Jadwal Patroli</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderSchedules(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Hari</th><th>Shift</th><th>Personel</th><th>Jam Mulai</th><th>Jam Selesai</th></tr></thead>' +
    '<tbody id="tbody-schedules"><tr><td colspan="5" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadSchedulesData();
}

async function renderBooking(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Peminjaman Aset</div><div class="page-desc">Daftar booking aset</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4C5; Daftar Booking</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderBooking(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Peminjam</th><th>Aset</th><th>Mulai</th><th>Selesai</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-booking"><tr><td colspan="5" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadBookingData();
}

var _slaData = [];
var _assetListData = [];

async function renderAssetList(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Aset</div><div class="page-desc">Daftar aset kantor</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4E6; Daftar Aset</div><div class="card-actions">' +
    '<button class="btn btn-primary btn-sm" onclick="showAssetForm()">&#x2795; Tambah Aset</button>' +
    '<button class="btn btn-outline btn-sm" onclick="renderAssetList(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Kategori</th><th>Nama Aset</th><th>Detail</th><th>Status</th><th>Aksi</th></tr></thead>' +
    '<tbody id="tbody-assetlist"><tr><td colspan="5" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadAssetListData();
}

async function renderChecklist(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Checklist Harian</div><div class="page-desc">Checklist cleaning service</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x2705; Checklist</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderChecklist(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Timestamp</th><th>Staf</th><th>Lokasi</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-checklist"><tr><td colspan="4" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadChecklistData();
}

async function renderAudit(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Audit Kebersihan</div><div class="page-desc">Supervisi kebersihan</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F50D; Data Audit</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderAudit(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Timestamp</th><th>Auditor</th><th>Lokasi</th><th>Skor</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-audit"><tr><td colspan="5" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadAuditData();
}

async function renderGeneralCleaning(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">General Cleaning</div><div class="page-desc">Jadwal cleaning</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F9F9; Jadwal GC</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderGeneralCleaning(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Lokasi</th><th>Jenis</th><th>Target</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-gc"><tr><td colspan="4" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadGCData();
}

async function renderMasterKos(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Kos</div><div class="page-desc">Daftar tempat kos</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F3E0; Daftar Kos</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderMasterKos(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama Kos</th><th>Jml Kamar</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-masterkos"><tr><td colspan="4" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadMasterKosData();
}

async function renderMasterKamar(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Master Kamar</div><div class="page-desc">Daftar kamar per kos</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F6AA; Daftar Kamar</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderMasterKamar(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Kamar</th><th>Kos</th><th>Tipe</th><th>Harga</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-masterkamar"><tr><td colspan="5" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadMasterKamarData();
}

async function renderGuestBooking(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Guest Booking</div><div class="page-desc">Check in / check out tamu</div></div>' +
    '<div class="stats-grid" id="gb-stats"><div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon">&#x1F7E2;</div><div class="stat-card-label">Kamar Tersedia</div></div><div class="stat-value" id="gb-tersedia">-</div></div>' +
    '<div class="stat-card red"><div class="stat-card-header"><div class="stat-card-icon">&#x1F534;</div><div class="stat-card-label">Kamar Terisi</div></div><div class="stat-value" id="gb-terisi">-</div></div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4C5; Data Booking</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderGuestBooking(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Kamar</th><th>Tamu</th><th>Check In</th><th>Status</th></tr></thead>' +
    '<tbody id="tbody-guestbooking"><tr><td colspan="4" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadGuestBookingData();
}

async function renderRoomStatus(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Status Kamar</div><div class="page-desc">Monitoring status kamar</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F504; Status Kamar</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderRoomStatus(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body no-pad"><div class="table-wrap"><table><thead><tr><th>Kamar</th><th>Status</th><th>Kos</th></tr></thead>' +
    '<tbody id="tbody-roomstatus"><tr><td colspan="3" class="table-empty">Memuat...</td></tr></tbody></table></div></div></div>';
  loadRoomStatusData();
}

async function renderSurveyConfig(content) {
  content.innerHTML = '<div class="page-header"><div class="page-title">Konfigurasi Survey</div><div class="page-desc">Atur tim & kriteria survey GA</div></div>' +
    '<div class="card"><div class="card-header"><div class="card-title">&#x1F4CB; Konfigurasi</div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="renderSurveyConfig(document.getElementById(\'main-content\'))">&#x1F504; Refresh</button></div></div>' +
    '<div class="card-body" style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px">' +
    'Halaman konfigurasi survey GA. Atur tim yang dinilai dan kriteria penilaian.</div></div>';
  loadSurveyConfigData();
}

// ════════════════════════════════════════════════════════════
// DATA LOADING HELPERS — Unique functions (not duplicated in data-crud.js)
// ════════════════════════════════════════════════════════════

async function loadKPISecData() {
  try {
    var [patrolRes, inspeksiRes] = await Promise.all([
      supabase.from('patrol_log').select('*').order('id', { ascending: false }).limit(100),
      supabase.from('asset_inspection').select('*').order('id', { ascending: false }).limit(50)
    ]);
    if (patrolRes.error) throw patrolRes.error;
    var patrolData = patrolRes.data || [];
    var inspeksiData = (inspeksiRes.error || !inspeksiRes.data) ? [] : inspeksiRes.data;

    var tbody = document.getElementById('tbody-kpisec');
    if (!tbody) return;

    var byPetugas = {};
    patrolData.forEach(function(p) {
      var name = p.petugas || p.nama_petugas || 'Tidak diketahui';
      if (!byPetugas[name]) byPetugas[name] = { patroli: 0, inspeksi: 0, insiden: 0 };
      byPetugas[name].patroli++;
    });
    inspeksiData.forEach(function(i) {
      var name = i.petugas || 'Tidak diketahui';
      if (!byPetugas[name]) byPetugas[name] = { patroli: 0, inspeksi: 0, insiden: 0 };
      byPetugas[name].inspeksi++;
    });

    var keys = Object.keys(byPetugas);
    if (keys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada data patroli</td></tr>';
      return;
    }
    tbody.innerHTML = keys.map(function(name) {
      var d = byPetugas[name];
      var skor = Math.min(100, d.patroli * 10 + d.inspeksi * 5);
      return '<tr><td data-label="Nama">' + escapeHtml(name) + '</td><td data-label="Shift">-</td><td data-label="% Patroli">' + d.patroli + 'x</td><td data-label="Inspeksi">' + d.inspeksi + '</td><td data-label="Insiden">' + d.insiden + '</td><td data-label="Skor"><strong>' + skor + '</strong></td></tr>';
    }).join('');
  } catch(e) {
    var el = document.getElementById('tbody-kpisec');
    if (el) el.innerHTML = '<tr><td colspan="6" class="table-empty" style="color:#f87171">Gagal: ' + e.message + '</td></tr>';
    console.error(e);
  }
}
