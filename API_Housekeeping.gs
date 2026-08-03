/**
 * ============================================================
 * API_Housekeeping.gs — Modul Ekosistem Housekeeping
 * (Checklist Harian, Audit Supervisor, General Cleaning, KPI)
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── CS DAILY CHECKLIST ─────────────────────────────────────

/**
 * Simpan checklist harian CS
 * Cross-Module Trigger: Jika kondisi_fasilitas = "Ada Kerusakan",
 * otomatis membuat tiket baru di Main_Data
 */
function saveDailyChecklist(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.tim || !payload.lokasi_area || !payload.status_pekerjaan) {
      throw new Error('Tim, lokasi area, dan status pekerjaan wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.CS_DAILY_CHECKLIST);

      sheet.appendRow([
        now(),
        payload.tim,
        payload.nama_staf || user.nama,
        payload.lokasi_area,
        payload.status_pekerjaan,
        payload.checklist_kerja || '',
        payload.kondisi_fasilitas || 'Aman',
        payload.detail_kerusakan || '',
        payload.kesesuaian_jadwal || 'On Schedule'
      ]);

      // ─── CROSS-MODULE TRIGGER ─────────────────────────
      // Jika ada kerusakan, otomatis buat tiket maintenance
      if (payload.kondisi_fasilitas === 'Ada Kerusakan' && payload.detail_kerusakan) {
        var mainSheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
        var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');

        mainSheet.appendRow([
          now(),                                          // timestamp
          tiketId,                                        // tiket_id
          '',                                             // no_wa
          (payload.nama_staf || user.nama) + ' (CS)',     // nama_customer
          payload.lokasi_area,                            // lokasi
          '[Auto dari Checklist CS] ' + payload.detail_kerusakan, // deskripsi
          '',                                             // foto_kerusakan
          'Lainnya',                                      // kategori
          'Lainnya',                                      // sub_kategori
          'Medium',                                       // urgensi
          24,                                             // target_sla_jam
          CONFIG.STATUS.OPEN,                             // status
          '', '', '', '', '', '', ''                      // sisanya kosong
        ]);

        // ─── WA NOTIFICATION ────────────────────────────
        // Kirim notifikasi WhatsApp ke Supervisor/Admin tentang kerusakan
        try {
          var supervisorList = getSheetData(CONFIG.SHEETS.USER_LIST);
          supervisorList.forEach(function(u) {
            if ((u.role === 'Supervisor' || u.role === 'Admin') && u.status === 'Aktif' && u.no_wa) {
              sendDamageDetectedNotification(
                u.no_wa,
                u.nama,
                payload.lokasi_area,
                payload.detail_kerusakan,
                tiketId
              );
              Logger.log('WA Damage sent to ' + u.nama + ' (' + u.no_wa + ')');
            }
          });
        } catch (waErr) {
          Logger.log('WA Damage Notification Error: ' + waErr.message);
        }

        return successResponse(
          { tiketId: tiketId },
          'Checklist berhasil disimpan. ⚠️ Kerusakan terdeteksi — tiket "' + tiketId + '" otomatis dibuat.'
        );
      }

      return successResponse(null, 'Checklist harian berhasil disimpan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan semua data checklist harian
 */
function getAllDailyChecklists(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('cs_daily_checklist', CONFIG.SHEETS.CS_DAILY_CHECKLIST);

    if (filters) {
      if (filters.tim && filters.tim !== 'Semua') {
        data = data.filter(function(d) { return d.tim === filters.tim; });
      }
      if (filters.nama_staf) {
        data = data.filter(function(d) { return d.nama_staf === filters.nama_staf; });
      }
      if (filters.tanggal) {
        data = data.filter(function(d) {
          var ts = Utilities.formatDate(new Date(d.timestamp), CONFIG.TIMEZONE, 'yyyy-MM-dd');
          return ts === filters.tanggal;
        });
      }
      if (filters.kesesuaian_jadwal && filters.kesesuaian_jadwal !== 'Semua') {
        data = data.filter(function(d) { return d.kesesuaian_jadwal === filters.kesesuaian_jadwal; });
      }
    }

    // Staff hanya melihat data sendiri
    if (user.role === CONFIG.ROLES.STAFF) {
      data = data.filter(function(d) { return d.nama_staf === user.nama; });
    }

    // Sort terbaru dulu
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    data = data.map(function(d) {
      return {
        timestamp: formatDateId(d.timestamp),
        tim: d.tim,
        nama_staf: d.nama_staf,
        lokasi_area: d.lokasi_area,
        status_pekerjaan: d.status_pekerjaan,
        checklist_kerja: d.checklist_kerja,
        kondisi_fasilitas: d.kondisi_fasilitas,
        detail_kerusakan: d.detail_kerusakan,
        kesesuaian_jadwal: d.kesesuaian_jadwal
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── AUDIT HOUSEKEEPING (Supervisor) ────────────────────────

/**
 * Simpan data audit housekeeping
 */
function saveAuditHousekeeping(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!payload.lokasi_area || !payload.tim_diaudit || !payload.nama_staf || !payload.skor_kebersihan) {
      throw new Error('Lokasi, tim yang diaudit, nama staf, dan skor kebersihan wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.AUDIT_HOUSEKEEPING);

      var skor = Number(payload.skor_kebersihan);
      var status = skor >= 3 ? 'Pass' : 'Fail';

      sheet.appendRow([
        now(),
        payload.nama_auditor || user.nama,
        payload.lokasi_area,
        payload.tim_diaudit,
        payload.nama_staf,
        skor,
        status,
        payload.catatan || '',
        payload.foto_temuan || ''
      ]);

      return successResponse(null, 'Audit kebersihan berhasil disimpan. Status: ' + status);
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan semua data audit
 */
function getAllAudits(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('audit_housekeeping', CONFIG.SHEETS.AUDIT_HOUSEKEEPING);

    if (filters) {
      if (filters.tim_diaudit && filters.tim_diaudit !== 'Semua') {
        data = data.filter(function(d) { return d.tim_diaudit === filters.tim_diaudit; });
      }
      if (filters.status_kelayakan && filters.status_kelayakan !== 'Semua') {
        data = data.filter(function(d) { return d.status_kelayakan === filters.status_kelayakan; });
      }
      if (filters.tanggal) {
        data = data.filter(function(d) {
          var ts = Utilities.formatDate(new Date(d.timestamp), CONFIG.TIMEZONE, 'yyyy-MM-dd');
          return ts === filters.tanggal;
        });
      }
    }

    // Sort terbaru dulu
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    data = data.map(function(d) {
      return {
        timestamp: formatDateId(d.timestamp),
        nama_auditor: d.nama_auditor,
        lokasi_area: d.lokasi_area,
        tim_diaudit: d.tim_diaudit,
        nama_staf: d.nama_staf,
        skor_kebersihan: d.skor_kebersihan,
        status_kelayakan: d.status_kelayakan,
        catatan: d.catatan,
        foto_temuan: d.foto_temuan || ''
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── GENERAL CLEANING (GC) ─────────────────────────────────

/**
 * Simpan jadwal / eksekusi General Cleaning
 */
function saveGCExecution(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.lokasi_area || !payload.jenis_pekerjaan || !payload.tanggal_target || !payload.tim_pelaksana) {
      throw new Error('Lokasi, jenis pekerjaan, tanggal target, dan tim pelaksana wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.GC_EXECUTION);

      if (payload.id_gc) {
        // UPDATE
        var found = findRow(CONFIG.SHEETS.GC_EXECUTION, 'id_gc', payload.id_gc);
        if (!found) throw new Error('Data GC tidak ditemukan.');

        var updates = {
          lokasi_area: payload.lokasi_area,
          jenis_pekerjaan: payload.jenis_pekerjaan,
          tanggal_target: payload.tanggal_target,
          tim_pelaksana: payload.tim_pelaksana,
          penanggung_jawab: payload.penanggung_jawab || ''
        };

        if (payload.tanggal_selesai) updates.tanggal_selesai = payload.tanggal_selesai;
        if (payload.foto_before) updates.foto_before = payload.foto_before;
        if (payload.foto_after) updates.foto_after = payload.foto_after;
        if (payload.status_eksekusi) updates.status_eksekusi = payload.status_eksekusi;

        updateRowCells(CONFIG.SHEETS.GC_EXECUTION, found.rowIndex, updates);
        return successResponse(null, 'Data GC berhasil diperbarui.');

      } else {
        // CREATE
        var gcId = generateSequentialId('GC', CONFIG.SHEETS.GC_EXECUTION, 'id_gc');

        sheet.appendRow([
          gcId,
          payload.lokasi_area,
          payload.jenis_pekerjaan,
          payload.tanggal_target,
          payload.tim_pelaksana,
          payload.penanggung_jawab || user.nama,
          '',          // tanggal_selesai
          payload.foto_before || '',
          '',          // foto_after
          'Dijadwalkan'
        ]);

        return successResponse({ id_gc: gcId }, 'Jadwal GC "' + gcId + '" berhasil dibuat.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Update status eksekusi GC
 */
function updateGCStatus(gcId, newStatus, completionData) {
  try {
    var user = getActiveUserSession();

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.GC_EXECUTION, 'id_gc', gcId);
      if (!found) throw new Error('Data GC tidak ditemukan.');

      var updates = { status_eksekusi: newStatus };

      if (newStatus === 'Selesai') {
        updates.tanggal_selesai = now();
        if (completionData && completionData.foto_after) {
          updates.foto_after = completionData.foto_after;
        }
      }

      updateRowCells(CONFIG.SHEETS.GC_EXECUTION, found.rowIndex, updates);
      return successResponse(null, 'Status GC berhasil diubah ke "' + newStatus + '".');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan semua data GC Execution
 */
function getAllGCExecutions(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('gc_execution', CONFIG.SHEETS.GC_EXECUTION);

    if (filters) {
      if (filters.status && filters.status !== 'Semua') {
        data = data.filter(function(d) { return d.status_eksekusi === filters.status; });
      }
      if (filters.tim_pelaksana && filters.tim_pelaksana !== 'Semua') {
        data = data.filter(function(d) { return d.tim_pelaksana === filters.tim_pelaksana; });
      }
    }

    data = data.map(function(d) {
      return {
        id_gc: d.id_gc,
        lokasi_area: d.lokasi_area,
        jenis_pekerjaan: d.jenis_pekerjaan,
        tanggal_target: d.tanggal_target ? formatDateOnly(d.tanggal_target) : '-',
        tim_pelaksana: d.tim_pelaksana,
        penanggung_jawab: d.penanggung_jawab,
        tanggal_selesai: d.tanggal_selesai ? formatDateOnly(d.tanggal_selesai) : '-',
        foto_before: d.foto_before,
        foto_after: d.foto_after,
        status_eksekusi: d.status_eksekusi
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus data GC
 */
function deleteGCExecution(gcId) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.GC_EXECUTION, 'id_gc', gcId);
      if (!found) throw new Error('Data GC tidak ditemukan.');

      var sheet = getSheet(CONFIG.SHEETS.GC_EXECUTION);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Data GC berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi CS_Daily_Checklist ke Supabase
 */


/**
 * Migrasi Audit_Housekeeping ke Supabase
 */


/**
 * Migrasi GC_Execution ke Supabase
 */


// ─── MASTER CS SCHEDULE ─────────────────────────────────────

/**
 * [SUPABASE] Baca jadwal CS dari Supabase, fallback ke Sheets
 */
function getMasterCSScheduleFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'master_cs_schedule', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      Logger.log('Supabase Master_CS_Schedule: ' + result.length + ' entries');
      return result;
    }
    Logger.log('Supabase Master_CS_Schedule kosong, fallback ke Sheets');
    return getSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE);
  } catch (e) {
    Logger.log('Supabase error Master_CS_Schedule, fallback ke Sheets: ' + e.message);
    return getSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE);
  }
}

/**
 * Mendapatkan jadwal CS — PRIORITAS Supabase
 */
function getMasterCSSchedule() {
  try {
    var data = getMasterCSScheduleFromSupabase();
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan daftar lokasi area — PRIORITAS Supabase
 */
function getLocationList() {
  try {
    var data = getMasterCSScheduleFromSupabase();
    var locations = data.map(function(d) {
      return {
        lokasi_area: d.lokasi_area,
        tim_penanggungjawab: d.tim_penanggungjawab
      };
    });
    return successResponse(locations);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan jadwal CS — PRIORITAS Supabase
 */
function saveMasterCSSchedule(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    if (!payload.lokasi_area || !payload.tim_penanggungjawab) {
      throw new Error('Lokasi area dan tim penanggungjawab wajib diisi.');
    }
    var data = {
      lokasi_area: payload.lokasi_area,
      tim_penanggungjawab: payload.tim_penanggungjawab,
      frekuensi: payload.frekuensi || '',
      jam_target: payload.jam_target || ''
    };
    if (payload._rowIndex) {
      // UPDATE — _rowIndex = Supabase id
      var result = fetchSupabase('PATCH', 'master_cs_schedule', {
        query: 'id=eq.' + payload._rowIndex,
        data: data
      });
      if (result && result.success === false) throw new Error(result.error);
      return successResponse(null, 'Jadwal CS berhasil diperbarui.');
    } else {
      // CREATE
      var result = fetchSupabase('POST', 'master_cs_schedule', { data: data });
      if (result && result.success === false) throw new Error(result.error);
      return successResponse(null, 'Jadwal CS berhasil ditambahkan.');
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus jadwal CS — PRIORITAS Supabase
 */
function deleteMasterCSSchedule(rowIndex) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    // rowIndex = Supabase id
    var result = fetchSupabase('DELETE', 'master_cs_schedule', {
      query: 'id=eq.' + rowIndex
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Jadwal CS berhasil dihapus.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Migrasi data Master_CS_Schedule dari Sheets ke Supabase
 */


// ─── KPI HOUSEKEEPING ───────────────────────────────────────

/**
 * Hitung KPI Housekeeping
 *
 * 1. % Kepatuhan Daily CS = (Checklist "On Schedule" / Total Checklist) × 100%
 * 2. % Kepatuhan GC = (GC "Selesai" On-Time / Total Jadwal GC) × 100%
 *
 * @param {string} teamFilter - Filter tim: 'Housekeeping', 'General Services', atau '' untuk semua
 */
function calculateHousekeepingKPI(teamFilter) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var teamF = teamFilter || '';
    
    var checklists = getSheetData(CONFIG.SHEETS.CS_DAILY_CHECKLIST);
    var gcData = getSheetData(CONFIG.SHEETS.GC_EXECUTION);
    var audits = getSheetData(CONFIG.SHEETS.AUDIT_HOUSEKEEPING);
    
    // Filter by team jika ada
    if (teamF) {
      checklists = checklists.filter(function(d) { return d.tim === teamF; });
      gcData = gcData.filter(function(d) { return d.tim_pelaksana === teamF; });
      audits = audits.filter(function(d) { return d.tim_diaudit === teamF; });
    }

    // ─── KPI per Staff (dari Checklist) ─────────────────
    var staffKPI = {};

    checklists.forEach(function(c) {
      var nama = c.nama_staf;
      if (!nama) return;

      if (!staffKPI[nama]) {
        staffKPI[nama] = {
          nama: nama,
          tim: c.tim,
          total_checklist: 0,
          on_schedule: 0,
          delay: 0,
          kerusakan_ditemukan: 0,
          audit_count: 0,
          audit_total_skor: 0,
          audit_pass: 0
        };
      }

      staffKPI[nama].total_checklist++;
      if (c.kesesuaian_jadwal === 'On Schedule') staffKPI[nama].on_schedule++;
      if (c.kesesuaian_jadwal === 'Delay') staffKPI[nama].delay++;
      if (c.kondisi_fasilitas === 'Ada Kerusakan') staffKPI[nama].kerusakan_ditemukan++;
    });

    // Tambah data audit ke staff KPI
    audits.forEach(function(a) {
      var nama = a.nama_staf;
      if (!nama || !staffKPI[nama]) return;

      staffKPI[nama].audit_count++;
      staffKPI[nama].audit_total_skor += Number(a.skor_kebersihan) || 0;
      if (a.status_kelayakan === 'Pass') staffKPI[nama].audit_pass++;
    });

    var staffKPIData = Object.keys(staffKPI).map(function(key) {
      var s = staffKPI[key];
      var complianceRate = s.total_checklist > 0
        ? Math.round((s.on_schedule / s.total_checklist) * 10000) / 100
        : 0;
      var avgAuditScore = s.audit_count > 0
        ? Math.round((s.audit_total_skor / s.audit_count) * 100) / 100
        : 0;

      return {
        nama: s.nama,
        tim: s.tim,
        total_checklist: s.total_checklist,
        on_schedule: s.on_schedule,
        delay: s.delay,
        compliance_rate: complianceRate,
        kerusakan_ditemukan: s.kerusakan_ditemukan,
        avg_audit_score: avgAuditScore,
        audit_pass_rate: s.audit_count > 0
          ? Math.round((s.audit_pass / s.audit_count) * 10000) / 100
          : 0
      };
    });

    // ─── KPI General Cleaning ───────────────────────────
    var totalGC = gcData.length;
    var gcSelesai = gcData.filter(function(g) { return g.status_eksekusi === 'Selesai'; }).length;
    var gcOnTime = gcData.filter(function(g) {
      if (g.status_eksekusi !== 'Selesai') return false;
      if (!g.tanggal_selesai || !g.tanggal_target) return false;
      return new Date(g.tanggal_selesai) <= new Date(g.tanggal_target);
    }).length;

    var gcComplianceRate = totalGC > 0
      ? Math.round((gcOnTime / totalGC) * 10000) / 100
      : 0;

    // ─── Overall Summary ────────────────────────────────
    var totalChecklists = checklists.length;
    var totalOnSchedule = checklists.filter(function(c) { return c.kesesuaian_jadwal === 'On Schedule'; }).length;
    var dailyComplianceRate = totalChecklists > 0
      ? Math.round((totalOnSchedule / totalChecklists) * 10000) / 100
      : 0;

    var label = teamF || 'Semua Tim';
    return successResponse({
      teamFilter: teamF,
      teamLabel: label,
      staffKPI: staffKPIData,
      gcKPI: {
        total: totalGC,
        selesai: gcSelesai,
        onTime: gcOnTime,
        complianceRate: gcComplianceRate
      },
      dailyKPI: {
        total: totalChecklists,
        onSchedule: totalOnSchedule,
        complianceRate: dailyComplianceRate
      }
    }, 'KPI ' + label + ' berhasil dikalkulasi.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    GOOGLE DRIVE UPLOAD — Foto Audit                      ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Upload foto audit ke Google Drive
 * Menerima base64 string, simpan ke folder GA_Audit_Photos, return URL
 *
 * @param {string} base64Data - String base64 dari file (tanpa prefix data:image/...)
 * @param {string} fileName - Nama file
 * @return {Object} { url, name, id }
 */
function uploadAuditPhoto(base64Data, fileName) {
  try {
    var user = getActiveUserSession();
    
    if (!base64Data) {
      return errorResponse('Data foto kosong.');
    }
    
    // Batasi ukuran: max 5MB (base64 ~= 1.37x ukuran asli)
    if (base64Data.length > 7000000) {
      return errorResponse('Ukuran foto terlalu besar. Maksimal 5MB.');
    }
    
    // Cari atau buat folder GA_Photos di parent folder spreadsheet
    // (1 lokasi dengan spreadsheet aplikasi)
    var folder = getAppPhotoFolder('GA_Photos');
    
    // Decode base64 → blob
    var rawData = Utilities.base64Decode(base64Data);
    var timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
    
    // Sanitasi nama file
    var safeName = (fileName || ('audit_' + timestamp + '.jpg')).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    
    // Tentukan MIME type dari ekstensi
    var ext = safeName.split('.').pop().toLowerCase();
    var mimeMap = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', jpeg: 'image/jpeg', jpg: 'image/jpeg', heic: 'image/heic', bmp: 'image/bmp' };
    var mimeType = mimeMap[ext] || 'image/jpeg';
    
    var blob = Utilities.newBlob(rawData, mimeType, safeName);
    
    // Simpan ke Google Drive
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    Logger.log('✅ Audit photo uploaded: ' + file.getName() + ' → ' + file.getUrl());
    
    return successResponse({
      url: file.getUrl(),
      name: file.getName(),
      id: file.getId()
    }, 'Foto berhasil diupload ke Google Drive.');
    
  } catch (e) {
    Logger.log('❌ Gagal upload foto audit: ' + e.message);
    return errorResponse('Gagal upload foto: ' + e.message);
  }
}



function getAllMasterLokasi() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_LOKASI);
    
    if (!sheet) {
      // Sheet belum ada — buat dengan lock (cegah race condition)
      return withLock(function() {
        var existing = ss.getSheetByName(CONFIG.SHEETS.MASTER_LOKASI);
        if (existing) {
          return successResponse(getCachedSheetData(CONFIG.SHEETS.MASTER_LOKASI, 30));
        }
        createMasterLokasiSheetInternal(ss);
        return successResponse([]);
      });
    }
    
    var data = getCachedSheetData(CONFIG.SHEETS.MASTER_LOKASI, 30);
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function saveMasterLokasi(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!payload.nama_lokasi || !payload.area) {
      throw new Error('Nama lokasi dan area wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MASTER_LOKASI);
      invalidateSheetCache(CONFIG.SHEETS.MASTER_LOKASI);

      if (payload._rowIndex) {
        // UPDATE
        updateRowCells(CONFIG.SHEETS.MASTER_LOKASI, payload._rowIndex, {
          nama_lokasi: payload.nama_lokasi,
          area: payload.area,
          tim_penanggungjawab: payload.tim_penanggungjawab || '',
          status: payload.status || 'Aktif'
        });
        return successResponse(null, 'Lokasi berhasil diperbarui.');
      } else {
        // CREATE
        var idLokasi = generateSequentialId('LOK', CONFIG.SHEETS.MASTER_LOKASI, 'id_lokasi');
        sheet.appendRow([
          idLokasi,
          payload.nama_lokasi.trim(),
          payload.area.trim(),
          payload.tim_penanggungjawab || '',
          payload.status || 'Aktif'
        ]);
        return successResponse(null, 'Lokasi "' + payload.nama_lokasi + '" berhasil ditambahkan.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function deleteMasterLokasi(rowIndex) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MASTER_LOKASI);
      sheet.deleteRow(rowIndex);
      invalidateSheetCache(CONFIG.SHEETS.MASTER_LOKASI);
      return successResponse(null, 'Lokasi berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function createMasterLokasiSheetInternal(ss) {
  var headers = ['id_lokasi', 'nama_lokasi', 'area', 'tim_penanggungjawab', 'status'];
  var newSheet = ss.insertSheet(CONFIG.SHEETS.MASTER_LOKASI);
  newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var hr = newSheet.getRange(1, 1, 1, headers.length);
  hr.setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  newSheet.setFrozenRows(1);
  for (var i = 1; i <= headers.length; i++) {
    newSheet.setColumnWidth(i, 150);
  }
  Logger.log('✅ Master_Lokasi sheet auto-created with lock.');
}