/**
 * ============================================================
 * API_Booking.gs — Modul Peminjaman Aset Mandiri (Zero Admin Approval)
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── ASSET BOOKING ──────────────────────────────────────────

/**
 * Auto-migrate Asset_Booking sheet: tambah kolom 'divisi' & 'konsumsi' jika belum ada
 * Dipanggil otomatis setiap kali booking dibuat/diupdate
 */
function ensureBookingSheetColumns() {
  try {
    var sheet = getSheet(CONFIG.SHEETS.ASSET_BOOKING);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var changed = false;
    
    // Tambah kolom 'divisi' setelah 'nama_peminjam' jika belum ada
    if (headers.indexOf('divisi') === -1) {
      var insertAfter = headers.indexOf('nama_peminjam');
      if (insertAfter >= 0) {
        sheet.insertColumnAfter(insertAfter + 1);
        sheet.getRange(1, insertAfter + 2).setValue('divisi');
        sheet.setColumnWidth(insertAfter + 2, 150);
        changed = true;
        Logger.log('Migrasi: kolom "divisi" ditambahkan.');
        // Re-read headers after insertion
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
    }
    
    // Tambah kolom 'konsumsi' sebelum 'status_booking' jika belum ada
    if (headers.indexOf('konsumsi') === -1) {
      var insertBefore = headers.indexOf('status_booking');
      if (insertBefore >= 0) {
        sheet.insertColumnBefore(insertBefore + 1);
        sheet.getRange(1, insertBefore + 1).setValue('konsumsi');
        sheet.setColumnWidth(insertBefore + 1, 100);
        changed = true;
        Logger.log('Migrasi: kolom "konsumsi" ditambahkan.');
      }
    }
    
    if (changed) {
      // Format header row
      var lastCol = sheet.getLastColumn();
      var headerRange = sheet.getRange(1, 1, 1, lastCol);
      headerRange.setBackground('#1a237e');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(10);
      headerRange.setHorizontalAlignment('center');
      Logger.log('Migrasi Asset_Booking selesai. Total kolom: ' + lastCol);
    }
    return changed;
  } catch (e) {
    Logger.log('Migrasi Asset_Booking error: ' + e.message);
    return false;
  }
}

/**
 * Jalankan fungsi ini SEKALI dari GAS Editor untuk migrasi manual
 */
function migrateAssetBookingManual() {
  var result = ensureBookingSheetColumns();
  Logger.log('Migrasi manual: ' + (result ? 'Kolom ditambahkan' : 'Tidak ada perubahan'));
  return result;
}

function checkAvailability(namaAset, waktuMulai, waktuSelesai, excludeBookingId) {
  try {
    var data = getDataFromSupabase('asset_booking', CONFIG.SHEETS.ASSET_BOOKING);
    var start = new Date(waktuMulai).getTime();
    var end = new Date(waktuSelesai).getTime();
    if (start >= end) throw new Error('Waktu mulai harus sebelum waktu selesai.');
    var conflicts = [];
    data.forEach(function(booking) {
      if (booking.status_booking !== 'Approved (Auto)') return;
      if (booking.nama_aset !== namaAset) return;
      if (excludeBookingId && booking.id_booking === excludeBookingId) return;
      var bStart = new Date(booking.waktu_mulai).getTime();
      var bEnd = new Date(booking.waktu_selesai).getTime();
      if (start < bEnd && end > bStart) {
        conflicts.push({ id_booking: booking.id_booking, nama_peminjam: booking.nama_peminjam, waktu_mulai: formatDateId(booking.waktu_mulai), waktu_selesai: formatDateId(booking.waktu_selesai) });
      }
    });
    return successResponse({ available: conflicts.length === 0, conflicts: conflicts });
  } catch (e) { return errorResponse(e.message); }
}

function saveBooking(payload) {
  try {
    var user = getActiveUserSession();
    if (!payload.nama_peminjam || !payload.nama_aset || !payload.waktu_mulai || !payload.waktu_selesai) throw new Error('Nama peminjam, nama aset, waktu mulai, dan waktu selesai wajib diisi.');
    var start = new Date(payload.waktu_mulai);
    var end = new Date(payload.waktu_selesai);
    if (start >= end) throw new Error('Waktu mulai harus sebelum waktu selesai.');
    if (start < now()) throw new Error('Waktu mulai tidak boleh di masa lampau.');
    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.ASSET_BOOKING);
      ensureBookingSheetColumns(); // pastikan kolom divisi & konsumsi ada
      var availResult = checkAvailability(payload.nama_aset, payload.waktu_mulai, payload.waktu_selesai, payload.id_booking || null);
      if (!availResult.success) throw new Error('Gagal memeriksa ketersediaan: ' + availResult.error);
      var isAvailable = availResult.data.available;
      if (payload.id_booking) {
        var found = findRow(CONFIG.SHEETS.ASSET_BOOKING, 'id_booking', payload.id_booking);
        if (!found) throw new Error('Booking tidak ditemukan.');
        updateRowCells(CONFIG.SHEETS.ASSET_BOOKING, found.rowIndex, {
          nama_peminjam: payload.nama_peminjam, divisi: payload.divisi || '', no_wa: payload.no_wa || '',
          nama_aset: payload.nama_aset, waktu_mulai: start, waktu_selesai: end,
          konsumsi: payload.konsumsi || 'Tidak',
          status_booking: isAvailable ? 'Approved (Auto)' : 'Rejected (Bentrok)',
          alasan_gagal: isAvailable ? '' : 'Jadwal bentrok dengan booking lain'
        });
        if (payload.no_wa) {
          try {
            sendBookingNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', payload.id_booking, payload.nama_aset, formatDateId(start), formatDateId(end), isAvailable ? 'Approved (Auto)' : 'Rejected (Bentrok)', isAvailable ? '' : 'Jadwal bentrok dengan booking lain');
            if (isAvailable) sendBookingReminderNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', payload.id_booking, payload.nama_aset, formatDateId(start), formatDateId(end));
          } catch (waErr) { Logger.log('WA Booking Update Notification Error: ' + waErr.message); }
        }
        return isAvailable ? successResponse({ id_booking: payload.id_booking }, 'Booking berhasil diperbarui dan disetujui otomatis.')
          : successResponse({ id_booking: payload.id_booking, rejected: true }, 'Peringatan: Booking diperbarui namun DITOLAK karena jadwal bentrok.');
      } else {
        var bookingId = generateSequentialId('BKG', CONFIG.SHEETS.ASSET_BOOKING, 'id_booking');
        var status = isAvailable ? 'Approved (Auto)' : 'Rejected (Bentrok)';
        var alasan = isAvailable ? '' : 'Jadwal bentrok dengan booking lain';
        sheet.appendRow([now(), bookingId, payload.nama_peminjam, payload.divisi || '', payload.no_wa || '', payload.nama_aset, start, end, payload.konsumsi || 'Tidak', status, alasan, payload.km_awal || '', '']);
        if (payload.no_wa) {
          try {
            sendBookingNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', bookingId, payload.nama_aset, formatDateId(start), formatDateId(end), status, alasan);
            if (isAvailable) sendBookingReminderNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', bookingId, payload.nama_aset, formatDateId(start), formatDateId(end));
          } catch (waErr) { Logger.log('WA Booking Notification Error: ' + waErr.message); }
        }
        return isAvailable ? successResponse({ id_booking: bookingId }, 'Booking "' + bookingId + '" disetujui otomatis!')
          : successResponse({ id_booking: bookingId, rejected: true }, 'Booking "' + bookingId + '" DITOLAK - jadwal bentrok.');
      }
    });
  } catch (e) { return errorResponse(e.message); }
}

function getAllBookings(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('asset_booking', CONFIG.SHEETS.ASSET_BOOKING);
    if (filters) {
      if (filters.status && filters.status !== 'Semua') data = data.filter(function(d) { return d.status_booking === filters.status; });
      if (filters.nama_aset && filters.nama_aset !== 'Semua') data = data.filter(function(d) { return d.nama_aset === filters.nama_aset; });
      if (filters.tanggal) data = data.filter(function(d) { return Utilities.formatDate(new Date(d.waktu_mulai), CONFIG.TIMEZONE, 'yyyy-MM-dd') === filters.tanggal; });
    }
    data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    data = data.map(function(d) {
      return { timestamp: formatDateId(d.timestamp), id_booking: d.id_booking, nama_peminjam: d.nama_peminjam, divisi: d.divisi || '', no_wa: d.no_wa, nama_aset: d.nama_aset, waktu_mulai: formatDateId(d.waktu_mulai), waktu_selesai: formatDateId(d.waktu_selesai), konsumsi: d.konsumsi || '', status_booking: d.status_booking, alasan_gagal: d.alasan_gagal, km_awal: d.km_awal, km_akhir: d.km_akhir };
    });
    return successResponse(data);
  } catch (e) { return errorResponse(e.message); }
}

function completeBooking(bookingId, kmData) {
  try {
    var user = getActiveUserSession();
    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.ASSET_BOOKING, 'id_booking', bookingId);
      if (!found) throw new Error('Booking tidak ditemukan.');
      if (found.data.status_booking !== 'Approved (Auto)') throw new Error('Hanya booking yang sudah disetujui yang bisa diselesaikan.');
      var updates = { status_booking: 'Completed' };
      if (kmData && kmData.km_akhir) updates.km_akhir = kmData.km_akhir;
      updateRowCells(CONFIG.SHEETS.ASSET_BOOKING, found.rowIndex, updates);
      if (found.data.no_wa) { try { sendBookingCompletedNotification(found.data.no_wa, found.data.nama_peminjam, bookingId, found.data.nama_aset); } catch (waErr) { Logger.log('WA Booking Completed Notification Error: ' + waErr.message); } }
      return successResponse(null, 'Booking berhasil diselesaikan.');
    });
  } catch (e) { return errorResponse(e.message); }
}

function cancelBooking(bookingId) {
  try {
    var user = getActiveUserSession();
    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.ASSET_BOOKING, 'id_booking', bookingId);
      if (!found) throw new Error('Booking tidak ditemukan.');
      updateRowCells(CONFIG.SHEETS.ASSET_BOOKING, found.rowIndex, { status_booking: 'Cancelled', alasan_gagal: 'Dibatalkan oleh ' + user.nama });
      return successResponse(null, 'Booking berhasil dibatalkan.');
    });
  } catch (e) { return errorResponse(e.message); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi Asset_Booking ke Supabase
 */


// ─── ASSET LIST ────────────────────────────────────────────

/**
 * [SUPABASE] Baca semua aset dari Supabase
 * Fallback ke Sheets jika Supabase belum dikonfigurasi
 */
function getAllAssetListFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'asset_list', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      // ✅ Data dari Supabase tidak kosong — pakai Supabase
      Logger.log('Supabase Asset_List: ' + result.length + ' aset ditemukan');
      return result.map(function(row) {
        return {
          kategori: row.kategori,
          nama_aset: row.nama_aset,
          detail_kapasitas: row.detail_kapasitas || '',
          status_operasional: row.status_operasional,
          _rowIndex: row.id
        };
      });
    }
    // ⚠️ Supabase kosong atau error — fallback ke Sheets
    Logger.log('Supabase Asset_List kosong/tidak tersedia, fallback ke Sheets');
    return getSheetData(CONFIG.SHEETS.ASSET_LIST);
  } catch (e) {
    Logger.log('Supabase error for Asset_List, fallback to Sheets: ' + e.message);
    return getSheetData(CONFIG.SHEETS.ASSET_LIST);
  }
}

/**
 * Baca semua aset — PRIORITAS Supabase, fallback Sheets
 */
function getAllAssetList() {
  try {
    var data = getAllAssetListFromSupabase();
    return successResponse(data);
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Baca aset yang tersedia — PRIORITAS Supabase, fallback Sheets
 */
function getAvailableAssets() {
  try {
    var data = getAllAssetListFromSupabase();
    return successResponse(data.filter(function(d) { return d.status_operasional === 'Tersedia'; }));
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Simpan/Update aset — LANGSUNG ke Supabase
 * _rowIndex = id di Supabase (untuk UPDATE), jika ada
 * 
 * NOTE: Tidak ada fallback ke Sheets untuk write karena 
 * _rowIndex di Supabase (id PK) ≠ row number di Sheets.
 */
function saveAssetList(payload) {
  try {
    var user = getActiveUserSession(); requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    if (!payload.kategori || !payload.nama_aset) throw new Error('Kategori dan nama aset wajib diisi.');
    
    var data = {
      kategori: payload.kategori,
      nama_aset: payload.nama_aset,
      detail_kapasitas: payload.detail_kapasitas || '',
      status_operasional: payload.status_operasional || 'Tersedia'
    };
    
    if (payload._rowIndex) {
      // UPDATE via Supabase PATCH
      var result = fetchSupabase('PATCH', 'asset_list', {
        query: 'id=eq.' + payload._rowIndex,
        data: data
      });
      if (result && result.success === false) throw new Error(result.error || 'Gagal update aset');
      return successResponse(null, 'Aset berhasil diperbarui.');
    } else {
      // CREATE via Supabase POST — return _rowIndex untuk frontend
      var result = fetchSupabase('POST', 'asset_list', { data: data });
      if (result && result.success === false) throw new Error(result.error || 'Gagal tambah aset');
      if (result && Array.isArray(result) && result.length > 0) {
        return successResponse({ _rowIndex: result[0].id }, 'Aset berhasil ditambahkan.');
      }
      return successResponse(null, 'Aset berhasil ditambahkan.');
    }
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Hapus aset — LANGSUNG dari Supabase
 * rowIndex = id di Supabase
 */
function deleteAssetItem(rowIndex) {
  try {
    var user = getActiveUserSession(); requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    var result = fetchSupabase('DELETE', 'asset_list', { query: 'id=eq.' + rowIndex });
    if (result && result.success === false) throw new Error(result.error || 'Gagal hapus aset');
    return successResponse(null, 'Aset berhasil dihapus.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Migrasi data Asset_List dari Google Sheets ke Supabase
 * Baca semua data dari Sheets → insert ke Supabase via REST API
 * AMAN: data lama di Sheets tetap utuh
 */


// ╔══════════════════════════════════════════════════════════╗
// ║    PUBLIC AVAILABILITY & BOOKING                         ║
// ╚══════════════════════════════════════════════════════════╝

function getPublicAssetsAvailability(tanggal) {
  try {
    if (!tanggal) tanggal = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Format tanggal tidak valid.');
    var dateParts = tanggal.split('-');
    var dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    if (isNaN(dateObj.getTime())) throw new Error('Tanggal tidak valid: ' + tanggal);
    var startOfDay = new Date(dateObj); startOfDay.setHours(0, 0, 0, 0);
    var endOfDay = new Date(dateObj); endOfDay.setHours(23, 59, 59, 999);
    var startTime = startOfDay.getTime(), endTime = endOfDay.getTime();
    var allAssets = getAllAssetListFromSupabase();
    var availableAssets = allAssets.filter(function(a) { return a.status_operasional === 'Tersedia'; });
    var allBookings = getDataFromSupabase('asset_booking', CONFIG.SHEETS.ASSET_BOOKING);
    var dayBookings = allBookings.filter(function(b) {
      if (b.status_booking !== 'Approved (Auto)') return false;
      var bStart = new Date(b.waktu_mulai).getTime(), bEnd = new Date(b.waktu_selesai).getTime();
      return bStart < endTime && bEnd > startTime;
    });
    var result = availableAssets.map(function(aset) {
      var conflicts = [];
      dayBookings.forEach(function(b) { if (b.nama_aset === aset.nama_aset) conflicts.push({ id_booking: b.id_booking, waktu_mulai: formatDateId(b.waktu_mulai), waktu_selesai: formatDateId(b.waktu_selesai), peminjam: b.nama_peminjam }); });
      return { nama_aset: aset.nama_aset, kategori: aset.kategori, detail_kapasitas: aset.detail_kapasitas || '', status_operasional: aset.status_operasional, tanggal: tanggal, available: conflicts.length === 0, total_conflicts: conflicts.length, slots: conflicts };
    });
    result.sort(function(a, b) { if (a.available !== b.available) return a.available ? -1 : 1; return a.kategori.localeCompare(b.kategori); });
    return successResponse({ tanggal: tanggal, total_aset: result.length, total_tersedia: result.filter(function(a) { return a.available; }).length, daftar_aset: result });
  } catch (e) { return errorResponse(e.message); }
}

function publicBooking(payload) {
  try {
    if (!payload || !payload.nama_peminjam || !payload.nama_aset || !payload.waktu_mulai || !payload.waktu_selesai) throw new Error('Nama peminjam, aset, waktu mulai, dan waktu selesai wajib diisi.');
    if (!payload.no_wa) throw new Error('Nomor WhatsApp wajib diisi.');
    payload.no_wa = normalizePhone(payload.no_wa);
    if (!payload.no_wa) throw new Error('Nomor WhatsApp tidak valid.');
    var start = new Date(payload.waktu_mulai), end = new Date(payload.waktu_selesai);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Format waktu tidak valid.');
    if (start >= end) throw new Error('Waktu mulai harus sebelum waktu selesai.');
    if (start < now()) throw new Error('Waktu mulai tidak boleh di masa lampau.');
    if ((end.getTime() - start.getTime()) > 86400000) throw new Error('Durasi peminjaman maksimal 24 jam.');
    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.ASSET_BOOKING);
      ensureBookingSheetColumns(); // pastikan kolom divisi & konsumsi ada
      var availResult = checkAvailability(payload.nama_aset, payload.waktu_mulai, payload.waktu_selesai, null);
      if (!availResult.success) throw new Error('Gagal memeriksa ketersediaan: ' + availResult.error);
      var isAvailable = availResult.data.available;
      var status = isAvailable ? 'Approved (Auto)' : 'Rejected (Bentrok)';
      var alasan = isAvailable ? '' : 'Jadwal bentrok dengan booking lain';
      var bookingId = generateSequentialId('BKG', CONFIG.SHEETS.ASSET_BOOKING, 'id_booking');
      sheet.appendRow([now(), bookingId, payload.nama_peminjam, payload.divisi || '', payload.no_wa, payload.nama_aset, start, end, payload.konsumsi || 'Tidak', status, alasan, payload.km_awal || '', '']);
      try {
        sendBookingNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', bookingId, payload.nama_aset, formatDateId(start), formatDateId(end), status, alasan);
        if (isAvailable) sendBookingReminderNotification(payload.no_wa, payload.nama_peminjam, payload.divisi || '', bookingId, payload.nama_aset, formatDateId(start), formatDateId(end));
      } catch (waErr) { Logger.log('WA Public Booking Notification Error: ' + waErr.message); }
      if (isAvailable) return successResponse({ id_booking: bookingId }, 'Booking "' + bookingId + '" berhasil! Cek WhatsApp.');
      else return successResponse({ id_booking: bookingId, rejected: true }, 'Maaf, jadwal sudah dibooking orang lain.');
    });
  } catch (e) { return errorResponse(e.message); }
}

function sendAvailabilityLink(phone) {
  try {
    var user = getActiveUserSession();
    if (!phone) throw new Error('Nomor WhatsApp tujuan wajib diisi.');
    phone = normalizePhone(phone);
    if (!phone) throw new Error('Nomor WhatsApp tidak valid.');
    var scriptUrl = ScriptApp.getService().getUrl();
    var linkUrl = scriptUrl + '?page=cek-aset&wa=' + encodeURIComponent(phone);
    var message = 'CEK KETERSEDIAAN ASET\n==========================\n\nHalo!\n\nKlik link berikut untuk cek ketersediaan aset kantor:\n' + linkUrl + '\n\nCara peminjaman:\n1. Klik link di atas\n2. Pilih aset yang tersedia\n3. Isi jadwal peminjaman\n4. Konfirmasi otomatis via WA\n\nTerima kasih!\n' + CONFIG.ORG_NAME;
    var result = sendWhatsApp(phone, message);
    if (result && result.status === true) return successResponse({ phone: phone, link: linkUrl }, 'Link berhasil dikirim ke ' + phone);
    else return successResponse({ phone: phone, link: linkUrl }, 'Link tersedia. Notifikasi WA: ' + (result ? JSON.stringify(result) : 'unknown'));
  } catch (e) { return errorResponse(e.message); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    PUBLIC PAGE HTML (Server-Side Rendered Cards)         ║
// ╚══════════════════════════════════════════════════════════╝

function generatePublicPageHtml(tanggal, wa, bookingResult) {
  var data = getPublicAssetsAvailability(tanggal);
  var dateStr = tanggal || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var waStr = wa || '';
  var scriptUrl = ScriptApp.getService().getUrl();
  var success = data && data.success;
  var info = data && data.data;
  var totalAset = info ? info.total_aset : 0;
  var totalTersedia = info ? info.total_tersedia : 0;
  var totalBooking = totalAset - totalTersedia;
  var daftar = (info && info.daftar_aset) || [];
  
  // Build summary HTML
  var summaryHtml = '<div class="summary-item"><div class="s-label">Total Aset</div><div class="s-val">' + totalAset + '</div></div><div class="summary-item"><div class="s-label">Tersedia</div><div class="s-val green">' + totalTersedia + '</div></div><div class="summary-item"><div class="s-label">Terbooking</div><div class="s-val amber">' + totalBooking + '</div></div>';
  
  // Build card HTML (server-side rendered)
  var cardsHtml = '';
  if (!success) {
    cardsHtml = '<div class="err">Gagal memuat data aset.</div>';
  } else if (daftar.length === 0) {
    cardsHtml = '<div class="err" style="color:#94a3b8">Belum ada aset tersedia untuk tanggal ini.</div>';
  } else {
    cardsHtml = '<div class="grid">';
    for (var i = 0; i < daftar.length; i++) {
      var x = daftar[i];
      var av = x.available;
      var cls = av ? 'avail' : 'booked';
      var stText = av ? 'Tersedia' : 'Terbooking';
      var detail = x.detail_kapasitas || '-';
      var nAset = x.nama_aset.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      var btnHtml = av ? '<button class="btn btn-sm btn-book" data-asset="' + nAset + '" onclick="showBook(this.dataset.asset)">Booking</button>' : '';
      cardsHtml += '<div class="card ' + cls + '"><div class="cat">' + (x.kategori || '') + '</div><div class="nm">' + x.nama_aset + '</div><div class="det">' + detail + '</div><div class="st ' + cls + '">' + stText + '</div>' + btnHtml + '</div>';
    }
    cardsHtml += '</div>';
  }
  
  // Build recent bookings table
  var recentBookingsHtml = '';
  try {
    var allBookings = getDataFromSupabase('asset_booking', CONFIG.SHEETS.ASSET_BOOKING);
    // Sort by timestamp descending (newest first)
    allBookings.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    // Limit to 5 rows for display, but allow scrolling for more
    var displayBookings = allBookings.slice(0, 5);
    var totalBookings = allBookings.length;
    
    if (displayBookings.length > 0) {
      recentBookingsHtml = '<div class="rbtable-wrap"><div class="rbtable-title">📋 Riwayat Peminjaman Terbaru</div><div class="rbtable-scroll"><table class="rbtable"><thead><tr><th>No</th><th>Peminjam</th><th>Divisi</th><th>Aset</th><th>Waktu</th><th>Status</th></tr></thead><tbody>';
      for (var bi = 0; bi < displayBookings.length; bi++) {
        var b = displayBookings[bi];
        var stCls = '';
        var stLbl = b.status_booking || '-';
        if (b.status_booking === 'Approved (Auto)') { stCls = 'rb-st-ok'; stLbl = '✅ Disetujui'; }
        else if (b.status_booking === 'Completed') { stCls = 'rb-st-cm'; stLbl = '✅ Selesai'; }
        else if (b.status_booking === 'Rejected (Bentrok)') { stCls = 'rb-st-rj'; stLbl = '❌ Ditolak'; }
        else if (b.status_booking === 'Cancelled') { stCls = 'rb-st-rj'; stLbl = '❌ Batal'; }
        var wkt = formatDateId(b.waktu_mulai) + ' - ' + formatDateId(b.waktu_selesai);
        recentBookingsHtml += '<tr><td>' + (bi + 1) + '</td><td>' + escapeHtml(b.nama_peminjam || '-') + '</td><td>' + escapeHtml(b.divisi || '-') + '</td><td>' + escapeHtml(b.nama_aset || '-') + '</td><td class="rb-wkt">' + wkt + '</td><td><span class="rb-st ' + stCls + '">' + stLbl + '</span></td></tr>';
      }
      recentBookingsHtml += '</tbody></table></div>';
      if (totalBookings > 5) {
        recentBookingsHtml += '<div class="rbtable-more">+' + (totalBookings - 5) + ' peminjaman lainnya</div>';
      }
      recentBookingsHtml += '</div>';
    }
  } catch (e) {
    Logger.log('Recent bookings table error: ' + e.message);
  }
  
  // Build result page (if booking was just submitted)
  var resultHtml = '';
  var showResult = false;
  if (bookingResult) {
    showResult = true;
    if (bookingResult.success) {
      var bId = (bookingResult.data && bookingResult.data.id_booking) || '';
      var bRejected = (bookingResult.data && bookingResult.data.rejected) || false;
      resultHtml = '<div class="result-pg"><div class="r-icon">' + (bRejected ? '&#x26A0;&#xFE0F;' : '&#x2705;') + '</div><div class="r-title">' + (bRejected ? 'Booking Ditolak' : 'Booking Berhasil!') + '</div><div class="r-sub">' + (bRejected ? 'Jadwal bentrok dengan booking lain' : 'Peminjaman aset Anda telah disetujui otomatis.') + '</div><div class="r-id">' + bId + '</div><div class="r-st ' + (bRejected ? 'r-rej' : 'r-app') + '">' + (bRejected ? 'Ditolak - jadwal bentrok' : 'Disetujui Otomatis') + '</div><div class="r-btn"><a class="btn btn-primary" href="' + scriptUrl + '?page=cek-aset">Kembali ke Daftar Aset</a></div></div>';
    } else {
      resultHtml = '<div class="result-pg"><div class="r-icon">&#x274C;</div><div class="r-title">Booking Gagal</div><div class="r-sub">' + (bookingResult.error || 'Terjadi kesalahan.') + '</div><div class="r-btn"><a class="btn btn-primary" href="' + scriptUrl + '?page=cek-aset">Coba Lagi</a></div></div>';
    }
  }
  
  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Cek Ketersediaan Aset | General Affair</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;line-height:1.6;min-height:100vh}\n.hdr{text-align:center;padding:28px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08)}\n.hdr .logo{width:50px;height:50px;margin:0 auto 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 20px rgba(99,102,241,.3)}\n.hdr h1{font-size:1.25rem;font-weight:700}\n.hdr p{color:#94a3b8;font-size:.8rem;margin-top:2px}\n.body{max-width:920px;margin:0 auto;padding:16px}\n.ctrl{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}\n.ctrl label{color:#cbd5e1;font-size:.8rem;font-weight:600}\n.dp{padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#e0e7ff;font-family:inherit;font-size:.85rem;outline:none}\n.dp:focus{border-color:#6366f1}\n.summary{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}\n.summary-item{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px;flex:1;min-width:120px;text-align:center}\n.s-label{color:#94a3b8;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px}\n.s-val{font-size:1.5rem;font-weight:800;margin-top:2px}\n.s-val.green{color:#34d399}\n.s-val.amber{color:#fbbf24}\n.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}\n.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;}\n.card.avail{border-left:3px solid #10b981}\n.card.booked{border-left:3px solid #ef4444}\n.cat{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#64748b;margin-bottom:4px}\n.nm{font-size:.9rem;font-weight:700;margin-bottom:4px}\n.det{font-size:.75rem;color:#94a3b8;margin-bottom:8px;line-height:1.5}\n.st{display:inline-block;font-size:.72rem;font-weight:600;padding:3px 10px;border-radius:12px;margin-bottom:8px}\n.st.avail{background:rgba(16,185,129,.15);color:#6ee7b7}\n.st.booked{background:rgba(239,68,68,.15);color:#fca5a5}\n.btn{display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:7px;font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer;border:none;transition:.25s;text-decoration:none}\n.btn:disabled{opacity:.5;cursor:not-allowed}\n.btn-primary{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff}\n.btn-primary:hover{filter:brightness(1.1)}\n.btn-book{background:linear-gradient(135deg,#10b981,#34d399);color:#fff;width:100%;justify-content:center}\n.btn-book:hover{filter:brightness(1.1)}\n.btn-outline{background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,.15)}\n.btn-outline:hover{background:rgba(255,255,255,.06)}\n.err{text-align:center;padding:40px 20px;color:#fca5a5;font-size:.9rem}\n.ftr{text-align:center;padding:20px;color:#475569;font-size:.72rem}\n/* Modal */\n.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;opacity:0;pointer-events:none;transition:.25s;padding:16px}\n.modal.show{opacity:1;pointer-events:auto}\n.mbox{background:#1e293b;border-radius:16px;width:100%;max-width:480px;max-height:85vh;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.5);transform:scale(.95);transition:.25s}\n.modal.show .mbox{transform:scale(1)}\n.mhead{padding:16px 20px;font-size:1rem;font-weight:700;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center}\n.mclose{background:none;border:none;font-size:1.3rem;color:#94a3b8;cursor:pointer;padding:2px 8px;border-radius:6px}\n.mclose:hover{background:rgba(239,68,68,.15);color:#fca5a5}\n.mbody{padding:20px;overflow-y:auto;max-height:55vh}\n.mfoot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;gap:8px}\n/* Form */\n.fg{margin-bottom:12px}\n.fl{display:block;font-size:.75rem;font-weight:600;color:#94a3b8;margin-bottom:4px}\n.fi{width:100%;padding:8px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#e0e7ff;font-family:inherit;font-size:.82rem;outline:none}\n.fi:focus{border-color:#6366f1}\n.fr{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n.ferr{display:none;background:rgba(239,68,68,.15);color:#fca5a5;padding:8px 12px;border-radius:8px;margin-top:8px;font-size:.8rem}\n/* Recent Bookings Table */\n.rbtable-wrap{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;margin:16px 0;overflow:hidden}\n.rbtable-title{padding:14px 16px 8px;font-size:.85rem;font-weight:700;color:#e0e7ff}\n.rbtable-scroll{max-height:280px;overflow-y:auto;overflow-x:auto}\n.rbtable{width:100%;border-collapse:collapse;font-size:.78rem;min-width:580px}\n.rbtable thead th{background:rgba(255,255,255,.06);color:#94a3b8;font-weight:600;font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;z-index:1}\n.rbtable tbody td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.05);color:#cbd5e1;vertical-align:middle}\n.rbtable tbody tr:hover{background:rgba(99,102,241,.08)}\n.rbtable tbody tr:last-child td{border-bottom:none}\n.rb-wkt{white-space:nowrap;font-size:.72rem;color:#94a3b8}\n.rb-st{display:inline-block;font-size:.7rem;font-weight:600;padding:2px 8px;border-radius:10px}\n.rb-st-ok{background:rgba(16,185,129,.15);color:#6ee7b7}\n.rb-st-cm{background:rgba(99,102,241,.15);color:#a5b4fc}\n.rb-st-rj{background:rgba(239,68,68,.15);color:#fca5a5}\n.rbtable-more{padding:8px 16px 12px;color:#64748b;font-size:.72rem;text-align:center;border-top:1px solid rgba(255,255,255,.05)}\n/* Result Page */\n.result-pg{text-align:center;padding:40px 20px}\n.r-icon{font-size:3rem;margin-bottom:12px}\n.r-title{font-size:1.2rem;font-weight:700;margin-bottom:4px}\n.r-sub{color:#94a3b8;font-size:.82rem;margin-bottom:4px}\n.r-id{display:inline-block;background:rgba(99,102,241,.15);color:#818cf8;padding:6px 18px;border-radius:8px;font-size:.95rem;font-weight:700;margin:10px 0 4px;letter-spacing:.5px}\n.r-st{margin-top:6px;font-size:.82rem;font-weight:600}\n.r-app{color:#6ee7b7}\n.r-rej{color:#fca5a5}\n.r-btn{margin-top:16px}\n@media(max-width:600px){.grid{grid-template-columns:1fr}.body{padding:12px}.hdr{padding:20px 12px 16px}.fr{grid-template-columns:1fr}}\n</style>\n</head>\n<body>\n<div class="hdr">\n<div class="logo">&#x1F3E2;</div>\n<h1>Cek Ketersediaan Aset</h1>\n<p>Peminjaman ruangan, kendaraan & peralatan kantor</p>\n<p style="margin-top:8px;font-size:.75rem;display:flex;gap:16px;justify-content:center;flex-wrap:wrap"><a href="' + scriptUrl + '?page=survey" style="color:#6366f1;text-decoration:none">📋 Survey GA</a><a href="' + scriptUrl + '?page=app" style="color:#6366f1;text-decoration:none">🔐 Admin Login</a></p>\n</div>\n<div class="body">\n' + (showResult ? resultHtml : '<div class="ctrl"><label>Tanggal:</label><input type="date" class="dp" id="tgl" value="' + dateStr + '"><button class="btn btn-primary" onclick="refreshPage()">Refresh</button></div><div class="summary">' + summaryHtml + '</div><div id="cards">' + cardsHtml + '</div>') + '\n' + recentBookingsHtml + '\n<div class="ftr">GA Operations &bull; General Affair</div>\n</div>\n<!-- Modal -->\n<div class="modal" id="modal"><div class="mbox"><div class="mhead"><span id="mtitle">Booking Aset</span><button class="mclose" onclick="closeModal()">&times;</button></div><div class="mbody" id="mbody"></div><div class="mfoot" id="mfoot"></div></div></div>\n<script>\nvar WA_NUM = "' + waStr.replace(/"/g, '&quot;').replace(/'/g, "\\'") + '";\nvar CUR_DT = ' + JSON.stringify(dateStr) + ';\nvar ASET = "";\nvar SCRIPT_URL = ' + JSON.stringify(scriptUrl) + ';\nfunction refreshPage(){var t=document.getElementById("tgl").value;window.top.location.href=SCRIPT_URL+"?page=cek-aset&date="+encodeURIComponent(t||CUR_DT)}\nfunction showBook(n){ASET=n;document.getElementById("mtitle").textContent="Booking "+n;var d=CUR_DT;document.getElementById("mbody").innerHTML=\'<p style="color:#94a3b8;margin-bottom:12px;font-size:.82rem;text-align:center">Booking: <strong>\'+n+\'</strong><br>tanggal <strong>\'+d+\'</strong></p><div class="fr"><div class="fg"><label class="fl">Nama Lengkap *</label><input class="fi" id="fn" placeholder="Nama Anda"></div><div class="fg"><label class="fl">Divisi *</label><input class="fi" id="fd" placeholder="Divisi/Departemen"></div></div><div class="fr"><div class="fg"><label class="fl">No. WA *</label><input class="fi" id="fw" placeholder="628xxx" value="\'+WA_NUM+\'"></div><div class="fg"><label class="fl">Konsumsi</label><select class="fi" id="fkonsumsi"><option value="">-- Pilih --</option><option value="Ya">Ya</option><option value="Tidak" selected>Tidak</option></select></div></div><div class="fr"><div class="fg"><label class="fl">Waktu Mulai *</label><input type="datetime-local" class="fi" id="fs"></div><div class="fg"><label class="fl">Waktu Selesai *</label><input type="datetime-local" class="fi" id="fe"></div></div><div class="fg"><label class="fl">KM Awal (kendaraan)</label><input type="number" class="fi" id="fk" placeholder="Optional"></div><div class="ferr" id="ferr"></div>\';document.getElementById("mfoot").innerHTML=\'<button class="btn btn-outline" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="bsb" onclick="submitBook()">Konfirmasi Booking</button>\';var nn=new Date;nn.setMinutes(0,0,0);var ss=new Date(nn.getTime()+36e5),ee=new Date(ss.getTime()+72e5);document.getElementById("fs").value=fmt(ss);document.getElementById("fe").value=fmt(ee);document.getElementById("modal").classList.add("show")}\nfunction fmt(d){var y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0"),h=String(d.getHours()).padStart(2,"0"),mi=String(d.getMinutes()).padStart(2,"0");return y+"-"+m+"-"+dd+"T"+h+":"+mi}\nfunction submitBook(){var n=document.getElementById("fn").value.trim(),dv=document.getElementById("fd").value.trim(),w=document.getElementById("fw").value.trim(),ks=document.getElementById("fkonsumsi").value,s=document.getElementById("fs").value,e=document.getElementById("fe").value,k=document.getElementById("fk").value.trim(),er=document.getElementById("ferr");er.style.display="none";if(!n){er.textContent="Nama lengkap wajib diisi.";er.style.display="block";return}if(!dv){er.textContent="Divisi wajib diisi.";er.style.display="block";return}if(!w){er.textContent="Nomor WhatsApp wajib diisi.";er.style.display="block";return}if(!s||!e){er.textContent="Waktu mulai dan selesai wajib diisi.";er.style.display="block";return}var b=document.getElementById("bsb");b.disabled=true;b.textContent="Memproses...";var d=document.getElementById("tgl").value||CUR_DT;window.top.location.href=SCRIPT_URL+"?page=cek-aset&book=1&date="+encodeURIComponent(d)+"&nama="+encodeURIComponent(n)+"&divisi="+encodeURIComponent(dv)+"&wa="+encodeURIComponent(w)+"&aset="+encodeURIComponent(ASET)+ "&konsumsi="+encodeURIComponent(ks||\'Tidak\')+"&mulai="+encodeURIComponent(s)+"&selesai="+encodeURIComponent(e)+"&km="+encodeURIComponent(k)}\nfunction closeModal(){document.getElementById("modal").classList.remove("show")}\n</script>\n</body>\n</html>';
}

function handlePublicApi(e) {
  try {
    var action = e.parameter.action;
    if (action === 'getAssets') {
      var tanggal = e.parameter.date || '';
      var result = getPublicAssetsAvailability(tanggal);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'book') {
      var payload = { nama_peminjam: e.parameter.nama || '', divisi: e.parameter.divisi || '', no_wa: e.parameter.wa || '', nama_aset: e.parameter.aset || '', waktu_mulai: e.parameter.mulai || '', waktu_selesai: e.parameter.selesai || '', konsumsi: e.parameter.konsumsi || 'Tidak', km_awal: e.parameter.km || '' };
      for (var key in payload) { if (payload[key] === undefined) payload[key] = ''; }
      var result = publicBooking(payload);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Action tidak dikenal: ' + action })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.message })).setMimeType(ContentService.MimeType.JSON); }
}
