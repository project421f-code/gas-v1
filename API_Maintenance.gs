/**
 * ============================================================
 * API_Maintenance.gs — Modul Maintenance & Komplain + KPI
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── COMPLAINT MANAGEMENT ───────────────────────────────────

/**
 * Mendapatkan semua tiket komplain
 */
function getAllComplaints(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('main_data', CONFIG.SHEETS.MAIN_DATA);

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'Semua') {
        data = data.filter(function(d) { return d.status === filters.status; });
      }
      if (filters.kategori && filters.kategori !== 'Semua') {
        data = data.filter(function(d) { return d.kategori === filters.kategori; });
      }
      if (filters.urgensi && filters.urgensi !== 'Semua') {
        data = data.filter(function(d) { return d.urgensi === filters.urgensi; });
      }
      if (filters.teknisi) {
        data = data.filter(function(d) { return d.teknisi === filters.teknisi; });
      }
    }

    // Sort by timestamp descending (terbaru dulu)
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Format dates untuk display
    data = data.map(function(d) {
      return {
        tiket_id: d.tiket_id,
        timestamp: formatDateId(d.timestamp),
        no_wa: d.no_wa,
        nama_customer: d.nama_customer,
        lokasi: d.lokasi,
        deskripsi: d.deskripsi,
        foto_kerusakan: d.foto_kerusakan,
        kategori: d.kategori,
        sub_kategori: d.sub_kategori,
        urgensi: d.urgensi,
        target_sla_jam: d.target_sla_jam,
        status: d.status,
        teknisi: d.teknisi,
        foto_perbaikan: d.foto_perbaikan,
        catatan: d.catatan,
        waktu_selesai: d.waktu_selesai ? formatDateId(d.waktu_selesai) : '-',
        durasi_jam: d.durasi_jam || '-',
        status_sla: d.status_sla || '-',
        rating_survei: d.rating_survei || '-'
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan tiket komplain baru atau update yang ada
 */
function saveComplaint(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.nama_customer || !payload.lokasi || !payload.deskripsi || !payload.kategori || !payload.urgensi) {
      throw new Error('Nama, lokasi, deskripsi, kategori, dan urgensi wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);

      // Ambil target SLA dari Master_SLA
      var targetSLA = lookupSLA(payload.kategori, payload.sub_kategori || '', payload.urgensi);

      if (payload.tiket_id) {
        // UPDATE
        var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', payload.tiket_id);
        if (!found) throw new Error('Tiket tidak ditemukan.');

        var updates = {
          nama_customer: payload.nama_customer,
          no_wa: normalizePhone(payload.no_wa),
          lokasi: payload.lokasi,
          deskripsi: payload.deskripsi,
          foto_kerusakan: payload.foto_kerusakan || '',
          kategori: payload.kategori,
          sub_kategori: payload.sub_kategori || '',
          urgensi: payload.urgensi,
          target_sla_jam: targetSLA
        };

        updateRowCells(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, updates);
        return successResponse({ tiket_id: payload.tiket_id }, 'Tiket berhasil diperbarui.');

      } else {
        // CREATE
        var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');

        // Normalisasi nomor WA sebelum disimpan (force string, hindari scientific notation)
        var cleanPhone = normalizePhone(payload.no_wa);

        sheet.appendRow([
          now(),                         // timestamp
          tiketId,                       // tiket_id
          cleanPhone,                    // no_wa (sudah string bersih)
          payload.nama_customer,         // nama_customer
          payload.lokasi,                // lokasi
          payload.deskripsi,             // deskripsi
          payload.foto_kerusakan || '',  // foto_kerusakan
          payload.kategori,              // kategori
          payload.sub_kategori || '',    // sub_kategori
          payload.urgensi,               // urgensi
          targetSLA,                     // target_sla_jam
          CONFIG.STATUS.OPEN,            // status
          '',                            // teknisi
          '',                            // foto_perbaikan
          '',                            // catatan
          '',                            // waktu_selesai
          '',                            // durasi_jam
          '',                            // status_sla
          ''                             // rating_survei
        ]);

        // Force format kolom no_wa sebagai teks agar Google Sheets tidak mengkonversi ke number
        try {
          var noWaColIndex = 3; // Kolom C = no_wa
          sheet.getRange(sheet.getLastRow(), noWaColIndex).setNumberFormat('@');
        } catch (fmtErr) {
          Logger.log('Format kolom no_wa error: ' + fmtErr.message);
        }

        // ─── WA NOTIFICATION ────────────────────────────
        // Kirim notifikasi ke customer jika ada nomor WA
        if (cleanPhone) {
          try {
            sendNewTicketNotification(
              cleanPhone,
              tiketId,
              payload.nama_customer,
              payload.kategori,
              payload.urgensi,
              payload.lokasi,
              payload.deskripsi
            );
          } catch (waErr) {
            Logger.log('WA New Ticket Notification Error: ' + waErr.message);
          }
        }

        return successResponse({ tiket_id: tiketId }, 'Tiket "' + tiketId + '" berhasil dibuat.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Update status tiket & assign teknisi
 */
function updateComplaintStatus(tiketId, newStatus, assignData) {
  try {
    var user = getActiveUserSession();

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      var updates = { status: newStatus };

      if (newStatus === CONFIG.STATUS.IN_PROGRESS) {
        if (assignData && assignData.teknisi) {
          updates.teknisi = assignData.teknisi;

          // ─── WA NOTIFICATION ──────────────────────────
          // Kirim notifikasi ke customer bahwa tiket sedang dikerjakan
          var customerPhone = normalizePhone(found.data.no_wa);
          if (customerPhone) {
            try {
              sendTicketInProgressNotification(customerPhone, found.data.nama_customer, tiketId, assignData.teknisi);
              Logger.log('WA InProgress sent to ' + customerPhone);
            } catch (waErr) {
              Logger.log('WA InProgress Notification Error: ' + waErr.message);
            }
          } else {
            Logger.log('WA INPROGRESS SKIPPED: no_wa kosong/tidak valid');
          }

          // Kirim notifikasi WhatsApp ke teknisi yang ditugaskan
          try {
            var teknisiData = findRow(CONFIG.SHEETS.USER_LIST, 'nama', assignData.teknisi);
            var teknisiPhone = normalizePhone(teknisiData && teknisiData.data.no_wa);
            if (teknisiPhone) {
              sendTicketAssignedNotification(
                teknisiPhone,
                assignData.teknisi,
                tiketId,
                found.data.nama_customer,
                found.data.lokasi,
                found.data.deskripsi,
                found.data.urgensi
              );
              Logger.log('WA Assign sent to ' + assignData.teknisi + ' (' + teknisiPhone + ')');
            } else {
              Logger.log('Teknisi ' + assignData.teknisi + ' tidak punya nomor WA terdaftar.');
            }
          } catch (waErr) {
            Logger.log('WA Assign Notification Error: ' + waErr.message);
          }
        }
      }

      if (newStatus === CONFIG.STATUS.SELESAI) {
        var waktuSelesai = now();
        var startTime = new Date(found.data.timestamp);
        var duration = diffInHours(startTime, waktuSelesai);
        var targetSLA = Number(found.data.target_sla_jam) || 999;
        var slaStatus = duration <= targetSLA ? CONFIG.STATUS.ACHIEVED : CONFIG.STATUS.BREACHED;

        updates.waktu_selesai = waktuSelesai;
        updates.durasi_jam = duration;
        updates.status_sla = slaStatus;

        if (assignData && assignData.foto_perbaikan) {
          updates.foto_perbaikan = assignData.foto_perbaikan;
        }
        if (assignData && assignData.catatan) {
          updates.catatan = assignData.catatan;
        }
        if (assignData && assignData.teknisi) {
          updates.teknisi = assignData.teknisi;
        }

        // ─── WA NOTIFICATION ────────────────────────────
        // Kirim notifikasi selesai + survei ke pelapor
        var customerPhone = normalizePhone(found.data.no_wa || (assignData && assignData.no_wa) || '');
        
        if (customerPhone) {
          try {
            sendTicketCompletedNotification(
              customerPhone,
              found.data.nama_customer || '-',
              tiketId,
              (assignData && assignData.catatan) || '',
              found.data.kategori || '-'
            );
            Logger.log('WA Completed + Survey sent to ' + customerPhone);
          } catch (waErr) {
            Logger.log('WA Survey Error: ' + waErr.message);
          }
        } else {
          Logger.log('WA SELESAI SKIPPED: no_wa kosong');
        }
      }

      updateRowCells(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, updates);
      return successResponse(null, 'Status tiket berhasil diubah ke "' + newStatus + '".');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan rating survei kepuasan
 */
function saveSurveyRating(tiketId, rating) {
  try {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating harus antara 1-5.');
    }

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      updateCell(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, 'rating_survei', rating);
      return successResponse(null, 'Rating survei berhasil disimpan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Buat tiket komplain dari WhatsApp webhook (tanpa auth session)
 * Dipanggil otomatis saat customer kirim pesan dengan format komplain
 */
function createComplaintFromWhatsApp(data) {
  try {
    if (!data.nama_customer || !data.lokasi || !data.deskripsi) {
      throw new Error('Data tidak lengkap. Nama, lokasi, dan deskripsi wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
      var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');
      var cleanPhone = normalizePhone(data.no_wa || '');
      var kategori = data.kategori || 'Lainnya';
      var urgensi = data.urgensi || 'Medium';
      var targetSLA = lookupSLA(kategori, data.sub_kategori || '', urgensi);

      sheet.appendRow([
        now(),                         // timestamp
        tiketId,                       // tiket_id
        cleanPhone,                    // no_wa
        data.nama_customer,            // nama_customer
        data.lokasi,                   // lokasi
        data.deskripsi,                // deskripsi
        data.foto_kerusakan || '',     // foto_kerusakan (dari WA)
        kategori,                      // kategori
        data.sub_kategori || '',       // sub_kategori
        urgensi,                       // urgensi
        targetSLA,                     // target_sla_jam
        CONFIG.STATUS.OPEN,            // status
        '',                            // teknisi
        '',                            // foto_perbaikan
        '',                            // catatan
        '',                            // waktu_selesai
        '',                            // durasi_jam
        '',                            // status_sla
        ''                             // rating_survei
      ]);

      // Force format no_wa column sebagai teks
      try {
        var noWaColIndex = 3;
        sheet.getRange(sheet.getLastRow(), noWaColIndex).setNumberFormat('@');
      } catch (fmtErr) {
        Logger.log('Format kolom no_wa error: ' + fmtErr.message);
      }

      // Kirim notifikasi ke customer
      if (cleanPhone) {
        try {
          sendNewTicketNotification(
            cleanPhone,
            tiketId,
            data.nama_customer,
            kategori,
            urgensi,
            data.lokasi,
            data.deskripsi
          );
        } catch (waErr) {
          Logger.log('WA New Ticket Notification Error: ' + waErr.message);
        }
      }

      Logger.log('WA Auto-Ticket: Created ' + tiketId + ' for ' + data.nama_customer + ' (' + cleanPhone + ')');

      // ─── NOTIFIKASI KE ADMIN ────────────────────────────
      // Kirim notifikasi ke semua Admin & Supervisor yang punya nomor WA
      try {
        var allUsers = getSheetData(CONFIG.SHEETS.USER_LIST);

        allUsers.forEach(function(admin) {
          if ((admin.role !== CONFIG.ROLES.ADMIN && admin.role !== CONFIG.ROLES.SUPERVISOR) ||
              admin.status !== 'Aktif') return;

          var adminPhone = normalizePhone(admin.no_wa);
          if (!adminPhone) return;

          try {
            sendAutoTicketAdminNotification(
              adminPhone,
              admin.nama,
              data.nama_customer,
              tiketId,
              kategori,
              data.lokasi,
              data.deskripsi,
              data.foto_kerusakan || ''
            );
            Logger.log('WA Admin notified: ' + admin.nama + ' (' + adminPhone + ') for ticket ' + tiketId);
          } catch (waErr) {
            Logger.log('WA Admin Notification Error for ' + admin.nama + ': ' + waErr.message);
          }
        });
      } catch (adminErr) {
        Logger.log('WA Admin Notification Lookup Error: ' + adminErr.message);
      }

      return successResponse({ tiket_id: tiketId }, 'Tiket "' + tiketId + '" berhasil dibuat dari WhatsApp.');
    });
  } catch (e) {
    Logger.log('createComplaintFromWhatsApp Error: ' + e.message);
    return errorResponse(e.message);
  }
}

/**
 * Kirim update komplain ke customer via WhatsApp
 */
function sendComplaintUpdate(tiketId, pesanTambahan) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
    if (!found) throw new Error('Tiket tidak ditemukan.');

    var customerPhone = normalizePhone(found.data.no_wa);
    if (!customerPhone) {
      throw new Error('Customer tidak memiliki nomor WhatsApp terdaftar.');
    }
    sendComplaintUpdateNotification(
      customerPhone,
      found.data.nama_customer,
      tiketId,
      found.data.status,
      pesanTambahan || ''
    );

    return successResponse(null, '✅ Update berhasil dikirim ke customer via WhatsApp.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus tiket komplain
 */
function deleteComplaint(tiketId) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Tiket berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi Main_Data ke Supabase
 */


/**
 * Migrasi Dashboard_KPI_Mnt ke Supabase
 */


// ─── MASTER SLA ─────────────────────────────────────────────

/**
 * [SUPABASE] Baca semua data Master SLA dari Supabase
 * Fallback ke Sheets jika Supabase kosong/tidak tersedia
 */
function getMasterSLAFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'master_sla', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      Logger.log('Supabase Master_SLA: ' + result.length + ' entries');
      return result;
    }
    Logger.log('Supabase Master_SLA kosong/tidak tersedia, fallback ke Sheets');
    return getSheetData(CONFIG.SHEETS.MASTER_SLA);
  } catch (e) {
    Logger.log('Supabase error Master_SLA, fallback ke Sheets: ' + e.message);
    return getSheetData(CONFIG.SHEETS.MASTER_SLA);
  }
}

/**
 * Mendapatkan semua data Master SLA — PRIORITAS Supabase
 */
function getMasterSLA() {
  try {
    var data = getMasterSLAFromSupabase();
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Lookup SLA target — PRIORITAS Supabase, fallback Sheets
 */
function lookupSLA(kategori, subKategori, urgensi) {
  var data = getMasterSLAFromSupabase();

  for (var i = 0; i < data.length; i++) {
    if (data[i].kategori === kategori &&
        data[i].sub_kategori === (subKategori || '') &&
        data[i].urgensi === urgensi) {
      return Number(data[i].target_sla_jam);
    }
  }

  for (var j = 0; j < data.length; j++) {
    if (data[j].kategori === kategori && data[j].urgensi === urgensi) {
      return Number(data[j].target_sla_jam);
    }
  }

  var defaults = { 'Low': 48, 'Medium': 24, 'High': 8 };
  return defaults[urgensi] || 24;
}

/**
 * Mendapatkan daftar kategori unik — PRIORITAS Supabase
 */
function getSLACategories() {
  try {
    var data = getMasterSLAFromSupabase();
    var categories = {};
    data.forEach(function(d) {
      if (!categories[d.kategori]) {
        categories[d.kategori] = [];
      }
      if (d.sub_kategori && categories[d.kategori].indexOf(d.sub_kategori) === -1) {
        categories[d.kategori].push(d.sub_kategori);
      }
    });
    return successResponse(categories);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan / update entri Master SLA — LANGSUNG ke Supabase
 * Master_SLA punya unique constraint (kategori, sub_kategori, urgensi)
 */
function saveMasterSLA(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    if (!payload.kategori || !payload.urgensi || !payload.target_sla_jam) {
      throw new Error('Kategori, urgensi, dan target SLA wajib diisi.');
    }
    
    var data = {
      kategori: payload.kategori,
      sub_kategori: payload.sub_kategori || '',
      urgensi: payload.urgensi,
      target_sla_jam: Number(payload.target_sla_jam)
    };
    
    if (payload._isUpdate) {
      // Cari id di Supabase berdasarkan kombinasi unik
      var found = fetchSupabase('GET', 'master_sla', {
        query: 'kategori=eq.' + encodeURIComponent(payload.kategori) +
               '&sub_kategori=eq.' + encodeURIComponent(payload.sub_kategori || '') +
               '&urgensi=eq.' + encodeURIComponent(payload.urgensi) +
               '&select=id'
      });
      if (!found || !Array.isArray(found) || found.length === 0) {
        throw new Error('Data SLA tidak ditemukan.');
      }
      // UPDATE via PATCH
      var result = fetchSupabase('PATCH', 'master_sla', {
        query: 'id=eq.' + found[0].id,
        data: data
      });
      if (result && result.success === false) throw new Error(result.error || 'Gagal update SLA');
      return successResponse(null, 'SLA berhasil diperbarui.');
    } else {
      // CREATE via POST
      var result = fetchSupabase('POST', 'master_sla', { data: data });
      if (result && result.success === false) throw new Error(result.error || 'Gagal tambah SLA');
      return successResponse(null, 'SLA baru berhasil ditambahkan.');
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus entri Master SLA — LANGSUNG dari Supabase
 * Cari id berdasarkan kombinasi unik, lalu DELETE
 */
function deleteMasterSLA(kategori, subKategori, urgensi) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    
    // Cari id di Supabase
    var found = fetchSupabase('GET', 'master_sla', {
      query: 'kategori=eq.' + encodeURIComponent(kategori) +
             '&sub_kategori=eq.' + encodeURIComponent(subKategori || '') +
             '&urgensi=eq.' + encodeURIComponent(urgensi) +
             '&select=id'
    });
    if (!found || !Array.isArray(found) || found.length === 0) {
      throw new Error('Data SLA tidak ditemukan.');
    }
    // DELETE
    var result = fetchSupabase('DELETE', 'master_sla', {
      query: 'id=eq.' + found[0].id
    });
    if (result && result.success === false) throw new Error(result.error || 'Gagal hapus SLA');
    return successResponse(null, 'SLA berhasil dihapus.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Migrasi data Master_SLA dari Sheets ke Supabase
 */


// ─── KPI MAINTENANCE ────────────────────────────────────────

/**
 * Hitung & simpan KPI Maintenance
 * Rumus: % Kepatuhan SLA = (Tiket SLA Achieved / Total Tiket Selesai) × 100%
 */
function calculateMaintenanceKPI() {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var complaints = getDataFromSupabase('main_data', CONFIG.SHEETS.MAIN_DATA);
    var kpiMap = {};

    // Kalkulasi per teknisi
    complaints.forEach(function(c) {
      var teknisi = c.teknisi;
      if (!teknisi) return;

      if (!kpiMap[teknisi]) {
        kpiMap[teknisi] = {
          nama_staff: teknisi,
          total_tiket: 0,
          tiket_selesai: 0,
          sla_achieved: 0,
          total_rating: 0,
          rating_count: 0
        };
      }

      kpiMap[teknisi].total_tiket++;

      if (c.status === CONFIG.STATUS.SELESAI) {
        kpiMap[teknisi].tiket_selesai++;
        if (c.status_sla === CONFIG.STATUS.ACHIEVED) {
          kpiMap[teknisi].sla_achieved++;
        }
        if (c.rating_survei && Number(c.rating_survei) > 0) {
          kpiMap[teknisi].total_rating += Number(c.rating_survei);
          kpiMap[teknisi].rating_count++;
        }
      }
    });

    // Hitung persentase dan skor
    var kpiData = Object.keys(kpiMap).map(function(key) {
      var k = kpiMap[key];
      var persenSLA = k.tiket_selesai > 0
        ? Math.round((k.sla_achieved / k.tiket_selesai) * 10000) / 100
        : 0;
      var avgRating = k.rating_count > 0
        ? Math.round((k.total_rating / k.rating_count) * 100) / 100
        : 0;

      // Skor Performa berdasarkan % SLA
      var skor = 'Perlu Perbaikan';
      if (persenSLA >= 90) skor = 'Excellent';
      else if (persenSLA >= 75) skor = 'Baik';
      else if (persenSLA >= 60) skor = 'Cukup';

      return {
        nama_staff: k.nama_staff,
        total_tiket: k.total_tiket,
        tiket_selesai: k.tiket_selesai,
        persen_sla: persenSLA,
        rata_rata_rating: avgRating,
        skor_performa: skor
      };
    });

    // Update sheet Dashboard_KPI_Mnt
    var sheet = getSheet(CONFIG.SHEETS.DASHBOARD_KPI_MNT);
    // Clear existing data (keep header)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }

    kpiData.forEach(function(k) {
      sheet.appendRow([
        k.nama_staff,
        k.total_tiket,
        k.tiket_selesai,
        k.persen_sla / 100, // Store as decimal for sheet formatting
        k.rata_rata_rating,
        k.skor_performa
      ]);
    });

    return successResponse(kpiData, 'KPI Maintenance berhasil dikalkulasi.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan data KPI Maintenance
 */
function getMaintenanceKPI() {
  try {
    var data = getDataFromSupabase('dashboard_kpi_mnt', CONFIG.SHEETS.DASHBOARD_KPI_MNT);

    data = data.map(function(d) {
      return {
        nama_staff: d.nama_staff,
        total_tiket: d.total_tiket,
        tiket_selesai: d.tiket_selesai,
        persen_sla: typeof d.persen_sla === 'number' && d.persen_sla < 1
          ? Math.round(d.persen_sla * 10000) / 100
          : d.persen_sla,
        rata_rata_rating: d.rata_rata_rating,
        skor_performa: d.skor_performa
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── DASHBOARD STATISTICS ───────────────────────────────────

/**
 * Mendapatkan statistik ringkasan untuk Dashboard utama
 */
function getDashboardStats() {
  try {
    var user = getActiveUserSession();

    var complaints = getDataFromSupabase('main_data', CONFIG.SHEETS.MAIN_DATA);
    var bookings = getDataFromSupabase('asset_booking', CONFIG.SHEETS.ASSET_BOOKING);
    var patrols = getDataFromSupabase('patrol_log', CONFIG.SHEETS.PATROL_LOG);
    var checklists = getDataFromSupabase('cs_daily_checklist', CONFIG.SHEETS.CS_DAILY_CHECKLIST);
    var assets = getDataFromSupabase('asset_list', CONFIG.SHEETS.ASSET_LIST);
    var users = getDataFromSupabase('user_list', CONFIG.SHEETS.USER_LIST);
    var kos = getDataFromSupabase('master_kos', CONFIG.SHEETS.MASTER_KOS);

    // Maintenance stats
    var totalComplaints = complaints.length;
    var openComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.OPEN; }).length;
    var inProgressComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.IN_PROGRESS; }).length;
    var completedComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.SELESAI; }).length;
    var slaAchieved = complaints.filter(function(c) { return c.status_sla === CONFIG.STATUS.ACHIEVED; }).length;
    var slaBreached = complaints.filter(function(c) { return c.status_sla === CONFIG.STATUS.BREACHED; }).length;

    // Booking stats
    var totalBookings = bookings.length;
    var activeBookings = bookings.filter(function(b) { return b.status_booking === 'Approved (Auto)'; }).length;
    var pendingBookings = bookings.filter(function(b) { return b.status_booking === 'Pending'; }).length;

    // Security stats
    var totalPatrols = patrols.length;

    // Housekeeping stats
    var totalChecklists = checklists.length;
    var onSchedule = checklists.filter(function(c) { return c.kesesuaian_jadwal === 'On Schedule'; }).length;

    // Chart data: Komplain per kategori
    var categoryCount = {};
    complaints.forEach(function(c) {
      var cat = c.kategori || 'Lainnya';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Chart data: Status distribusi
    var statusCount = {
      'Open': openComplaints,
      'In Progress': inProgressComplaints,
      'Selesai': completedComplaints
    };

    // Chart data: Urgensi distribusi
    var urgencyCount = {};
    complaints.forEach(function(c) {
      var urg = c.urgensi || 'Unknown';
      urgencyCount[urg] = (urgencyCount[urg] || 0) + 1;
    });

    return successResponse({
      maintenance: {
        total: totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        completed: completedComplaints,
        slaAchieved: slaAchieved,
        slaBreached: slaBreached,
        slaRate: completedComplaints > 0
          ? Math.round((slaAchieved / completedComplaints) * 100)
          : 0
      },
      booking: {
        total: totalBookings,
        active: activeBookings,
        pending: pendingBookings
      },
      assets: {
        total: assets.length
      },
      users: {
        total: users.length
      },
      kos: {
        total: kos.length
      },
      security: {
        totalPatrols: totalPatrols
      },
      housekeeping: {
        totalChecklists: totalChecklists,
        onSchedule: onSchedule,
        complianceRate: totalChecklists > 0
          ? Math.round((onSchedule / totalChecklists) * 100)
          : 0
      },
      charts: {
        categoryCount: categoryCount,
        statusCount: statusCount,
        urgencyCount: urgencyCount
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── RATING SURVEY DASHBOARD ────────────────────────────────

/**
 * Mendapatkan statistik lengkap rating survei kepuasan
 * Menyajikan data untuk dashboard rating: agregasi per kategori, per teknisi, tren waktu
 */
function getRatingSurveyStats() {
  try {
    var user = getActiveUserSession();
    var complaints = getDataFromSupabase('main_data', CONFIG.SHEETS.MAIN_DATA);

    // Filter tiket yang punya rating
    var rated = complaints.filter(function(c) {
      return c.rating_survei && String(c.rating_survei).trim() !== '' && Number(c.rating_survei) > 0;
    });

    var totalRated = rated.length;
    var totalCompleted = complaints.filter(function(c) { return c.status === CONFIG.STATUS.SELESAI; }).length;
    var responseRate = totalCompleted > 0 ? Math.round((totalRated / totalCompleted) * 100) : 0;

    // Hitung rata-rata rating overall
    var sumRating = 0;
    rated.forEach(function(c) { sumRating += Number(c.rating_survei); });
    var avgRating = totalRated > 0 ? Math.round((sumRating / totalRated) * 100) / 100 : 0;

    // Distribusi rating (1-5)
    var distribution = [0, 0, 0, 0, 0];
    rated.forEach(function(c) {
      var r = Number(c.rating_survei);
      if (r >= 1 && r <= 5) distribution[r - 1]++;
    });

    // Rating per kategori
    var byCategory = {};
    rated.forEach(function(c) {
      var cat = c.kategori || 'Lainnya';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += Number(c.rating_survei);
      byCategory[cat].count++;
    });

    var categoryStats = Object.keys(byCategory).map(function(key) {
      return {
        kategori: key,
        avg: Math.round((byCategory[key].total / byCategory[key].count) * 100) / 100,
        count: byCategory[key].count
      };
    }).sort(function(a, b) { return b.avg - a.avg; });

    // Rating per teknisi
    var byTeknisi = {};
    rated.forEach(function(c) {
      var tek = c.teknisi || 'Belum di-assign';
      if (!byTeknisi[tek]) byTeknisi[tek] = { total: 0, count: 0 };
      byTeknisi[tek].total += Number(c.rating_survei);
      byTeknisi[tek].count++;
    });

    var teknisiStats = Object.keys(byTeknisi).map(function(key) {
      return {
        teknisi: key,
        avg: Math.round((byTeknisi[key].total / byTeknisi[key].count) * 100) / 100,
        count: byTeknisi[key].count
      };
    }).sort(function(a, b) { return b.avg - a.avg; });

    // Tren rating per bulan
    var byMonth = {};
    rated.forEach(function(c) {
      if (!c.timestamp) return;
      var monthKey = Utilities.formatDate(new Date(c.timestamp), CONFIG.TIMEZONE, 'yyyy-MM');
      if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, count: 0 };
      byMonth[monthKey].total += Number(c.rating_survei);
      byMonth[monthKey].count++;
    });

    var monthlyTrend = Object.keys(byMonth).sort().map(function(key) {
      return {
        bulan: key,
        avg: Math.round((byMonth[key].total / byMonth[key].count) * 100) / 100,
        count: byMonth[key].count
      };
    });

    // Detail semua rating untuk tabel
    var ratingDetails = rated.map(function(c) {
      return {
        tiket_id: c.tiket_id,
        timestamp: formatDateOnly(c.timestamp),
        nama_customer: c.nama_customer || '-',
        kategori: c.kategori || '-',
        teknisi: c.teknisi || '-',
        rating: Number(c.rating_survei)
      };
    }).sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return successResponse({
      overview: {
        total_rated: totalRated,
        total_completed: totalCompleted,
        avg_rating: avgRating,
        response_rate: responseRate,
        five_star: distribution[4],
        four_star: distribution[3],
        three_star: distribution[2],
        two_star: distribution[1],
        one_star: distribution[0]
      },
      distribution: {
        labels: ['⭐1 Buruk', '⭐2 Kurang', '⭐3 Cukup', '⭐4 Baik', '⭐5 Sgt Baik'],
        values: distribution
      },
      by_category: categoryStats,
      by_teknisi: teknisiStats,
      monthly_trend: monthlyTrend,
      details: ratingDetails
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
