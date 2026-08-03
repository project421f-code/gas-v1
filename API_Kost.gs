/**
 * ============================================================
 * API_Kost.gs — Modul Manajemen Kost (Master Kos & Kamar)
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── MASTER KOS ─────────────────────────────────────────────

/**
 * Mendapatkan semua data kos — PRIORITAS Supabase
 */
function getAllKos() {
  try {
    var data = getDataFromSupabase('master_kos', CONFIG.SHEETS.MASTER_KOS, 'kode_kos', 'asc');
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan data kos — PRIORITAS Supabase
 */
function saveKos(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (!payload.nama_kos) {
      throw new Error('Nama kos wajib diisi.');
    }

    var data = {
      kode_kos: payload.kode_kos || '',
      nama_kos: payload.nama_kos,
      alamat: payload.alamat || '',
      jumlah_kamar: parseInt(payload.jumlah_kamar, 10) || 0,
      status: payload.status || 'Aktif'
    };

    if (payload._rowIndex) {
      // UPDATE via Supabase (id)
      var result = fetchSupabase('PATCH', 'master_kos', {
        query: 'id=eq.' + payload._rowIndex,
        data: data
      });
      if (result && result.success === false) throw new Error(result.error);
      return successResponse(null, 'Data kos berhasil diperbarui.');
    } else {
      // CREATE — generate kode_kos otomatis
      if (!data.kode_kos) {
        data.kode_kos = generateSupabaseSequentialId('KOS', 'master_kos', 'kode_kos', CONFIG.SHEETS.MASTER_KOS);
      }
      var result = fetchSupabase('POST', 'master_kos', { data: data });
      if (result && result.success === false) throw new Error(result.error);
      return successResponse({ kode_kos: data.kode_kos }, 'Kos "' + data.nama_kos + '" berhasil ditambahkan.');
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus data kos — PRIORITAS Supabase
 */
function deleteKos(rowIndex) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    // Hapus juga semua kamar di kos ini (CASCADE akan handle di Supabase)
    var result = fetchSupabase('DELETE', 'master_kos', {
      query: 'id=eq.' + rowIndex
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Data kos berhasil dihapus.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MASTER KAMAR ───────────────────────────────────────────

/**
 * Mendapatkan semua data kamar — PRIORITAS Supabase
 * Optional filter by kode_kos
 */
function getAllKamar(filterKos) {
  try {
    var query = 'order=kode_kamar.asc';
    if (filterKos) {
      query = 'kode_kos=eq.' + encodeURIComponent(filterKos) + '&order=kode_kamar.asc';
    }
    
    // Coba dari Supabase dulu
    try {
      var result = fetchSupabase('GET', 'master_kamar', { query: query });
      if (result && Array.isArray(result) && result.length > 0) {
        Logger.log('Supabase master_kamar: ' + result.length + ' entries');
        return successResponse(result);
      }
    } catch (e) {
      Logger.log('Supabase error master_kamar, fallback ke Sheets: ' + e.message);
    }

    // Fallback ke Sheets
    var data = getSheetData(CONFIG.SHEETS.MASTER_KAMAR);
    if (filterKos) {
      data = data.filter(function(d) { return d.kode_kos === filterKos; });
    }
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan daftar kamar berdasarkan kode_kos (untuk dropdown)
 */
function getKamarByKos(kodeKos) {
  try {
    if (!kodeKos) {
      return successResponse([]);
    }
    var allKamar = getAllKamar(kodeKos);
    if (allKamar.success && allKamar.data) {
      // Filter hanya yang Tersedia untuk keperluan booking
      return successResponse(allKamar.data);
    }
    return allKamar;
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan data kamar — PRIORITAS Supabase
 */
function saveKamar(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (!payload.kode_kos || !payload.nama_kamar) {
      throw new Error('Kos dan nama kamar wajib diisi.');
    }

    var data = {
      kode_kamar: payload.kode_kamar || '',
      kode_kos: payload.kode_kos,
      nama_kamar: payload.nama_kamar,
      tipe_kamar: payload.tipe_kamar || 'Reguler',
      kapasitas: parseInt(payload.kapasitas, 10) || 4,
      harga_sewa: parseFloat(payload.harga_sewa) || 0,
      status_kamar: payload.status_kamar || 'Tersedia',
      keterangan: payload.keterangan || ''
    };

    if (payload._rowIndex) {
      // UPDATE via Supabase (id)
      var result = fetchSupabase('PATCH', 'master_kamar', {
        query: 'id=eq.' + payload._rowIndex,
        data: data
      });
      if (result && result.success === false) throw new Error(result.error);
      return successResponse(null, 'Data kamar berhasil diperbarui.');
    } else {
      // CREATE — generate kode_kamar otomatis
      if (!data.kode_kamar) {
        data.kode_kamar = generateSupabaseSequentialId('KMR', 'master_kamar', 'kode_kamar', CONFIG.SHEETS.MASTER_KAMAR);
      }
      var result = fetchSupabase('POST', 'master_kamar', { data: data });
      if (result && result.success === false) throw new Error(result.error);

      // Update jumlah_kamar di master_kos
      try {
        var kosData = fetchSupabase('GET', 'master_kos', {
          query: 'kode_kos=eq.' + encodeURIComponent(data.kode_kos) + '&select=id,jumlah_kamar'
        });
        if (kosData && Array.isArray(kosData) && kosData.length > 0) {
          var newCount = (parseInt(kosData[0].jumlah_kamar, 10) || 0) + 1;
          fetchSupabase('PATCH', 'master_kos', {
            query: 'id=eq.' + kosData[0].id,
            data: { jumlah_kamar: newCount }
          });
        }
      } catch (e) {
        Logger.log('Gagal update jumlah_kamar di master_kos: ' + e.message);
      }

      return successResponse({ kode_kamar: data.kode_kamar }, 'Kamar "' + data.nama_kamar + '" berhasil ditambahkan.');
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus data kamar — PRIORITAS Supabase
 */
function deleteKamar(rowIndex, kodeKos) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    var result = fetchSupabase('DELETE', 'master_kamar', {
      query: 'id=eq.' + rowIndex
    });
    if (result && result.success === false) throw new Error(result.error);

    // Update jumlah_kamar di master_kos
    if (kodeKos) {
      try {
        var kosData = fetchSupabase('GET', 'master_kos', {
          query: 'kode_kos=eq.' + encodeURIComponent(kodeKos) + '&select=id,jumlah_kamar'
        });
        if (kosData && Array.isArray(kosData) && kosData.length > 0) {
          var newCount = Math.max(0, (parseInt(kosData[0].jumlah_kamar, 10) || 0) - 1);
          fetchSupabase('PATCH', 'master_kos', {
            query: 'id=eq.' + kosData[0].id,
            data: { jumlah_kamar: newCount }
          });
        }
      } catch (e) {
        Logger.log('Gagal update jumlah_kamar setelah hapus: ' + e.message);
      }
    }

    return successResponse(null, 'Data kamar berhasil dihapus.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MIGRASI KE SUPABASE ────────────────────────────────────

/**
 * Migrasi Master_Kos ke Supabase
 */


/**
 * Migrasi Master_Kamar ke Supabase
 */


// ╔══════════════════════════════════════════════════════════╗
// ║    SIKLUS KAMAR — Check In / Check Out / Turnover        ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Helper: Catat perubahan status kamar ke log
 */
function logRoomStatusChange(kodeKamar, statusSebelum, statusSesudah, pic, catatan) {
  try {
    var logData = {
      kode_kamar: kodeKamar,
      status_sebelum: statusSebelum,
      status_sesudah: statusSesudah,
      pic: pic || '',
      catatan: catatan || '',
      timestamp: nowFormatted()
    };
    // Simpan ke Supabase
    fetchSupabase('POST', 'room_status_log', { data: logData });
    // Juga simpan ke Sheets
    try {
      var sheet = getSheet(CONFIG.SHEETS.ROOM_STATUS_LOG);
      sheet.appendRow([kodeKamar, statusSebelum, statusSesudah, pic || '', catatan || '', nowFormatted()]);
    } catch (e) {
      Logger.log('Gagal simpan log ke Sheets: ' + e.message);
    }
  } catch (e) {
    Logger.log('Gagal logRoomStatusChange: ' + e.message);
  }
}

/**
 * CHECK IN — Catat tamu masuk, ubah status kamar jadi 'Terisi'
 * @param {Object} payload - { kode_kamar, nama_tamu, no_wa, durasi_sewa, harga_sewa, catatan }
 */
function checkInKamar(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!payload.kode_kamar || !payload.nama_tamu) {
      throw new Error('Kode kamar dan nama tamu wajib diisi.');
    }

    return withLock(function() {
      // Cek status kamar saat ini
      var kamarData = fetchSupabase('GET', 'master_kamar', {
        query: 'kode_kamar=eq.' + encodeURIComponent(payload.kode_kamar) + '&select=id,kode_kamar,status_kamar'
      });
      
      if (!kamarData || !Array.isArray(kamarData) || kamarData.length === 0) {
        throw new Error('Kamar tidak ditemukan.');
      }
      
      var kamar = kamarData[0];
      if (kamar.status_kamar !== 'Tersedia') {
        throw new Error('Kamar statusnya "' + kamar.status_kamar + '", tidak bisa check in. Hanya kamar Tersedia yang bisa di-check-in.');
      }

      // Generate ID Booking
      var bookingId = generateSupabaseSequentialId('BKG-KMR', 'guest_booking', 'id_booking', CONFIG.SHEETS.GUEST_BOOKING);

      // Simpan booking di Supabase
      var bookingData = {
        id_booking: bookingId,
        kode_kamar: payload.kode_kamar,
        nama_tamu: payload.nama_tamu,
        no_wa: payload.no_wa || '',
        durasi_sewa: payload.durasi_sewa || 'Bulanan',
        tanggal_check_in: new Date().toISOString().split('T')[0],
        tanggal_check_out: null,
        status: 'Aktif',
        harga_sewa: parseFloat(payload.harga_sewa) || 0,
        catatan: payload.catatan || ''
      };

      var result = fetchSupabase('POST', 'guest_booking', { data: bookingData });
      if (result && result.success === false) throw new Error(result.error);

      // Update status kamar jadi Terisi
      fetchSupabase('PATCH', 'master_kamar', {
        query: 'id=eq.' + kamar.id,
        data: { status_kamar: 'Terisi' }
      });

      // Catat log
      logRoomStatusChange(payload.kode_kamar, 'Tersedia', 'Terisi', user.nama, 'Check in - ' + payload.nama_tamu);

      // Simpan ke Sheets
      try {
        var sheet = getSheet(CONFIG.SHEETS.GUEST_BOOKING);
        sheet.appendRow([bookingId, payload.kode_kamar, payload.nama_tamu, payload.no_wa || '',
          payload.durasi_sewa || 'Bulanan', new Date().toISOString().split('T')[0], '',
          'Aktif', parseFloat(payload.harga_sewa) || 0, payload.catatan || '']);
      } catch (e) {
        Logger.log('Gagal simpan booking ke Sheets: ' + e.message);
      }

      return successResponse({ id_booking: bookingId }, '✅ Check in berhasil! ' + payload.nama_tamu + ' masuk kamar ' + payload.kode_kamar + '.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * CHECK OUT — Tamu keluar, ubah status kamar jadi 'Persiapan'
 * @param {string} bookingId - ID booking yang akan di-check-out
 * @param {string} catatan - Catatan check out
 */
function checkOutKamar(bookingId, catatan) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!bookingId) {
      throw new Error('ID Booking wajib diisi.');
    }

    return withLock(function() {
      // Cari booking
      var bookingData = fetchSupabase('GET', 'guest_booking', {
        query: 'id_booking=eq.' + encodeURIComponent(bookingId) + '&select=id,kode_kamar,status'
      });

      if (!bookingData || !Array.isArray(bookingData) || bookingData.length === 0) {
        throw new Error('Booking tidak ditemukan.');
      }

      var booking = bookingData[0];
      if (booking.status !== 'Aktif') {
        throw new Error('Booking statusnya "' + booking.status + '", bukan Aktif.');
      }

      var today = new Date().toISOString().split('T')[0];

      // Update booking
      fetchSupabase('PATCH', 'guest_booking', {
        query: 'id=eq.' + booking.id,
        data: { status: 'Check Out', tanggal_check_out: today }
      });

      // Update kamar jadi Persiapan
      fetchSupabase('PATCH', 'master_kamar', {
        query: 'kode_kamar=eq.' + encodeURIComponent(booking.kode_kamar),
        data: { status_kamar: 'Persiapan' }
      });

      // Catat log
      logRoomStatusChange(booking.kode_kamar, 'Terisi', 'Persiapan', user.nama, catatan || 'Check out');

      return successResponse(null, '✅ Check out berhasil! Kamar ' + booking.kode_kamar + ' sekarang dalam status Persiapan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * COMPLETE PREPARATION — Kamar selesai dibersihkan/dipersiapkan, status jadi 'Tersedia'
 * @param {string} kodeKamar - Kode kamar yang selesai dipersiapkan
 */
function completeRoomPreparation(kodeKamar) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!kodeKamar) {
      throw new Error('Kode kamar wajib diisi.');
    }

    return withLock(function() {
      // Validasi status kamar
      var kamarData = fetchSupabase('GET', 'master_kamar', {
        query: 'kode_kamar=eq.' + encodeURIComponent(kodeKamar) + '&select=id,status_kamar'
      });

      if (!kamarData || !Array.isArray(kamarData) || kamarData.length === 0) {
        throw new Error('Kamar tidak ditemukan.');
      }

      var kamar = kamarData[0];
      if (kamar.status_kamar !== 'Persiapan') {
        throw new Error('Kamar statusnya "' + kamar.status_kamar + '", bukan Persiapan. Tidak bisa diselesaikan.');
      }

      // Update jadi Tersedia
      fetchSupabase('PATCH', 'master_kamar', {
        query: 'id=eq.' + kamar.id,
        data: { status_kamar: 'Tersedia' }
      });

      // Catat log
      logRoomStatusChange(kodeKamar, 'Persiapan', 'Tersedia', user.nama, 'Persiapan selesai');

      return successResponse(null, '✅ Persiapan selesai! Kamar ' + kodeKamar + ' sekarang Tersedia.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── GETTERS ────────────────────────────────────────────────

/**
 * Mendapatkan semua booking aktif — PRIORITAS Supabase
 */
function getAllGuestBookings() {
  try {
    var data = getDataFromSupabase('guest_booking', CONFIG.SHEETS.GUEST_BOOKING, 'created_at', 'desc');
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan booking aktif (belum check out) — untuk display
 */
function getActiveGuestBookings() {
  try {
    var data = getDataFromSupabase('guest_booking', CONFIG.SHEETS.GUEST_BOOKING, 'created_at', 'desc');
    var active = data.filter(function(d) { return d.status === 'Aktif'; });
    return successResponse(active);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan riwayat log status kamar — PRIORITAS Supabase
 */
function getRoomStatusLog(filterKamar) {
  try {
    var query = 'order=timestamp.desc';
    if (filterKamar) {
      query = 'kode_kamar=eq.' + encodeURIComponent(filterKamar) + '&order=timestamp.desc';
    }
    
    try {
      var result = fetchSupabase('GET', 'room_status_log', { query: query });
      if (result && Array.isArray(result) && result.length > 0) {
        return successResponse(result);
      }
    } catch (e) {
      Logger.log('Supabase error room_status_log, fallback: ' + e.message);
    }

    var data = getSheetData(CONFIG.SHEETS.ROOM_STATUS_LOG);
    if (filterKamar) {
      data = data.filter(function(d) { return d.kode_kamar === filterKamar; });
    }
    data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan ringkasan status kamar (untuk dashboard/monitoring)
 */
function getKamarStatusSummary() {
  try {
    var kamarList = [];
    try {
      var result = fetchSupabase('GET', 'master_kamar', { query: 'order=kode_kamar.asc' });
      if (result && Array.isArray(result)) {
        kamarList = result;
      }
    } catch (e) {
      kamarList = getSheetData(CONFIG.SHEETS.MASTER_KAMAR);
    }

    var summary = {
      tersedia: 0,
      terisi: 0,
      persiapan: 0,
      perbaikan: 0,
      total: kamarList.length,
      details: kamarList
    };

    kamarList.forEach(function(k) {
      var s = (k.status_kamar || '').toLowerCase();
      if (s.indexOf('tersedia') >= 0) summary.tersedia++;
      else if (s.indexOf('terisi') >= 0) summary.terisi++;
      else if (s.indexOf('persiapan') >= 0) summary.persiapan++;
      else if (s.indexOf('perbaikan') >= 0) summary.perbaikan++;
    });

    return successResponse(summary);
  } catch (e) {
    return errorResponse(e.message);
  }
}


function getAllPersiapanKamar(filterStatus, limit, offset) {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    
    if (filterStatus && filterStatus !== 'Semua') {
      data = data.filter(function(d) { return d.status === filterStatus; });
    }
    
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 30);
    var kamarMap = {}, kosMap = {};
    kamarData.forEach(function(k) { kamarMap[k.kode_kamar] = k; });
    kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
    
    data = data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    
    data = data.map(function(d) {
      var kmr = kamarMap[d.kode_kamar] || {};
      return {
        id_persiapan: d.id_persiapan,
        kode_kamar: d.kode_kamar,
        kode_kos: d.kode_kos,
        nama_kamar: kmr.nama_kamar || '-',
        nama_kos: kosMap[d.kode_kos] || '-',
        jenis: d.jenis,
        assigned_to: d.assigned_to || '',
        status: d.status,
        catatan: d.catatan || '',
        timestamp: d.timestamp ? formatDateId(d.timestamp) : '-',
        selesai_pada: d.selesai_pada ? formatDateId(d.selesai_pada) : '-'
      };
    });
    
    // Default pagination: limit 50, offset 0
    var reqLimit = limit && !isNaN(limit) ? parseInt(limit) : 50;
    var reqOffset = offset && !isNaN(offset) ? parseInt(offset) : 0;
    var pagination = applyPagination(data, reqLimit, reqOffset);
    
    return successResponse({
      data: pagination.paginatedData,
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function createPersiapanKamar(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.kode_kamar || !payload.jenis) {
      throw new Error('Kamar dan jenis persiapan wajib diisi.');
    }

    return withLock(function() {
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', payload.kode_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');

      var sheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      var id = generateId('PREP');
      
      sheet.appendRow([
        id,
        payload.kode_kamar,
        kamarFound.data.kode_kos,
        payload.jenis,
        payload.assigned_to || '',
        'Pending',
        payload.catatan || '',
        now(),
        ''
      ]);

      // Update status kamar → Persiapan (kalau dari Tersedia atau Perbaikan)
      if (kamarFound.data.status_kamar === 'Tersedia' || kamarFound.data.status_kamar === 'Perbaikan') {
        updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Persiapan' });
      }

      return successResponse({ id_persiapan: id }, 'Tugas persiapan kamar berhasil dibuat.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function deletePersiapanKamar(idPersiapan) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.PERSIAPAN_KAMAR, 'id_persiapan', idPersiapan);
      if (!found) throw new Error('Data persiapan tidak ditemukan.');
      var sheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Tugas persiapan berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function updateStatusPersiapan(idPersiapan, newStatus) {
  try {
    var user = getActiveUserSession();

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.PERSIAPAN_KAMAR, 'id_persiapan', idPersiapan);
      if (!found) throw new Error('Data persiapan tidak ditemukan.');

      var updates = { status: newStatus };
      
      if (newStatus === 'Completed') {
        updates.selesai_pada = now();
      }

      updateRowCells(CONFIG.SHEETS.PERSIAPAN_KAMAR, found.rowIndex, updates);

      // Jika selesai, update status kamar → Tersedia
      if (newStatus === 'Completed') {
        var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', found.data.kode_kamar);
        if (kamarFound && kamarFound.data.status_kamar === 'Persiapan') {
          updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Tersedia' });
        }
      } else if (newStatus === 'In Progress') {
        // Assign otomatis ke user yang mengerjakan
        updates.assigned_to = user.nama;
        updateRowCells(CONFIG.SHEETS.PERSIAPAN_KAMAR, found.rowIndex, { assigned_to: user.nama });
      }

      return successResponse(null, 'Status persiapan berhasil diubah ke "' + newStatus + '".');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getAllTransaksiKos(filterStatus, limit, offset) {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.TRANSAKSI_KOS, 30);
    
    if (filterStatus && filterStatus !== 'Semua') {
      data = data.filter(function(d) { return d.status === filterStatus; });
    }
    
    // Gabung dengan nama kamar & kos
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    var kamarMap = {}, kosMap = {};
    kamarData.forEach(function(k) { kamarMap[k.kode_kamar] = k; });
    kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
    
    data = data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    
    data = data.map(function(d) {
      var kmr = kamarMap[d.kode_kamar] || {};
      return {
        id_transaksi: d.id_transaksi,
        kode_kamar: d.kode_kamar,
        kode_kos: d.kode_kos,
        nama_kamar: kmr.nama_kamar || '-',
        nama_kos: kosMap[d.kode_kos] || '-',
        nama_tamu: d.nama_tamu,
        no_wa_tamu: d.no_wa_tamu,
        check_in: d.check_in ? formatDateId(d.check_in) : '-',
        rencana_check_out: d.rencana_check_out ? formatDateId(d.rencana_check_out) : '-',
        check_out_aktual: d.check_out_aktual ? formatDateId(d.check_out_aktual) : '-',
        total_bayar: d.total_bayar || '0',
        status: d.status,
        catatan: d.catatan || '',
        timestamp: d.timestamp ? formatDateId(d.timestamp) : '-'
      };
    });
    
    // Default pagination: limit 50, offset 0
    var reqLimit = limit && !isNaN(limit) ? parseInt(limit) : 50;
    var reqOffset = offset && !isNaN(offset) ? parseInt(offset) : 0;
    var pagination = applyPagination(data, reqLimit, reqOffset);
    
    return successResponse({
      data: pagination.paginatedData,
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function cancelTransaksiKos(idTransaksi) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.TRANSAKSI_KOS, 'id_transaksi', idTransaksi);
      if (!found) throw new Error('Transaksi tidak ditemukan.');

      updateRowCells(CONFIG.SHEETS.TRANSAKSI_KOS, found.rowIndex, { status: 'Cancelled' });

      // Kembalikan status kamar ke Tersedia
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', found.data.kode_kamar);
      if (kamarFound && kamarFound.data.status_kamar === 'Terisi') {
        updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Tersedia' });
      }

      return successResponse(null, 'Transaksi berhasil dibatalkan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function searchPreviousCustomer(query) {
  try {
    var user = getActiveUserSession();
    if (!query || query.length < 2) return successResponse([]);

    var data = getSheetData(CONFIG.SHEETS.TRANSAKSI_KOS);
    var q = query.toLowerCase().trim();
    var seen = {};
    var results = [];

    // Sort by timestamp descending (riwayat terbaru dulu)
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    data.forEach(function(d) {
      var nama = (d.nama_tamu || '').toLowerCase();
      var wa = (d.no_wa_tamu || '').toLowerCase();
      var key = d.nama_tamu + '|' + d.no_wa_tamu;

      // Hanya dari transaksi Completed/Cancelled, dan unik per nama+wa
      if (d.status !== 'Completed' && d.status !== 'Cancelled') return;
      if (seen[key]) return;

      if (nama.indexOf(q) >= 0 || wa.indexOf(q) >= 0) {
        seen[key] = true;
        results.push({
          nama_tamu: d.nama_tamu,
          no_wa_tamu: d.no_wa_tamu || ''
        });
      }
    });

    // Batasi maksimal 10 hasil
    return successResponse(results.slice(0, 10));
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getCleaningTracker(bulan) {
  try {
    var periode = bulan || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM');
    
    var prepData = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    
    var kamarMap = {};
    kamarData.forEach(function(k) { kamarMap[k.kode_kamar] = k; });
    
    var kosMap = {};
    kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
    
    // Filter hanya yang completed di bulan ini
    var completed = prepData.filter(function(d) {
      if (d.status !== 'Completed' || !d.selesai_pada) return false;
      var tgl = Utilities.formatDate(new Date(d.selesai_pada), CONFIG.TIMEZONE, 'yyyy-MM');
      return tgl === periode;
    });
    
    // Group by staff
    var staffStats = {};
    var totalCleaned = 0;
    
    completed.forEach(function(d) {
      var nama = d.assigned_to || 'Unassigned';
      if (!staffStats[nama]) {
        staffStats[nama] = {
          nama: nama,
          total: 0,
          check_in_prep: 0,
          after_checkout: 0,
          maintenance_clean: 0,
          kamarList: []
        };
      }
      var s = staffStats[nama];
      s.total++;
      totalCleaned++;
      if (d.jenis === 'Check-in Prep') s.check_in_prep++;
      else if (d.jenis === 'After Check-out') s.after_checkout++;
      else if (d.jenis === 'Perbaikan Clean') s.maintenance_clean++;
      
      var kmr = kamarMap[d.kode_kamar] || {};
      s.kamarList.push({
        nama_kamar: kmr.nama_kamar || '-',
        nama_kos: kosMap[d.kode_kos] || '-',
        jenis: d.jenis,
        selesai_pada: formatDateId(d.selesai_pada)
      });
    });
    
    // Sort by total descending
    var staffRanking = Object.values(staffStats).sort(function(a, b) { return b.total - a.total; });
    
    return successResponse({
      periode: periode,
      totalCleaned: totalCleaned,
      totalTasks: prepData.filter(function(d) { return d.status === 'Completed'; }).length,
      staffRanking: staffRanking,
      staffCount: staffRanking.length
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function updateRoomStatus(idKamar, newStatus) {
  try {
    var user = getActiveUserSession();

    if (!idKamar || !newStatus) throw new Error('ID kamar dan status baru wajib diisi.');
    var allowedStatus = ['Tersedia', 'Persiapan', 'Terisi', 'Perbaikan'];
    if (allowedStatus.indexOf(newStatus) === -1) throw new Error('Status tidak valid.');

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', idKamar);
      if (!found) throw new Error('Kamar tidak ditemukan.');

      var oldStatus = found.data.status_kamar;

      // Validasi transisi status
      if (oldStatus === newStatus) throw new Error('Status kamar sudah "' + newStatus + '".');

      // Transisi yang diizinkan (dari → ke):
      // Tersedia → Perbaikan (kerusakan)
      // Perbaikan → Tersedia (selesai perbaikan)
      // Persiapan → Tersedia (selesai bersih)
      if (oldStatus === 'Terisi' && newStatus !== 'Persiapan' && newStatus !== 'Tersedia') {
        throw new Error('Kamar Terisi hanya bisa diubah ke Persiapan (check-out) atau Tersedia (jika check-out paksa).');
      }
      if (oldStatus === 'Persiapan' && newStatus !== 'Tersedia' && newStatus !== 'Perbaikan') {
        throw new Error('Kamar Persiapan hanya bisa diubah ke Tersedia atau Perbaikan.');
      }

      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, found.rowIndex, { status_kamar: newStatus });
      Logger.log('Room ' + idKamar + ': ' + oldStatus + ' → ' + newStatus + ' by ' + user.nama);

      return successResponse({
        kode_kamar: idKamar,
        old_status: oldStatus,
        new_status: newStatus,
        nama_kamar: found.data.nama_kamar
      }, '✅ Status kamar ' + found.data.nama_kamar + ' berhasil diubah: ' + oldStatus + ' → ' + newStatus);
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getAllMonitoringData() {
  try {
    var user = getActiveUserSession();
    
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    var transaksiData = getCachedSheetData(CONFIG.SHEETS.TRANSAKSI_KOS, 30);
    var persiapanData = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    
    // Map transaksi aktif per kamar
    var activeTrx = {};
    transaksiData.forEach(function(t) {
      if (t.status === 'Active') {
        activeTrx[t.kode_kamar] = t;
      }
    });
    
    // Map nama kos
    var kosMap = {};
    kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
    
    // Stat global
    var total = kamarData.length;
    var available = 0, preparation = 0, occupied = 0, maintenance = 0;
    var activeTransactions = transaksiData.filter(function(d) { return d.status === 'Active'; }).length;
    var pendingPrep = persiapanData.filter(function(d) { return d.status === 'Pending' || d.status === 'In Progress'; }).length;
    
    // Group kamar by kos + build detail
    var kosSections = [];
    var kosGroup = {};
    
    kosData.forEach(function(k) {
      kosGroup[k.kode_kos] = {
        kode_kos: k.kode_kos,
        nama_kos: k.nama_kos,
        total: 0, available: 0, preparation: 0, occupied: 0, maintenance: 0,
        kamarList: []
      };
    });
    
    kamarData.forEach(function(kmr) {
      var group = kosGroup[kmr.kode_kos];
      if (!group) return;
      group.total++;
      switch (kmr.status_kamar) {
        case 'Tersedia': group.available++; available++; break;
        case 'Persiapan': group.preparation++; preparation++; break;
        case 'Terisi': group.occupied++; occupied++; break;
        case 'Perbaikan': group.maintenance++; maintenance++; break;
      }
      
      var trx = activeTrx[kmr.kode_kamar];
      group.kamarList.push({
        kode_kamar: kmr.kode_kamar,
        nama_kamar: kmr.nama_kamar,
        tipe_kamar: kmr.tipe_kamar,
        harga_sewa: kmr.harga_sewa,
        status_kamar: kmr.status_kamar,
        tamu_aktif: trx ? trx.nama_tamu : '',
        check_in: trx ? formatDateId(trx.check_in) : '',
        rencana_check_out: trx ? formatDateId(trx.rencana_check_out) : ''
      });
    });
    
    kosSections = Object.values(kosGroup);
    
    return successResponse({
      kosSections: kosSections,
      total: total,
      available: available,
      preparation: preparation,
      occupied: occupied,
      maintenance: maintenance,
      activeTransactions: activeTransactions,
      pendingPrep: pendingPrep
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function globalSearch(query) {
  try {
    var user = getActiveUserSession();
    if (!query || query.length < 2) return successResponse({ tiket: [], kamar: [], transaksi: [], user: [] });

    var q = query.toLowerCase().trim();

    // ─── 1. Cari Tiket Komplain ───────────────────────────
    var tiketResults = [];
    try {
      var mainData = getSheetData(CONFIG.SHEETS.MAIN_DATA);
      mainData.forEach(function(d) {
        var tiketId = (d.tiket_id || '').toLowerCase();
        var nama = (d.nama_customer || '').toLowerCase();
        var lokasi = (d.lokasi || '').toLowerCase();
        var deskripsi = (d.deskripsi || '').toLowerCase();
        if (tiketId.indexOf(q) >= 0 || nama.indexOf(q) >= 0 || lokasi.indexOf(q) >= 0 || deskripsi.indexOf(q) >= 0) {
          tiketResults.push({
            type: 'tiket',
            id: d.tiket_id,
            label: d.tiket_id + ' — ' + (d.nama_customer || ''),
            sub: 'Lokasi: ' + (d.lokasi || '-') + ' | Status: ' + (d.status || ''),
            status: d.status,
            page: 'maintenance'
          });
        }
      });
    } catch (e) { Logger.log('Search tiket error: ' + e.message); }

    // ─── 2. Cari Kamar Kos ────────────────────────────────
    var kamarResults = [];
    try {
      var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
      var kosMap = {};
      kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
      
      var kamarData = getSheetData(CONFIG.SHEETS.MASTER_KAMAR);
      kamarData.forEach(function(d) {
        var nomor = (d.nama_kamar || '').toLowerCase();
        var tipe = (d.tipe_kamar || '').toLowerCase();
        if (nomor.indexOf(q) >= 0 || tipe.indexOf(q) >= 0) {
          kamarResults.push({
            type: 'kamar',
            id: d.kode_kamar,
            label: (kosMap[d.kode_kos] || '-') + ' — Kamar ' + d.nama_kamar,
            sub: 'Tipe: ' + (d.tipe_kamar || '-') + ' | Status: ' + (d.status_kamar || ''),
            status: d.status_kamar,
            page: 'roomstatus'
          });
        }
      });
    } catch (e) { Logger.log('Search kamar error: ' + e.message); }

    // ─── 3. Cari Transaksi Kos ────────────────────────────
    var trxResults = [];
    try {
      var transaksiData = getSheetData(CONFIG.SHEETS.TRANSAKSI_KOS);
      transaksiData.forEach(function(d) {
        var nama = (d.nama_tamu || '').toLowerCase();
        var wa = (d.no_wa_tamu || '').toLowerCase();
        if (nama.indexOf(q) >= 0 || wa.indexOf(q) >= 0) {
          trxResults.push({
            type: 'transaksi',
            id: d.id_transaksi,
            label: d.nama_tamu + ' (' + (d.no_wa_tamu || '-') + ')',
            sub: 'Status: ' + (d.status || '-') + ' | Check-in: ' + (d.check_in || '-'),
            status: d.status,
            page: 'kostrx'
          });
        }
      });
    } catch (e) { Logger.log('Search transaksi error: ' + e.message); }

    // ─── 4. Cari User ─────────────────────────────────────
    var userResults = [];
    try {
      var userData = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
      userData.forEach(function(d) {
        var nama = (d.nama || '').toLowerCase();
        var email = (d.email || '').toLowerCase();
        var tim = (d.tim || '').toLowerCase();
        if (nama.indexOf(q) >= 0 || email.indexOf(q) >= 0 || tim.indexOf(q) >= 0) {
          userResults.push({
            type: 'user',
            id: d.user_id || d.email,
            label: d.nama + ' (' + (d.email || '') + ')',
            sub: 'Role: ' + (d.role || '-') + ' | Tim: ' + (d.tim || '-'),
            status: d.status,
            page: ''
          });
        }
      });
    } catch (e) { Logger.log('Search user error: ' + e.message); }

    var total = tiketResults.length + kamarResults.length + trxResults.length + userResults.length;

    return successResponse({
      total: total,
      tiket: tiketResults.slice(0, 10),
      kamar: kamarResults.slice(0, 10),
      transaksi: trxResults.slice(0, 10),
      user: userResults.slice(0, 10)
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
/**
 * [TRANSAKSI KOS] Check-in: buat transaksi + status kamar → Terisi
 */
function checkInKos(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.kode_kamar || !payload.nama_tamu || !payload.check_in) {
      throw new Error('Kamar, nama tamu, dan tanggal check-in wajib diisi.');
    }

    return withLock(function() {
      // Validasi kamar tersedia
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', payload.kode_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');
      if (kamarFound.data.status_kamar !== 'Tersedia') {
        throw new Error('Kamar sedang tidak tersedia. Status saat ini: ' + kamarFound.data.status_kamar);
      }

      var sheet = getSheet(CONFIG.SHEETS.TRANSAKSI_KOS);
      var id = generateId('TRX');
      
      sheet.appendRow([
        id,
        payload.kode_kamar,
        kamarFound.data.kode_kos,
        payload.nama_tamu,
        payload.no_wa_tamu || '',
        payload.check_in,
        payload.rencana_check_out || '',
        '',               // check_out_aktual
        payload.total_bayar || '0',
        'Active',         // status
        payload.catatan || '',
        now()             // timestamp
      ]);

      // Update status kamar → Terisi
      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Terisi' });

      return successResponse({ id_transaksi: id }, 'Check-in berhasil! ' + payload.nama_tamu + ' — Kamar ' + kamarFound.data.nama_kamar);
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * [TRANSAKSI KOS] Check-out: selesaikan transaksi + auto-create persiapan kamar + notif WA
 */
function checkOutKos(idTransaksi, checkOutDate, catatan) {
  try {
    var user = getActiveUserSession();

    if (!idTransaksi) throw new Error('ID transaksi wajib diisi.');

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.TRANSAKSI_KOS, 'id_transaksi', idTransaksi);
      if (!found) throw new Error('Transaksi tidak ditemukan.');
      if (found.data.status !== 'Active') throw new Error('Transaksi sudah tidak aktif.');

      var tglCheckout = checkOutDate || nowFormatted();
      
      updateRowCells(CONFIG.SHEETS.TRANSAKSI_KOS, found.rowIndex, {
        check_out_aktual: tglCheckout,
        status: 'Completed',
        catatan: catatan || found.data.catatan || ''
      });

      // Update status kamar → Persiapan (perlu dibersihkan)
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'kode_kamar', found.data.kode_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');
      
      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Persiapan' });
      
      // Auto-create persiapan kamar
      var prepSheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      var prepId = generateId('PREP');
      
      prepSheet.appendRow([
        prepId,
        found.data.kode_kamar,
        kamarFound.data.kode_kos,
        'After Check-out',
        '',  // assigned_to — dikosongkan, nanti staff ambil sendiri
        'Pending',
        'Auto dari check-out tamu ' + (found.data.nama_tamu || '') + '. ' + (catatan || ''),
        now(),
        ''
      ]);
      Logger.log('Auto-created preparation task: ' + prepId);
      
      // Notif WA ke staff housekeeping
      try {
        var staffList = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
        var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
        var kosMap = {};
        kosData.forEach(function(k) { kosMap[k.kode_kos] = k.nama_kos; });
        
        var namaKos = kosMap[kamarFound.data.kode_kos] || '-';
        
        staffList.forEach(function(s) {
          if (s.tim === 'Housekeeping' && s.status === 'Aktif' && s.no_wa) {
            sendRoomCleaningNotification(
              s.no_wa, s.nama, kamarFound.data.nama_kamar, namaKos,
              found.data.nama_tamu, catatan || ''
            );
          }
        });
      } catch (waErr) {
        Logger.log('WA notification error: ' + waErr.message);
      }

      return successResponse({ id_persiapan: prepId }, 'Check-out berhasil! Tugas pembersihan otomatis dibuat.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
