// ════════════════════════════════════════════════════════════
// PUBLIC BOOKING PAGE — No login required
// ════════════════════════════════════════════════════════════

function initPublicPage() {
  hideLoading();
  var el = document.getElementById('public-booking-page');
  if (el) el.style.display = 'block';
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('pub-tanggal').value = yyyy + '-' + mm + '-' + dd;
  loadPublicAvailability();
}

async function loadPublicAvailability() {
  var tanggal = document.getElementById('pub-tanggal').value;
  var content = document.getElementById('pub-content');
  if (!content) return;
  content.innerHTML = '<div class="pub-loading" style="text-align:center;padding:40px;color:#64748b">&#x1F504; Memuat daftar aset...</div>';

  try {
    // Ketersediaan aset dihitung di backend GAS (aksi publik, tanpa login)
    var data = await apiCall('getPublicAssetsAvailability', [tanggal]);
    renderPublicAssetGrid(data);
  } catch(e) {
    if (content) content.innerHTML = '<div class="pub-error" style="text-align:center;padding:40px;color:#f87171">&#x274C; Gagal memuat: ' + escapeHtml(e.message) + '</div>';
    console.error(e);
  }
}

function renderPublicAssetGrid(data) {
  var content = document.getElementById('pub-content');
  document.getElementById('pub-total-aset').textContent = data.total_aset || 0;
  document.getElementById('pub-total-tersedia').textContent = data.total_tersedia || 0;
  document.getElementById('pub-total-booked').textContent = (data.total_aset || 0) - (data.total_tersedia || 0);

  var daftar = data.daftar_aset || [];
  if (daftar.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">&#x1F4ED; Belum ada aset yang tersedia untuk tanggal ini.</div>';
    return;
  }

  var html = '<div class="pub-grid">';
  daftar.forEach(function(aset) {
    var isAvail = aset.available;
    var statusClass = isAvail ? 'available' : 'booked';
    var statusText = isAvail ? '&#x1F7E2; Tersedia' : '&#x1F534; Terbooking';
    var btnHtml = isAvail
      ? '<button class="btn btn-success btn-sm" onclick="showPubBookingForm(\'' + escapeHtml(aset.nama_aset) + '\')">&#x1F4C5; Booking</button>'
      : '';

    var slotsHtml = '';
    if (aset.slots && aset.slots.length > 0) {
      slotsHtml = '<div class="pub-asset-slots" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">';
      aset.slots.forEach(function(slot) {
        slotsHtml += '<div style="font-size:0.72rem;color:#94a3b8;padding:2px 0">&#x1F534; ' + escapeHtml(slot.waktu_mulai) + ' - ' + escapeHtml(slot.waktu_selesai) + ' (' + escapeHtml(slot.peminjam) + ')</div>';
      });
      slotsHtml += '</div>';
    }

    html += '<div class="pub-asset-card ' + statusClass + '">' +
      '<div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;margin-bottom:4px">' + escapeHtml(aset.kategori) + '</div>' +
      '<div style="font-size:0.9rem;font-weight:700;color:#e0e7ff;margin-bottom:4px">' + escapeHtml(aset.nama_aset) + '</div>' +
      '<div style="font-size:0.78rem;color:#94a3b8;margin-bottom:10px">' + escapeHtml(aset.detail_kapasitas || '-') + '</div>' +
      '<div class="pub-asset-status ' + statusClass + '" style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:600;padding:4px 10px;border-radius:20px;margin-bottom:10px;background:' + (isAvail ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') + ';color:' + (isAvail ? '#6ee7b7' : '#fca5a5') + '">' + statusText + '</div>' +
      btnHtml +
      slotsHtml +
      '</div>';
  });
  html += '</div>';
  content.innerHTML = html;
}

function showPubBookingForm(namaAset) {
  var params = getUrlParams();
  var waNumber = params.wa || '';
  var tanggal = document.getElementById('pub-tanggal').value;

  var body =
    '<p style="color:#94a3b8;margin-bottom:16px;font-size:0.85rem">' +
    'Booking aset: <strong>' + escapeHtml(namaAset) + '</strong> pada tanggal <strong>' + escapeHtml(tanggal) + '</strong></p>' +
    '<div class="login-form-group">' +
      '<label class="login-label">Nama Lengkap *</label>' +
      '<input type="text" class="login-input" id="f-pub-nama" placeholder="Masukkan nama Anda">' +
    '</div>' +
    '<div class="login-form-group">' +
      '<label class="login-label">No. WhatsApp *</label>' +
      '<input type="text" class="login-input" id="f-pub-wa" placeholder="628xxx" value="' + escapeHtml(waNumber) + '">' +
    '</div>' +
    '<div class="login-form-group">' +
      '<label class="login-label">Waktu Mulai *</label>' +
      '<input type="datetime-local" class="login-input" id="f-pub-start">' +
    '</div>' +
    '<div class="login-form-group">' +
      '<label class="login-label">Waktu Selesai *</label>' +
      '<input type="datetime-local" class="login-input" id="f-pub-end">' +
    '</div>' +
    '<div id="pub-booking-error" style="display:none;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 14px;color:#fca5a5;font-size:0.82rem;margin-top:12px"></div>';

  var overlay = document.getElementById('modal-pub');
  document.getElementById('modal-pub-title').textContent = '📅 Booking ' + namaAset;
  document.getElementById('modal-pub-body').innerHTML = body;
  document.getElementById('modal-pub-footer').innerHTML =
    '<button class="login-btn" style="flex:1;background:rgba(255,255,255,0.06);color:#94a3b8" onclick="closePubModal()">Batal</button>' +
    '<button class="login-btn login-btn-primary" id="btn-pub-booking" style="flex:1" onclick="submitPubBooking(\'' + escapeHtml(namaAset) + '\')">&#x1F4C5; Konfirmasi Booking</button>';
  overlay.classList.add('show');

  // Set default times
  var now = new Date();
  now.setMinutes(0, 0, 0);
  var startDefault = new Date(now.getTime() + 60 * 60 * 1000);
  var endDefault = new Date(startDefault.getTime() + 2 * 60 * 60 * 1000);
  document.getElementById('f-pub-start').value = formatLocalDatetime(startDefault);
  document.getElementById('f-pub-end').value = formatLocalDatetime(endDefault);
}

async function submitPubBooking(namaAset) {
  var nama = document.getElementById('f-pub-nama').value.trim();
  var wa = document.getElementById('f-pub-wa').value.trim();
  var start = document.getElementById('f-pub-start').value;
  var end = document.getElementById('f-pub-end').value;
  var errorEl = document.getElementById('pub-booking-error');

  errorEl.style.display = 'none';

  if (!nama) { showPubError('Nama lengkap wajib diisi.'); return; }
  if (!wa) { showPubError('Nomor WhatsApp wajib diisi.'); return; }
  if (!start || !end) { showPubError('Waktu mulai dan selesai wajib diisi.'); return; }

  var btn = document.getElementById('btn-pub-booking');
  btn.disabled = true;
  btn.innerHTML = '⏳ Memproses...';

  try {
    // Booking via backend GAS — otomatis cek bentrok + kirim notifikasi WA
    var data = await apiCall('publicBooking', [{
      nama_peminjam: nama,
      no_wa: wa,
      nama_aset: namaAset,
      waktu_mulai: new Date(start).toISOString(),
      waktu_selesai: new Date(end).toISOString(),
      konsumsi: 'Tidak'
    }]);

    if (data && data.rejected) {
      btn.disabled = false;
      btn.innerHTML = '📅 Konfirmasi Booking';
      showPubError('Maaf, jadwal sudah dibooking orang lain.');
      return;
    }

    btn.innerHTML = '✅ Berhasil!';
    showToast('Booking ' + namaAset + ' berhasil dikirim!', 'success');
    setTimeout(function() {
      closePubModal();
      loadPublicAvailability();
    }, 1500);

  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = '📅 Konfirmasi Booking';
    showPubError('Gagal: ' + e.message);
    console.error(e);
  }
}

function showPubError(msg) {
  var el = document.getElementById('pub-booking-error');
  if (el) {
    el.textContent = '❌ ' + msg;
    el.style.display = 'block';
  }
}

function closePubModal() {
  var overlay = document.getElementById('modal-pub');
  if (overlay) overlay.classList.remove('show');
}
