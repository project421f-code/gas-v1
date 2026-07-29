async function renderDashboard(content) {
  content.innerHTML = renderSkeleton('dashboard');

  try {
    // Fetch stats in parallel
    var [assetsRes, bookingsRes, usersRes, kosRes, mainDataRes] = await Promise.all([
      supabase.from('asset_list').select('*', { count: 'exact', head: true }),
      supabase.from('asset_booking').select('*', { count: 'exact', head: true }).eq('status_booking', 'Pending'),
      supabase.from('user_list').select('*', { count: 'exact', head: true }),
      supabase.from('master_kos').select('*', { count: 'exact', head: true }),
      supabase.from('main_data').select('*', { count: 'exact', head: true }).eq('status', 'Open')
    ]);

    var totalAset = assetsRes.count || 0;
    var pendingBooking = bookingsRes.count || 0;
    var totalUser = usersRes.count || 0;
    var totalKos = kosRes.count || 0;
    var openMaintenance = mainDataRes.count || 0;

    content.innerHTML = renderDashboardHTML(totalAset, pendingBooking, totalUser, totalKos, openMaintenance);

    // Load recent bookings
    loadRecentBookings();

  } catch(e) {
    content.innerHTML = renderDashboardHTML(0, 0, 0, 0, 0) +
      '<div style="color:#f87171;text-align:center;padding:20px;font-size:0.85rem">Gagal memuat data: ' + e.message + '</div>';
    console.error(e);
  }
}

function renderDashboardHTML(totalAset, pendingBooking, totalUser, totalKos, openMaintenance) {
  return `
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-desc">Overview sistem manajemen operasional GA</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Aset</div>
        <div class="stat-value blue">${totalAset}</div>
        <div class="stat-sub">Aset terdaftar</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Booking Pending</div>
        <div class="stat-value orange">${pendingBooking}</div>
        <div class="stat-sub">Menunggu persetujuan</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pengguna</div>
        <div class="stat-value purple">${totalUser}</div>
        <div class="stat-sub">User aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Kos Terkelola</div>
        <div class="stat-value green">${totalKos}</div>
        <div class="stat-sub">Unit kos aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Maintenance Open</div>
        <div class="stat-value ${openMaintenance > 0 ? 'red' : 'green'}">${openMaintenance}</div>
        <div class="stat-sub">Tiket maintenance terbuka</div>
      </div>
    </div>
    <div class="quick-actions">
      <a class="action-card" href="javascript:void(0)" onclick="showPage('assets', document.querySelectorAll('.nav-item')[1])">
        <div class="action-icon">&#x1F4CB;</div>
        <div class="action-title">Cek Aset</div>
        <div class="action-desc">Lihat ketersediaan & booking aset</div>
      </a>
      <a class="action-card" href="javascript:void(0)" onclick="showPage('survey', null)">
        <div class="action-icon">&#x1F4CA;</div>
        <div class="action-title">Survey Kepuasan</div>
        <div class="action-desc">Lihat hasil survey GA</div>
      </a>
      <a class="action-card" href="javascript:void(0)" onclick="showPage('inbox', null)">
        <div class="action-icon">&#x1F4E8;</div>
        <div class="action-title">Pesanan Masuk</div>
        <div class="action-desc">Kelola booking aset & pemesanan</div>
      </a>
    </div>
    <div class="section-card">
      <div class="section-title">&#x1F4C5; Booking Terbaru</div>
      <div id="recent-bookings">' + renderSkeleton('table') + '</div>
    </div>
  `;
}

async function loadRecentBookings() {
  var el = document.getElementById('recent-bookings');
  if (!el) return;

  try {
    var res = await supabase.from('asset_booking').select('*').order('id', { ascending: false }).limit(5);
    if (res.error) throw res.error;

    var data = res.data || [];
    if (data.length === 0) {
      el.innerHTML = '<div style="color:#475569;font-size:0.78rem">Belum ada booking</div>';
      return;
    }

    el.innerHTML = data.map(function(b) {
      var dotClass = 'green';
      if (b.status_booking === 'Pending') dotClass = 'orange';
      else if (b.status_booking === 'Ditolak' || b.status_booking === 'Batal') dotClass = 'red';
      return '<div class="activity-item">' +
        '<div class="activity-dot ' + dotClass + '"></div>' +
        '<div class="activity-text"><strong>' + escapeHtml(b.nama_peminjam) + '</strong> — ' + escapeHtml(b.nama_aset) +
        '<br><span style="color:#475569">' + escapeHtml(b.status_booking) + '</span></div>' +
        '<div class="activity-time">' + formatTime(b.timestamp) + '</div>' +
        '</div>';
    }).join('');
  } catch(e) {
    if (el) el.innerHTML = '<div style="color:#f87171;font-size:0.78rem">Gagal memuat</div>';
  }
}

// ════════════════════════════════════════════════════════════
// PAGE: ASSETS — List Aset & Inspeksi Kendaraan
// ════════════════════════════════════════════════════════════
var _assetsTab = 'list';
var _inspectionData = [];

function switchAssetsTab(tab) {
  _assetsTab = tab;
  if (APP.currentPage === 'assets') {
    var content = document.getElementById('main-content');
    if (content) renderAssets(content);
  }
}

async function renderAssets(content) {
  content.innerHTML = renderSkeleton('stats');
  var html = '<div class="page-header"><div class="page-title">Ketersediaan Aset</div><div class="page-desc">Daftar aset & inspeksi kendaraan</div></div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
  [
    { key: 'list', label: '&#x1F4CB; Daftar Aset' },
    { key: 'inspection', label: '&#x1F697; Inspeksi Kendaraan' }
  ].forEach(function(t) {
    var active = t.key === _assetsTab;
    html += '<button onclick="switchAssetsTab(\'' + t.key + '\')" style="background:' + (active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)') + ';color:' + (active ? '#a5b4fc' : '#94a3b8') + ';border:1px solid ' + (active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)') + ';padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '600' : '500') + '">' + t.label + '</button>';
  });
  html += '</div>';

  try {
    if (_assetsTab === 'inspection') {
      var res = await supabase.from('asset_inspection').select('*').order('id', { ascending: false });
      if (res.error) throw res.error;
      _inspectionData = res.data || [];

      html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
      html += '<button onclick="showInspeksiForm()" style="background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">&#x2795; Tambah Inspeksi</button>';
      html += '</div>';

      html += '<div class="section-card"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem">';
      html += '<thead><tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06)">';
      html += '<th style="padding:8px;text-align:left">Bulan</th><th style="padding:8px;text-align:left">No. Polisi</th><th style="padding:8px;text-align:left">Jenis</th>';
      html += '<th style="padding:8px;text-align:left">Cek Fisik</th><th style="padding:8px;text-align:left">Cuci</th><th style="padding:8px;text-align:left">Petugas</th><th style="padding:8px;text-align:left">Aksi</th></tr></thead><tbody>';
      if (_inspectionData.length === 0) {
        html += '<tr><td colspan="7" style="text-align:center;padding:20px;color:#475569">Belum ada data inspeksi</td></tr>';
      } else {
        _inspectionData.forEach(function(d, i) {
          var fisikColor = d.status_cek_fisik === 'Done' ? '#34d399' : (d.status_cek_fisik === 'Pending' ? '#fb923c' : '#64748b');
          var cuciColor = d.status_pencucian === 'Done' ? '#34d399' : (d.status_pencucian === 'Pending' ? '#fb923c' : '#64748b');
          html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">';
          html += '<td style="padding:8px">' + escapeHtml(d.bulan_tahun || '-') + '</td>';
          html += '<td style="padding:8px"><strong>' + escapeHtml(d.no_polisi || '-') + '</strong></td>';
          html += '<td style="padding:8px">' + escapeHtml(d.jenis_tipe || '-') + '</td>';
          html += '<td style="padding:8px;color:' + fisikColor + '">' + escapeHtml(d.status_cek_fisik || 'Belum') + '</td>';
          html += '<td style="padding:8px;color:' + cuciColor + '">' + escapeHtml(d.status_pencucian || 'Belum') + '</td>';
          html += '<td style="padding:8px">' + escapeHtml(d.petugas || '-') + '</td>';
          html += '<td style="padding:8px"><button onclick="delInspeksi(' + i + ')" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.7rem">&#x2716;</button></td>';
          html += '</tr>';
        });
      }
      html += '</tbody></table></div></div>';
      content.innerHTML = html;
    } else {
      var res = await supabase.from('asset_list').select('*').order('id');
      if (res.error) throw res.error;
      var data = res.data || [];
      html += '<div class="stats-grid">';
      var tersedia = data.filter(function(a) { return a.status_operasional === 'Tersedia'; }).length;
      var dipakai = data.filter(function(a) { return a.status_operasional !== 'Tersedia'; }).length;
      html += '<div class="stat-card"><div class="stat-label">Tersedia</div><div class="stat-value green">' + tersedia + '</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Digunakan/Rusak</div><div class="stat-value red">' + dipakai + '</div></div>';
      html += '</div>';
      html += '<div class="section-card">';
      data.forEach(function(a) {
        var statusColor = a.status_operasional === 'Tersedia' ? '#34d399' : '#f87171';
        html += '<div class="activity-item"><div class="activity-dot" style="background:' + statusColor + '"></div><div class="activity-text"><strong>' + escapeHtml(a.nama_aset) + '</strong><br><span style="color:#64748b">' + escapeHtml(a.kategori) + ' — ' + escapeHtml(a.detail_kapasitas || '-') + '</span></div><div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(a.status_operasional) + '</div></div>';
      });
      html += '</div>';
      content.innerHTML = html;
    }
  } catch(e) {
    content.innerHTML = html + '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal: ' + e.message + '</div></div>';
  }
}

function showInspeksiForm() {
  var now = new Date();
  var bulanTahun = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  showFormModal('Tambah Inspeksi Kendaraan', [
    { id: 'f-ins-bulan', label: 'Bulan/Tahun *', type: 'text', value: bulanTahun },
    { id: 'f-ins-nopol', label: 'No. Polisi *', type: 'text', placeholder: 'B 1234 GA' },
    { id: 'f-ins-jenis', label: 'Jenis/Tipe', type: 'select', options: ['Mobil', 'Motor'], value: 'Mobil' },
    { id: 'f-ins-fisik', label: 'Status Cek Fisik', type: 'select', options: ['Belum', 'Done'], value: 'Belum' },
    { id: 'f-ins-cuci', label: 'Status Pencucian', type: 'select', options: ['Belum', 'Done'], value: 'Belum' },
    { id: 'f-ins-petugas', label: 'Petugas', type: 'text', value: APP.user ? APP.user.nama : '' }
  ], 'saveInspeksi()');
}

async function saveInspeksi() {
  var payload = {
    bulan_tahun: document.getElementById('f-ins-bulan').value.trim(),
    no_polisi: document.getElementById('f-ins-nopol').value.trim(),
    jenis_tipe: document.getElementById('f-ins-jenis').value,
    status_cek_fisik: document.getElementById('f-ins-fisik').value,
    status_pencucian: document.getElementById('f-ins-cuci').value,
    petugas: document.getElementById('f-ins-petugas').value.trim()
  };
  if (!payload.no_polisi || !payload.bulan_tahun) { showToast('No. Polisi dan Bulan wajib diisi', 'error'); return; }
  try {
    var res = await supabase.from('asset_inspection').insert(payload);
    if (res.error) throw res.error;
    showToast('Inspeksi berhasil disimpan!', 'success');
    hideFormModal();
    if (APP.currentPage === 'assets' && _assetsTab === 'inspection') renderAssets(document.getElementById('main-content'));
  } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function delInspeksi(i) {
  var d = _inspectionData[i];
  if (!d || !confirm('Hapus inspeksi ' + d.no_polisi + '?')) return;
  var res = await supabase.from('asset_inspection').delete().eq('id', d.id);
  if (res.error) { showToast('Gagal: ' + res.error.message, 'error'); return; }
  showToast('Inspeksi berhasil dihapus', 'success');
  if (APP.currentPage === 'assets' && _assetsTab === 'inspection') renderAssets(document.getElementById('main-content'));
}

// ════════════════════════════════════════════════════════════
// PAGE: SURVEY — Rating GA & Rating Tiket
// ════════════════════════════════════════════════════════════

