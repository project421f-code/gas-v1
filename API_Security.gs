/**
 * ============================================================
 * API_Security.gs — Modul Security (Patroli & Inspeksi Kendaraan)
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── PATROL LOG ─────────────────────────────────────────────

/**
 * Simpan log patroli (dari QR scan checkpoint)
 */
function savePatrolLog(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.pos_checkpoint || !payload.kondisi_area) {
      throw new Error('Pos checkpoint dan kondisi area wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.PATROL_LOG);
      var timestamp = now();
      var dateFormatted = Utilities.formatDate(timestamp, CONFIG.TIMEZONE, 'yyyy-MM-dd');

      // Deteksi shift berdasarkan jam
      var hour = parseInt(Utilities.formatDate(timestamp, CONFIG.TIMEZONE, 'HH'));
      var shift = 'Shift 1 (Pagi)';
      if (hour >= 14 && hour < 22) shift = 'Shift 2 (Siang)';
      else if (hour >= 22 || hour < 6) shift = 'Shift 3 (Malam)';

      var tanggalShift = dateFormatted + ' / ' + shift;

      sheet.appendRow([
        timestamp,
        tanggalShift,
        payload.nama_personel || user.nama,
        payload.pos_checkpoint,
        payload.kondisi_area,
        payload.catatan_temuan || ''
      ]);

      return successResponse(null, 'Log patroli berhasil dicatat untuk ' + payload.pos_checkpoint + '.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan semua log patroli
 */
function getAllPatrolLogs(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('patrol_log', CONFIG.SHEETS.PATROL_LOG);

    if (filters) {
      if (filters.nama_personel) {
        data = data.filter(function(d) { return d.nama_personel === filters.nama_personel; });
      }
      if (filters.tanggal) {
        data = data.filter(function(d) {
          var ts = Utilities.formatDate(new Date(d.timestamp), CONFIG.TIMEZONE, 'yyyy-MM-dd');
          return ts === filters.tanggal;
        });
      }
      if (filters.kondisi) {
        data = data.filter(function(d) { return d.kondisi_area === filters.kondisi; });
      }
    }

    // Sort terbaru dulu
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    data = data.map(function(d) {
      return {
        timestamp: formatDateId(d.timestamp),
        tanggal_shift: d.tanggal_shift,
        nama_personel: d.nama_personel,
        pos_checkpoint: d.pos_checkpoint,
        kondisi_area: d.kondisi_area,
        catatan_temuan: d.catatan_temuan
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── ASSET INSPECTION (Kendaraan) ───────────────────────────

/**
 * Simpan data inspeksi kendaraan bulanan
 */
function saveAssetInspection(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.no_polisi || !payload.bulan_tahun) {
      throw new Error('Nomor polisi dan bulan/tahun wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.ASSET_INSPECTION);
      var data = getSheetData(CONFIG.SHEETS.ASSET_INSPECTION);

      // Cek apakah sudah ada entry untuk kendaraan + bulan ini
      var existingRow = null;
      for (var i = 0; i < data.length; i++) {
        if (data[i].no_polisi === payload.no_polisi &&
            data[i].bulan_tahun === payload.bulan_tahun) {
          existingRow = data[i];
          break;
        }
      }

      if (existingRow) {
        // UPDATE
        var updates = {};
        if (payload.status_cek_fisik) updates.status_cek_fisik = payload.status_cek_fisik;
        if (payload.jadwal_cek_fisik) updates.jadwal_cek_fisik = payload.jadwal_cek_fisik;
        if (payload.status_pencucian) updates.status_pencucian = payload.status_pencucian;
        if (payload.jadwal_pencucian) updates.jadwal_pencucian = payload.jadwal_pencucian;
        if (payload.petugas) updates.petugas = payload.petugas;

        updateRowCells(CONFIG.SHEETS.ASSET_INSPECTION, existingRow._rowIndex, updates);
        return successResponse(null, 'Data inspeksi berhasil diperbarui.');
      } else {
        // CREATE
        sheet.appendRow([
          payload.bulan_tahun,
          payload.no_polisi,
          payload.jenis_tipe || '',
          payload.jadwal_cek_fisik || '',
          payload.status_cek_fisik || 'Belum',
          payload.jadwal_pencucian || '',
          payload.status_pencucian || 'Belum',
          payload.petugas || user.nama
        ]);
        return successResponse(null, 'Data inspeksi berhasil ditambahkan.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan semua data inspeksi kendaraan
 */
function getAllAssetInspections(filters) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('asset_inspection', CONFIG.SHEETS.ASSET_INSPECTION);

    if (filters) {
      if (filters.bulan_tahun) {
        data = data.filter(function(d) { return d.bulan_tahun === filters.bulan_tahun; });
      }
      if (filters.no_polisi) {
        data = data.filter(function(d) { return d.no_polisi === filters.no_polisi; });
      }
    }

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus 1 baris inspeksi berdasarkan nomor baris sheet
 * @param {number} rowIndex - nomor baris di sheet (_rowIndex)
 */
function deleteAssetInspection(rowIndex) {
  try {
    var user = getActiveUserSession();
    if (!rowIndex) throw new Error('ID inspeksi tidak valid.');
    return withLock(function() {
      var result = fetchSupabase('DELETE', 'asset_inspection', { query: 'id=eq.' + rowIndex });
      if (result && result.success === false) throw new Error(result.error || 'Gagal hapus inspeksi');
      return successResponse(null, 'Inspeksi berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── KPI SECURITY ───────────────────────────────────────────

/**
 * Hitung & simpan KPI Security
 */
function calculateSecurityKPI() {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var patrols = getSheetData(CONFIG.SHEETS.PATROL_LOG);
    var inspections = getSheetData(CONFIG.SHEETS.ASSET_INSPECTION);

    var kpiMap = {};

    // Hitung patroli per personel
    patrols.forEach(function(p) {
      var nama = p.nama_personel;
      if (!nama) return;

      if (!kpiMap[nama]) {
        kpiMap[nama] = {
          nama_anggota: nama,
          shifts: {},
          total_patroli: 0,
          expected_patroli: 0,
          inspeksi_selesai: 0,
          insiden: 0
        };
      }

      kpiMap[nama].total_patroli++;

      // Track shift
      var shift = (p.tanggal_shift || '').split(' / ')[1] || 'Unknown';
      kpiMap[nama].shifts[shift] = (kpiMap[nama].shifts[shift] || 0) + 1;

      // Count incidents
      if (p.kondisi_area === 'Ada Masalah' || p.kondisi_area === 'Darurat') {
        kpiMap[nama].insiden++;
      }
    });

    // Hitung inspeksi per petugas
    inspections.forEach(function(ins) {
      var petugas = ins.petugas;
      if (!petugas || !kpiMap[petugas]) return;

      if (ins.status_cek_fisik === 'Selesai') {
        kpiMap[petugas].inspeksi_selesai++;
      }
    });

    // Hitung KPI — baca dari Supabase (dengan fallback ke Sheets)
    var checkpointData = getPatrolCheckpointsFromSupabase();
    var totalCheckpoints = checkpointData.filter(function(c) { return c.status === 'Aktif'; }).length;
    if (totalCheckpoints === 0) totalCheckpoints = checkpointData.length;
    if (totalCheckpoints === 0) totalCheckpoints = 1;
    var kpiData = Object.keys(kpiMap).map(function(key) {
      var k = kpiMap[key];

      // Shift dominan
      var maxShift = 'N/A';
      var maxCount = 0;
      for (var shift in k.shifts) {
        if (k.shifts[shift] > maxCount) {
          maxCount = k.shifts[shift];
          maxShift = shift;
        }
      }

      // Hitung expected patroli (totalCheckpoints * jumlah hari unik)
      var uniqueDays = {};
      patrols.forEach(function(p) {
        if (p.nama_personel === key) {
          var day = Utilities.formatDate(new Date(p.timestamp), CONFIG.TIMEZONE, 'yyyy-MM-dd');
          uniqueDays[day] = true;
        }
      });
      var daysWorked = Object.keys(uniqueDays).length;
      var expected = daysWorked * totalCheckpoints;
      var complianceRate = expected > 0
        ? Math.round((k.total_patroli / expected) * 10000) / 100
        : 0;

      // Skor Performa
      var skor = 'Perlu Perbaikan';
      if (complianceRate >= 90) skor = 'Excellent';
      else if (complianceRate >= 75) skor = 'Baik';
      else if (complianceRate >= 60) skor = 'Cukup';

      return {
        nama_anggota: k.nama_anggota,
        shift_dominan: maxShift,
        persen_kepatuhan_patroli: complianceRate,
        inspeksi_selesai: k.inspeksi_selesai,
        insiden_keamanan: k.insiden,
        skor_performa: skor
      };
    });

    // Update sheet KPI_Security
    var sheet = getSheet(CONFIG.SHEETS.KPI_SECURITY);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }

    kpiData.forEach(function(k) {
      sheet.appendRow([
        k.nama_anggota,
        k.shift_dominan,
        k.persen_kepatuhan_patroli / 100,
        k.inspeksi_selesai,
        k.insiden_keamanan,
        k.skor_performa
      ]);
    });

    return successResponse(kpiData, 'KPI Security berhasil dikalkulasi.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan data KPI Security
 */
function getSecurityKPI() {
  try {
    var data = getDataFromSupabase('kpi_security', CONFIG.SHEETS.KPI_SECURITY);

    data = data.map(function(d) {
      return {
        nama_anggota: d.nama_anggota,
        shift_dominan: d.shift_dominan,
        persen_kepatuhan_patroli: typeof d.persen_kepatuhan_patroli === 'number' && d.persen_kepatuhan_patroli < 1
          ? Math.round(d.persen_kepatuhan_patroli * 10000) / 100
          : d.persen_kepatuhan_patroli,
        inspeksi_selesai: d.inspeksi_selesai,
        insiden_keamanan: d.insiden_keamanan,
        skor_performa: d.skor_performa
      };
    });

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi Patrol_Log ke Supabase
 */


/**
 * Migrasi Asset_Inspection ke Supabase
 */


/**
 * Migrasi KPI_Security ke Supabase
 */


// ─── MASTER PATROL CHECKPOINTS ─────────────────────────────

/**
 * [SUPABASE] Baca checkpoint dari Supabase, fallback ke Sheets
 */
function getPatrolCheckpointsFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'master_patrol_checkpoints', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      Logger.log('Supabase Patrol_Checkpoints: ' + result.length);
      return result;
    }
    Logger.log('Supabase Patrol_Checkpoints kosong, fallback ke Sheets');
    return getSheetData(CONFIG.SHEETS.PATROL_CHECKPOINTS);
  } catch (e) {
    Logger.log('Supabase error Patrol_Checkpoints, fallback ke Sheets: ' + e.message);
    return getSheetData(CONFIG.SHEETS.PATROL_CHECKPOINTS);
  }
}

/**
 * Mendapatkan semua data checkpoint — PRIORITAS Supabase
 */
function getAllPatrolCheckpoints() {
  try {
    return successResponse(getPatrolCheckpointsFromSupabase());
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Simpan checkpoint baru — PRIORITAS Supabase
 */
function savePatrolCheckpoint(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    if (!payload.nama_pos || !payload.area) throw new Error('Nama pos dan area wajib diisi.');
    
    // Generate id_pos dari Supabase
    var year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');
    var pattern = 'CP-' + year + '-';
    var maxResult = fetchSupabase('GET', 'master_patrol_checkpoints', {
      query: 'id_pos=like.' + encodeURIComponent(pattern + '%') + '&order=id_pos.desc&limit=1'
    });
    var lastNum = 0;
    if (maxResult && Array.isArray(maxResult) && maxResult.length > 0) {
      var idStr = maxResult[0].id_pos || '';
      var num = parseInt(idStr.replace(pattern, ''), 10);
      if (!isNaN(num)) lastNum = num;
    }
    var nextNumStr = String(lastNum + 1);
    while (nextNumStr.length < 4) nextNumStr = '0' + nextNumStr;
    var idPos = pattern + nextNumStr;
    
    var result = fetchSupabase('POST', 'master_patrol_checkpoints', {
      data: { id_pos: idPos, nama_pos: payload.nama_pos.trim(), area: payload.area.trim(), status: payload.status || 'Aktif' }
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Checkpoint "' + payload.nama_pos + '" berhasil ditambahkan.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Update data checkpoint — PRIORITAS Supabase
 */
function updatePatrolCheckpoint(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    if (!payload.id_pos) throw new Error('ID pos wajib diisi.');
    var updates = {};
    if (payload.nama_pos) updates.nama_pos = payload.nama_pos.trim();
    if (payload.area) updates.area = payload.area.trim();
    if (payload.status) updates.status = payload.status;
    var result = fetchSupabase('PATCH', 'master_patrol_checkpoints', {
      query: 'id_pos=eq.' + encodeURIComponent(payload.id_pos),
      data: updates
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Checkpoint berhasil diperbarui.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Hapus checkpoint — PRIORITAS Supabase
 */
function deletePatrolCheckpoint(idPos) {
  try {
    var user = getActiveUserSession(); requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    if (!idPos) throw new Error('ID pos wajib diisi.');
    var result = fetchSupabase('DELETE', 'master_patrol_checkpoints', {
      query: 'id_pos=eq.' + encodeURIComponent(idPos)
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Checkpoint berhasil dihapus.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Migrasi data Master_Patrol_Checkpoints ke Supabase
 */


// ─── MASTER PATROL SCHEDULE ────────────────────────────────

/**
 * [SUPABASE] Baca jadwal patroli dari Supabase, fallback ke Sheets
 */
function getPatrolSchedulesFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'master_patrol_schedule', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      Logger.log('Supabase Patrol_Schedule: ' + result.length);
      return result;
    }
    Logger.log('Supabase Patrol_Schedule kosong, fallback ke Sheets');
    return getSheetData(CONFIG.SHEETS.PATROL_SCHEDULE);
  } catch (e) {
    Logger.log('Supabase error Patrol_Schedule, fallback ke Sheets: ' + e.message);
    return getSheetData(CONFIG.SHEETS.PATROL_SCHEDULE);
  }
}

/**
 * Mendapatkan semua jadwal patroli — PRIORITAS Supabase
 */
function getAllPatrolSchedules() {
  try {
    return successResponse(getPatrolSchedulesFromSupabase());
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Simpan jadwal patroli — PRIORITAS Supabase
 */
function savePatrolSchedule(payload) {
  try {
    var user = getActiveUserSession(); requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    if (!payload.hari || !payload.shift || !payload.nama_personel) throw new Error('Hari, shift, dan nama personel wajib diisi.');
    
    // Generate id_jadwal dari Supabase
    var year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');
    var pattern = 'SCH-' + year + '-';
    var maxResult = fetchSupabase('GET', 'master_patrol_schedule', {
      query: 'id_jadwal=like.' + encodeURIComponent(pattern + '%') + '&order=id_jadwal.desc&limit=1'
    });
    var lastNum = 0;
    if (maxResult && Array.isArray(maxResult) && maxResult.length > 0) {
      var idStr = maxResult[0].id_jadwal || '';
      var num = parseInt(idStr.replace(pattern, ''), 10);
      if (!isNaN(num)) lastNum = num;
    }
    var nextNumStr = String(lastNum + 1);
    while (nextNumStr.length < 4) nextNumStr = '0' + nextNumStr;
    var idJadwal = pattern + nextNumStr;
    
    var result = fetchSupabase('POST', 'master_patrol_schedule', {
      data: { id_jadwal: idJadwal, hari: payload.hari.trim(), shift: payload.shift.trim(), nama_personel: payload.nama_personel.trim(), jam_mulai: payload.jam_mulai || '', jam_selesai: payload.jam_selesai || '' }
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Jadwal patroli berhasil ditambahkan.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Hapus jadwal patroli — PRIORITAS Supabase
 */
function deletePatrolSchedule(idJadwal) {
  try {
    var user = getActiveUserSession(); requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    if (!idJadwal) throw new Error('ID jadwal wajib diisi.');
    var result = fetchSupabase('DELETE', 'master_patrol_schedule', {
      query: 'id_jadwal=eq.' + encodeURIComponent(idJadwal)
    });
    if (result && result.success === false) throw new Error(result.error);
    return successResponse(null, 'Jadwal patroli berhasil dihapus.');
  } catch (e) { return errorResponse(e.message); }
}

/**
 * Migrasi data Master_Patrol_Schedule ke Supabase
 */



function getSecurityStaff() {
  try {
    var userData = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 300);
    var staff = userData.filter(function(d) {
      return (d.tim === 'Security' || d.role === 'Staff') && d.status === 'Aktif';
    }).map(function(d) {
      return { nama: d.nama, tim: d.tim, no_wa: d.no_wa || '' };
    });
    return successResponse(staff);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getPatrolScheduleById(idJadwal) {
  try {
    var user = getActiveUserSession();
    if (!idJadwal) throw new Error('ID jadwal wajib diisi.');
    var found = findRow(CONFIG.SHEETS.PATROL_SCHEDULE, 'id_jadwal', idJadwal);
    if (!found) throw new Error('Jadwal tidak ditemukan.');
    return successResponse(found.data);
  } catch (e) {
    return errorResponse(e.message);
  }
}