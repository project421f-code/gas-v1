/**
 * ============================================================
 * DB_Layer.gs — Database Layer (Google Spreadsheet ONLY)
 * GA Operations Management System v2.0
 * ============================================================
 * Pengganti total integrasi Supabase.
 *
 * Semua helper yang dulu memanggil Supabase REST API sekarang
 * membaca/menulis LANGSUNG ke Google Spreadsheet via SpreadsheetApp.
 *
 * ⚠️  FUNGSI INI MIRIP SUPABASE UNTUK KOMPATIBILITAS — bukan Supabase.
 *     Nama fungsi dipertahankan agar seluruh API_*.gs tetap berfungsi
 *     tanpa perubahan kode.
 */

// ─── MAPPING TABEL (supabase) → SHEET (spreadsheet) ─────────
var TABLE_TO_SHEET = {
  user_list:              'User_List',
  main_data:              'Main_Data',
  master_sla:             'Master_SLA',
  dashboard_kpi_mnt:      'Dashboard_KPI_Mnt',
  patrol_log:             'Patrol_Log',
  asset_inspection:       'Asset_Inspection',
  kpi_security:           'KPI_Security',
  asset_booking:          'Asset_Booking',
  asset_list:             'Asset_List',
  audit_housekeeping:     'Audit_Housekeeping',
  cs_daily_checklist:     'CS_Daily_Checklist',
  master_cs_schedule:     'Master_CS_Schedule',
  gc_execution:           'GC_Execution',
  master_patrol_checkpoints: 'Master_Patrol_Checkpoints',
  master_patrol_schedule: 'Master_Patrol_Schedule',
  survey_ga:              'Survey_GA',
  master_survey_config:   'Master_Survey_Config',
  master_kos:             'Master_Kos',
  master_kamar:           'Master_Kamar',
  guest_booking:          'Guest_Booking',
  guest_bookings:         'Guest_Booking',
  room_status_log:        'Room_Status_Log'
};

/**
 * Terjemahkan nama tabel → nama sheet
 * Fallback: gunakan nama tabel langsung (snake_case → Title_Case)
 */
function tableToSheet(tableName) {
  if (TABLE_TO_SHEET[tableName]) return TABLE_TO_SHEET[tableName];
  // Fallback: user_list → User_List, main_data → Main_Data
  var parts = String(tableName).split('_');
  var out = parts.map(function(p) {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join('_');
  return out;
}

/**
 * Append 1 atau banyak baris ke sheet
 * @param {string} sheetName
 * @param {Object|Array} rows - objek atau array of objects (kolom = header)
 */
function appendRows(sheetName, rows) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var arr = Array.isArray(rows) ? rows : [rows];

  arr.forEach(function(row) {
    var newRow = [];
    for (var j = 0; j < headers.length; j++) {
      var val = row[headers[j]];
      newRow.push(val !== undefined ? val : '');
    }
    sheet.appendRow(newRow);
  });
  return { success: true, inserted: arr.length };
}

/**
 * Hapus 1 baris berdasarkan nomor baris sheet
 */
function deleteSheetRow(sheetName, rowIndex) {
  var sheet = getSheet(sheetName);
  sheet.deleteRow(rowIndex);
  return { success: true, deleted: true };
}

/**
 * Parse query PostgREST sederhana menjadi { filters, orderBy, orderDir, limit, select }
 * Format: col=eq.val&col2=neq.val2&order=col.asc&limit=10&select=a,b
 */
function parseQuery(query) {
  var out = { filters: [], orderBy: null, orderDir: 'asc', limit: null, select: null };
  if (!query) return out;
  String(query).split('&').forEach(function(token) {
    if (!token) return;
    var eq = token.indexOf('=');
    if (eq === -1) return;
    var left = token.substring(0, eq);
    var right = decodeURIComponent(token.substring(eq + 1));

    if (left === 'order') {
      var parts = right.split('.');
      out.orderBy = parts[0];
      out.orderDir = parts[1] === 'desc' ? 'desc' : 'asc';
    } else if (left === 'limit') {
      out.limit = parseInt(right, 10) || null;
    } else if (left === 'select') {
      out.select = right.split(',').map(function(s) { return s.trim(); });
    } else {
      // col=op.value (eq, neq, gt, gte, lt, lte, like, is, in)
      var dot = right.indexOf('.');
      var op = dot === -1 ? 'eq' : right.substring(0, dot);
      var val = dot === -1 ? right : right.substring(dot + 1);
      out.filters.push({ col: left, op: op, val: val });
    }
  });
  return out;
}

/**
 * Terapkan filter, order, limit ke array of objects
 */
function applyQuery(data, query) {
  var q = parseQuery(query);

  // Filters
  q.filters.forEach(function(f) {
    data = data.filter(function(row) {
      var cell = row[f.col];
      var str = String(cell === undefined ? '' : cell).trim();
      var target = String(f.val === undefined ? '' : f.val).trim();
      switch (f.op) {
        case 'eq':   return str === target;
        case 'neq':  return str !== target;
        case 'gt':   return parseFloat(cell) > parseFloat(f.val);
        case 'gte':  return parseFloat(cell) >= parseFloat(f.val);
        case 'lt':   return parseFloat(cell) < parseFloat(f.val);
        case 'lte':  return parseFloat(cell) <= parseFloat(f.val);
        case 'like': return str.indexOf(target.replace(/%/g, '')) !== -1;
        case 'is':
          if (target === 'null') return cell === '' || cell === null || cell === undefined;
          return str === target;
        case 'in':
          return target.indexOf(str) !== -1;
        default: return true;
      }
    });
  });

  // Order
  if (q.orderBy) {
    data.sort(function(a, b) {
      var av = a[q.orderBy], bv = b[q.orderBy];
      var cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return q.orderDir === 'desc' ? -cmp : cmp;
    });
  }

  // Limit
  if (q.limit && q.limit > 0) {
    data = data.slice(0, q.limit);
  }

  // Select — sertakan selalu id (rowIndex) & _rowIndex untuk kompatibilitas
  if (q.select) {
    data = data.map(function(row) {
      var out = { id: row.id !== undefined ? row.id : row._rowIndex };
      q.select.forEach(function(col) {
        if (col !== 'id') out[col] = row[col];
      });
      return out;
    });
  }

  return data;
}

// ╔══════════════════════════════════════════════════════════╗
// ║    KOMPATIBILITAS — HELPER SUPABASE (SPREADSHEET ONLY)   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * [SPREADSHEET] Emulator fetchSupabase()
 * method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
 * options: { query, data, select }
 */
function fetchSupabase(method, table, options) {
  var sheetName = tableToSheet(table);
  options = options || {};

  try {
    if (method === 'GET') {
      var data = getSheetData(sheetName);
      data = data.map(function(row) {
        // id = nomor baris sheet (kompatibel dengan kode lama yang pakai .id)
        row.id = row._rowIndex;
        return row;
      });
      var result = applyQuery(data, options.query);
      return result;
    }

    if (method === 'HEAD') {
      var dataH = getSheetData(sheetName);
      var resultH = applyQuery(dataH, options.query);
      return { success: true, count: resultH.length, data: [] };
    }

    if (method === 'POST') {
      return appendRows(sheetName, options.data);
    }

    if (method === 'PATCH') {
      var q = parseQuery(options.query);
      var rows = getSheetData(sheetName);
      var updated = 0;
      rows.forEach(function(row) {
        var match = q.filters.every(function(f) {
          // Kolom 'id' dianggap nomor baris sheet (_rowIndex)
          var cell = (f.col === 'id') ? row._rowIndex : row[f.col];
          var str = String(cell === undefined ? '' : cell).trim();
          var target = String(f.val === undefined ? '' : f.val).trim();
          if (f.op === 'eq') return str === target;
          if (f.op === 'gte') return parseFloat(cell) >= parseFloat(f.val);
          if (f.op === 'lte') return parseFloat(cell) <= parseFloat(f.val);
          return true;
        });
        if (match && options.data) {
          updateRowCells(sheetName, row._rowIndex, options.data);
          updated++;
        }
      });
      return { success: true, updated: updated };
    }

    if (method === 'DELETE') {
      var qd = parseQuery(options.query);
      var rowsD = getSheetData(sheetName);
      var deleted = 0;
      // Hapus dari bawah ke atas agar nomor baris tidak bergeser
      for (var di = rowsD.length - 1; di >= 0; di--) {
        var row = rowsD[di];
        var match = qd.filters.every(function(f) {
          var cell = (f.col === 'id') ? row._rowIndex : row[f.col];
          var str = String(cell === undefined ? '' : cell).trim();
          var target = String(f.val === undefined ? '' : f.val).trim();
          if (f.op === 'eq') return str === target;
          if (f.op === 'gte') return parseFloat(cell) >= parseFloat(f.val);
          return true;
        });
        if (match) {
          try { deleteSheetRow(sheetName, row._rowIndex); deleted++; } catch (e) { Logger.log('DELETE row error: ' + e.message); }
        }
      }
      return { success: true, deleted: deleted };
    }

    return { success: false, error: 'Method tidak dikenal: ' + method };
  } catch (e) {
    Logger.log('DB_Layer fetchSupabase error [' + method + ' ' + table + ']: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * [SPREADSHEET] Cari satu baris — mirip findRow() tapi kompatibel
 * dengan pemanggil lama yang mengirim (tableName, sheetName, keyField, keyValue)
 * @return {Object|null} { rowIndex, data } atau null
 */
function findInSupabase(tableName, sheetName, keyField, keyValue) {
  var sheet = sheetName || tableToSheet(tableName);
  var found = findRow(sheet, keyField, keyValue);
  if (found) {
    found.data.id = found.rowIndex;
  }
  return found;
}

/**
 * [SPREADSHEET] Baca data tabel — kompatibel getDataFromSupabase()
 * @param {string} tableName - nama tabel (diabaikan, pakai sheetName)
 * @param {string} sheetName - nama sheet di spreadsheet
 * @param {string} orderBy - kolom order (opsional)
 * @param {string} orderDir - 'asc' | 'desc'
 */
function getDataFromSupabase(tableName, sheetName, orderBy, orderDir) {
  var sheet = sheetName || tableToSheet(tableName);
  var data = getSheetData(sheet);
  data.forEach(function(row) { row.id = row._rowIndex; });

  if (orderBy) {
    data.sort(function(a, b) {
      var cmp = String(a[orderBy]).localeCompare(String(b[orderBy]), undefined, { numeric: true });
      return (orderDir === 'desc') ? -cmp : cmp;
    });
  }
  return data;
}

/**
 * [SPREADSHEET] Generate sequential ID — kompatibel generateSupabaseSequentialId()
 * Contoh: 'USR-2026-0001'
 * @param {string} prefix - 'USR' | 'BKG' | 'KOS' | 'KMR' | dll
 * @param {string} tableName - nama tabel (untuk mapping sheet)
 * @param {string} idField - kolom ID
 * @param {string} sheetName - sheet (opsional, fallback mapping)
 */
function generateSupabaseSequentialId(prefix, tableName, idField, sheetName) {
  var sheet = sheetName || tableToSheet(tableName);
  return generateSequentialId(prefix, sheet, idField);
}

/**
 * [SPREADSHEET] Cek bahwa konfigurasi spreadsheet tersedia
 * (pengganti testSupabaseConnection — test koneksi spreadsheet)
 */
function testSupabaseConnection() {
  try {
    var ss = getSpreadsheet();
    var names = ss.getSheets().map(function(s) { return s.getName(); });
    return {
      success: true,
      data: { sheets: names, spreadsheetId: CONFIG.SPREADSHEET_ID },
      message: '✅ Koneksi Spreadsheet berhasil! ' + names.length + ' sheet ditemukan.'
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * [SPREADSHEET] Setup tidak diperlukan lagi — spreadsheet adalah database
 */
function setupSupabase() {
  return { success: true, message: '✅ Database menggunakan Google Spreadsheet. Tidak perlu konfigurasi Supabase.' };
}
