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
