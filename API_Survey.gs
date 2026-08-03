/**
 * ============================================================
 * API_Survey.gs — Modul Survey Kepuasan Pelayanan GA
 * GA Operations Management System v1.0
 * ============================================================
 *
 * Survey bulanan untuk menilai pelayanan 4 tim GA:
 * - Maintenance (Teknisi)
 * - Housekeeping (Kebersihan Kamar)
 * - General Services (Kebersihan Area Umum)
 * - Asset Inventory (Peminjaman Aset)
 *
 * Kriteria penilaian (1-5):
 * 1. Keramahan & Sopan Santun
 * 2. Fast Response (Kecepatan Tanggap)
 * 3. Senyum Salam Sapa (3S)
 * 4. Kualitas Hasil Kerja
 * 5. Kemudahan Komunikasi
 */

// ─── SURVEY CONFIG ─────────────────────────────────────────

// ─── SURVEY CONFIG (Default/Hardcoded — fallback jika sheet tidak tersedia) ───

var SURVEY_CONFIG = {
  TEAMS: [
    { id: 'mnt', label: 'Maintenance', icon: '🔧', desc: 'Tim perbaikan & penanganan komplain' },
    { id: 'hk', label: 'Housekeeping', icon: '🧹', desc: 'Tim kebersihan kamar & area dalam' },
    { id: 'gs', label: 'General Services', icon: '✨', desc: 'Tim kebersihan area umum & outdoor' },
    { id: 'aset', label: 'Asset Inventory', icon: '📦', desc: 'Tim peminjaman ruangan & kendaraan' }
  ],
  CRITERIA: [
    { id: 'keramahan', label: 'Keramahan & Sopan Santun', icon: '😊' },
    { id: 'fast_response', label: 'Fast Response (Kecepatan Tanggap)', icon: '⚡' },
    { id: '3s', label: 'Senyum Salam Sapa (3S)', icon: '🤝' },
    { id: 'kualitas_kerja', label: 'Kualitas Hasil Kerja', icon: '🏆' },
    { id: 'komunikasi', label: 'Kemudahan Komunikasi', icon: '💬' }
  ]
};

// ─── DYNAMIC SURVEY CONFIG (dari Master_Survey_Config sheet) ───

/**
 * [SUPABASE] Baca konfigurasi survey dari Supabase, fallback ke Sheets/SURVEY_CONFIG
 */
function getSurveyConfigFromSupabase() {
  try {
    var result = fetchSupabase('GET', 'master_survey_config', {
      query: 'order=id.asc'
    });
    if (result && Array.isArray(result) && result.length > 0) {
      Logger.log('Supabase Survey_Config: ' + result.length + ' entries');
      return result;
    }
    Logger.log('Supabase Survey_Config kosong, fallback ke Sheets');
    return getSheetData('Master_Survey_Config');
  } catch (e) {
    Logger.log('Supabase error Survey_Config, fallback ke Sheets: ' + e.message);
    return getSheetData('Master_Survey_Config');
  }
}

/**
 * Ambil konfigurasi survey — PRIORITAS Supabase
 * Transformasi dari rows → structured { TEAMS, CRITERIA }
 */
function getSurveyConfig() {
  try {
    var data = getSurveyConfigFromSupabase();
    if (!data || data.length === 0) {
      return successResponse(SURVEY_CONFIG);
    }
    
    var config = { TEAMS: [], CRITERIA: [] };
    
    data.sort(function(a, b) {
      return (parseInt(a.urutan) || 99) - (parseInt(b.urutan) || 99);
    });
    
    data.forEach(function(row) {
      if (row.config_type === 'team') {
        config.TEAMS.push({
          id: row.config_key,
          label: row.config_label || row.config_value,
          icon: row.config_icon || '📋',
          desc: row.config_desc || ''
        });
      } else if (row.config_type === 'criteria') {
        config.CRITERIA.push({
          id: row.config_key,
          label: row.config_label || row.config_value,
          icon: row.config_icon || '⭐'
        });
      }
    });
    
    if (config.TEAMS.length === 0 || config.CRITERIA.length === 0) {
      return successResponse(SURVEY_CONFIG);
    }
    
    return successResponse(config);
  } catch (e) {
    return successResponse(SURVEY_CONFIG);
  }
}

/**
 * Migrasi Master_Survey_Config ke Supabase
 */


/**
 * Simpan konfigurasi survey ke Supabase
 * Admin only — DELETE all + INSERT all
 */
function saveSurveyConfig(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);
    
    if (!payload || !payload.teams || !payload.criteria) {
      throw new Error('Data teams dan criteria wajib diisi.');
    }
    
    // DELETE semua existing rows
    var delResult = fetchSupabase('DELETE', 'master_survey_config', {
      query: 'id=gte.0'
    });
    if (delResult && delResult.success === false) throw new Error(delResult.error);
    
    // INSERT new rows
    var rows = [];
    payload.teams.forEach(function(t, i) {
      rows.push({
        config_type: 'team',
        config_key: t.id,
        config_value: t.label || t.value || '',
        config_label: t.label || t.value || '',
        config_icon: t.icon || '📋',
        config_desc: t.desc || '',
        urutan: String(i + 1)
      });
    });
    payload.criteria.forEach(function(c, i) {
      rows.push({
        config_type: 'criteria',
        config_key: c.id,
        config_value: c.label || c.value || '',
        config_label: c.label || c.value || '',
        config_icon: c.icon || '⭐',
        config_desc: c.desc || '',
        urutan: String(i + 1)
      });
    });
    
    if (rows.length > 0) {
      var result = fetchSupabase('POST', 'master_survey_config', { data: rows });
      if (result && result.success === false) throw new Error(result.error);
    }
    
    Logger.log('Survey config saved to Supabase: ' + rows.length + ' rows');
    return successResponse(null, 'Konfigurasi survey berhasil disimpan. ✅');
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    MIGRASI TRANSAKSIONAL KE SUPABASE                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Migrasi Survey_GA (data respons survey) ke Supabase
 */


// ─── HELPER: Get survey config data (dynamic from sheet) ───

/**
 * Helper untuk mendapatkan data konfigurasi survey
 * Mengembalikan { teams, criteria, teamIds, criteriaIds }
 */
function getSurveyConfigData() {
  var configResult = getSurveyConfig();
  var config = (configResult && configResult.success && configResult.data) ? configResult.data : SURVEY_CONFIG;
  return {
    teams: config.TEAMS || [],
    criteria: config.CRITERIA || [],
    teamIds: (config.TEAMS || []).map(function(t) { return t.id; }),
    criteriaIds: (config.CRITERIA || []).map(function(c) { return c.id; })
  };
}

// ─── PERIOD ─────────────────────────────────────────────────

function getCurrentPeriod() {
  var bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  var now = new Date();
  return bulan[now.getMonth()] + ' ' + now.getFullYear();
}

/**
 * Auto-buat sheet Survey_GA jika belum ada
 */
function ensureSurveySheetExists() {
  try {
    var ss = getSpreadsheet();
    var existing = ss.getSheetByName(CONFIG.SHEETS.SURVEY_GA);
    if (existing) return;

    var sheet = ss.insertSheet(CONFIG.SHEETS.SURVEY_GA);
    var headers = DB_HEADERS[CONFIG.SHEETS.SURVEY_GA];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    Logger.log('✅ Sheet Survey_GA berhasil dibuat otomatis.');
  } catch (e) {
    Logger.log('Gagal buat sheet Survey_GA: ' + e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    SUBMIT SURVEY                                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Submit survey untuk semua tim GA
 * Membuat 4 baris data (1 per tim) dalam 1 transaksi
 */
function submitSurvey(payload) {
  try {
    if (!payload || !payload.divisi) {
      throw new Error('Divisi/Departemen wajib diisi.');
    }

    var period = getCurrentPeriod();
    var divisi = payload.divisi.trim();
    var feedback = (payload.feedback || '').trim();
    var nowTime = now();
    var config = getSurveyConfigData();
    var teamIds = config.teamIds;
    var criteriaIds = config.criteriaIds;

    if (teamIds.length === 0) throw new Error('Tidak ada tim dalam konfigurasi survey.');
    if (criteriaIds.length === 0) throw new Error('Tidak ada kriteria dalam konfigurasi survey.');

    return withLock(function() {
      ensureSurveySheetExists();
      var sheet = getSheet(CONFIG.SHEETS.SURVEY_GA);

      teamIds.forEach(function(team) {
        var row = [nowTime, period, divisi, team];

        criteriaIds.forEach(function(crit) {
          var key = team + '_' + crit;
          var val = parseInt(payload[key], 10);
          row.push((val >= 1 && val <= 5) ? val : '');
        });

        row.push(feedback);
        sheet.appendRow(row);
      });

      return successResponse({
        periode: period,
        divisi: divisi,
        teams_submitted: teamIds.length
      }, '✅ Survey berhasil dikirim! Terima kasih atas partisipasinya.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    GA SURVEY STATISTICS — untuk dashboard Admin          ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Mendapatkan statistik lengkap GA Survey untuk dashboard Admin
 * - Rata-rata per tim & per kriteria
 * - Overview (total responden, avg rating, best team)
 * - Tren bulanan
 * - Riwayat responden terbaru
 */
function getGASurveyStats() {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('survey_ga', CONFIG.SHEETS.SURVEY_GA);

    if (data.length === 0) {
      return successResponse({
        overview: { total_responden: 0, total_entries: 0, avg_rating: 0, best_team: '-', best_score: 0 },
        teams: {},
        monthly_trend: [],
        recent: []
      });
    }

    // Hitung responden unik
    var uniqueResponden = {};
    data.forEach(function(d) { uniqueResponden[d.divisi + '_' + d.timestamp] = true; });
    var totalResponden = Object.keys(uniqueResponden).length;

    // Inisialisasi aggregator per tim
    var teamStats = {};
    SURVEY_CONFIG.TEAMS.forEach(function(t) { teamStats[t.id] = { count: 0, criteria: {} }; });
    SURVEY_CONFIG.CRITERIA.forEach(function(c) {
      SURVEY_CONFIG.TEAMS.forEach(function(t) { teamStats[t.id].criteria[c.id] = { total: 0, count: 0 }; });
    });

    // Monthly trend aggregator
    var monthlyData = {};

    data.forEach(function(d) {
      var team = d.tim_dinilai;
      if (!teamStats[team]) return;
      teamStats[team].count++;

  var config = getSurveyConfigData();
  var criteriaIds = config.criteriaIds;
  
  criteriaIds.forEach(function(c) {
    var val = Number(d[c]);
    if (val >= 1 && val <= 5) {
      if (!teamStats[team].criteria[c]) teamStats[team].criteria[c] = { total: 0, count: 0 };
      teamStats[team].criteria[c].total += val;
      teamStats[team].criteria[c].count++;
    }
  });

      // Monthly trend (agregasi semua kriteria per entry)
      if (d.timestamp) {
        try {
          var dt = new Date(d.timestamp);
          var monthKey = Utilities.formatDate(dt, CONFIG.TIMEZONE, 'yyyy-MM');
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { total: 0, count: 0 };
          SURVEY_CONFIG.CRITERIA.forEach(function(c) {
            var v = Number(d[c.id]);
            if (v >= 1 && v <= 5) {
              monthlyData[monthKey].total += v;
              monthlyData[monthKey].count++;
            }
          });
        } catch(e) { /* skip entry with invalid timestamp */ }
      }
    });

    // Hitung rata-rata per tim dan kumpulkan data overview
    var teams = {};
    var allTotal = 0;
    var allCount = 0;

    SURVEY_CONFIG.TEAMS.forEach(function(t) {
      var ts = teamStats[t.id];
      var critAvg = {};
      var teamTotal = 0;
      var teamCount = 0;

      SURVEY_CONFIG.CRITERIA.forEach(function(c) {
        var avg = ts.criteria[c.id].count > 0
          ? Math.round((ts.criteria[c.id].total / ts.criteria[c.id].count) * 100) / 100
          : 0;
        critAvg[c.id] = { avg: avg, count: ts.criteria[c.id].count };
        teamTotal += ts.criteria[c.id].total;
        teamCount += ts.criteria[c.id].count;
      });

      var overall = teamCount > 0 ? Math.round((teamTotal / teamCount) * 100) / 100 : 0;
      allTotal += teamTotal;
      allCount += teamCount;

      teams[t.id] = {
        label: t.label,
        icon: t.icon,
        responden: ts.count,
        overall_avg: overall,
        criteria: critAvg
      };
    });

    var overallAvg = allCount > 0 ? Math.round((allTotal / allCount) * 100) / 100 : 0;

    // Cari tim dengan rating terbaik
    var bestTeam = '-';
    var bestScore = 0;
    SURVEY_CONFIG.TEAMS.forEach(function(t) {
      if (teams[t.id].overall_avg > bestScore) {
        bestScore = teams[t.id].overall_avg;
        bestTeam = teams[t.id].label;
      }
    });

    // Monthly trend (urut ascending)
    var monthlyTrend = Object.keys(monthlyData).sort().map(function(key) {
      return {
        bulan: key,
        avg: Math.round((monthlyData[key].total / monthlyData[key].count) * 100) / 100,
        count: monthlyData[key].count
      };
    });

    // Recent entries — 10 respondent terakhir (gabung semua 4 tim dalam 1 baris)
    var recentMap = {};
    data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    data.forEach(function(d) {
      var key = d.divisi + '_' + d.timestamp;
      if (Object.keys(recentMap).length >= 10) return;

      if (!recentMap[key]) {
        recentMap[key] = {
          timestamp: d.timestamp ? formatDateId(d.timestamp) : '-',
          divisi: d.divisi || '-',
          feedback: d.feedback || '',
          teams: {}
        };
        SURVEY_CONFIG.CRITERIA.forEach(function(c) {
          recentMap[key][c.id] = 0;
        });
      }

      // Simpan rating per tim untuk detail, dan akumulasi total
      recentMap[key].teams[d.tim_dinilai] = {};
      SURVEY_CONFIG.CRITERIA.forEach(function(c) {
        var val = Number(d[c.id]) || 0;
        recentMap[key].teams[d.tim_dinilai][c.id] = val;
        // Akumulasi untuk rata-rata (akan di-average dengan jumlah tim)
        recentMap[key][c.id] += val;
      });
    });

    var recent = Object.keys(recentMap).map(function(k) {
      var r = recentMap[k];
      // Hitung rata-rata dari semua tim
      var teamCount = Object.keys(r.teams).length || 1;
      SURVEY_CONFIG.CRITERIA.forEach(function(c) {
        r[c.id] = Math.round((r[c.id] / teamCount) * 100) / 100;
      });
      return r;
    });

    return successResponse({
      overview: {
        total_responden: totalResponden,
        total_entries: data.length,
        avg_rating: overallAvg,
        best_team: bestTeam,
        best_score: bestScore
      },
      teams: teams,
      monthly_trend: monthlyTrend,
      recent: recent
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Legacy: statistik survey dengan filter periode
 */
/**
 * Mendapatkan SEMUA entri survey GA (raw rows) — untuk halaman Rating GA
 * Sudah diurutkan dari terbaru, timestamp dinormalisasi ke ISO agar
 * bisa diparsing di browser (frontend GitHub Pages).
 */
function getAllSurveyGA() {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('survey_ga', CONFIG.SHEETS.SURVEY_GA);
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    data = data.map(function(d) {
      if (d.timestamp && typeof d.timestamp === 'string' && d.timestamp.indexOf('T') === -1) {
        d.timestamp = d.timestamp.replace(' ', 'T');
      }
      return d;
    });
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getSurveyStats(periodeFilter) {
  try {
    var user = getActiveUserSession();
    var data = getDataFromSupabase('survey_ga', CONFIG.SHEETS.SURVEY_GA);

    if (periodeFilter) {
      data = data.filter(function(d) { return d.periode === periodeFilter; });
    }

    if (data.length === 0) {
      return successResponse({
        total_responden: 0,
        periode: periodeFilter || getCurrentPeriod(),
        teams: {}
      });
    }

    var uniqueResponden = {};
    data.forEach(function(d) { uniqueResponden[d.divisi + '_' + d.timestamp] = true; });

    var teamStats = {};
    SURVEY_CONFIG.TEAMS.forEach(function(t) { teamStats[t.id] = { count: 0, criteria: {} }; });
    SURVEY_CONFIG.CRITERIA.forEach(function(c) {
      SURVEY_CONFIG.TEAMS.forEach(function(t) { teamStats[t.id].criteria[c.id] = { total: 0, count: 0 }; });
    });

    data.forEach(function(d) {
      var team = d.tim_dinilai;
      if (!teamStats[team]) return;
      teamStats[team].count++;

  var config = getSurveyConfigData();
  var criteriaIds = config.criteriaIds;
  
  criteriaIds.forEach(function(c) {
    var val = Number(d[c]);
    if (val >= 1 && val <= 5) {
      if (!teamStats[team].criteria[c]) teamStats[team].criteria[c] = { total: 0, count: 0 };
      teamStats[team].criteria[c].total += val;
      teamStats[team].criteria[c].count++;
    }
  });
    });

    var result = {};
    SURVEY_CONFIG.TEAMS.forEach(function(t) {
      var ts = teamStats[t.id];
      var critAvg = {};
      var totalAll = 0;
      var countAll = 0;

      SURVEY_CONFIG.CRITERIA.forEach(function(c) {
        var avg = ts.criteria[c.id].count > 0
          ? Math.round((ts.criteria[c.id].total / ts.criteria[c.id].count) * 100) / 100
          : 0;
        critAvg[c.id] = { avg: avg, count: ts.criteria[c.id].count };
        totalAll += ts.criteria[c.id].total;
        countAll += ts.criteria[c.id].count;
      });

      result[t.id] = {
        label: t.label,
        icon: t.icon,
        responden: ts.count,
        overall_avg: countAll > 0 ? Math.round((totalAll / countAll) * 100) / 100 : 0,
        criteria: critAvg
      };
    });

    return successResponse({
      total_responden: Object.keys(uniqueResponden).length,
      total_entries: data.length,
      periode: periodeFilter || getCurrentPeriod(),
      teams: result
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    PUBLIC SURVEY HTML (Server-Side Rendered)             ║
// ╚══════════════════════════════════════════════════════════╝

function generateSurveyPageHtml(surveyResult) {
  var scriptUrl = ScriptApp.getService().getUrl();
  var period = getCurrentPeriod();

  if (surveyResult && surveyResult.success) {
    return HtmlSuccessPage(scriptUrl, period);
  }

  var config = getSurveyConfigData();
  var teams = config.teams;
  var criteria = config.criteria;

  var teamSections = '';
  teams.forEach(function(t) {
    teamSections += SurveyTeamSection(t, criteria);
  });

  var css = SurveyStylesCSS();
  var js = SurveyFormJS(scriptUrl, teams, criteria);

  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Survey Kepuasan GA | General Affair</title>\n<style>' + css + '</style>\n</head>\n<body>\n<div class="hdr">\n<div class="logo">📋</div>\n<h1>Survey Kepuasan Pelayanan GA</h1>\n<div class="period">' + period + '</div>\n<p>Bantu kami meningkatkan kualitas pelayanan dengan memberikan penilaian kepada setiap tim</p>\n</div>\n<div class="body">\n<div class="s-field">\n<label>Divisi / Departemen *</label>\n<input type="text" id="fdivisi" placeholder="Masukkan divisi/departemen Anda" maxlength="100">\n</div>\n<div class="s-error" id="serror"></div>\n' + teamSections + '\n<div class="s-field">\n<label>Kritik & Saran (opsional)</label>\n<textarea id="ffeedback" placeholder="Tulis masukan Anda untuk meningkatkan pelayanan GA..."></textarea>\n</div>\n<div class="s-submit">\n<button class="sbtn" id="bsubmit" onclick="submitSurvey()">📩 Kirim Survey</button>\n</div>\n</div>\n<div class="ftr"><a href="' + scriptUrl + '?page=app">🔐 Admin Login</a></div>\n<script>\n' + js + '\n</script>\n</body>\n</html>';
}

// ╔══════════════════════════════════════════════════════════╗
// ║    HTML BUILDERS                                         ║
// ╚══════════════════════════════════════════════════════════╝

function HtmlSuccessPage(scriptUrl, period) {
  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Survey GA | General Affair</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;line-height:1.6;min-height:100vh;display:flex;align-items:center;justify-content:center}\n.sbox{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:48px 36px;max-width:480px;width:92vw;text-align:center}\n.sicon{font-size:4rem;margin-bottom:16px}\n.stitle{font-size:1.4rem;font-weight:700;margin-bottom:8px}\n.ssub{color:#94a3b8;font-size:.9rem;margin-bottom:20px;line-height:1.6}\n.sbtn{display:inline-block;padding:12px 28px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;font-size:.9rem;font-weight:600;transition:.25s}\n.sbtn:hover{filter:brightness(1.1);transform:translateY(-1px)}\n</style>\n</head>\n<body>\n<div class="sbox">\n<div class="sicon">🎉</div>\n<div class="stitle">Terima Kasih!</div>\n<div class="ssub">Survey kepuasan pelayanan GA Periode <strong>' + period + '</strong> telah kami terima.<br><br>Masukan Anda sangat berarti untuk meningkatkan kualitas pelayanan kami.</div>\n<a class="sbtn" href="' + scriptUrl + '?page=survey">Isi Survey Lagi</a>\n</div>\n</body>\n</html>';
}

function SurveyTeamSection(team, criteria) {
  var html = '<div class="s-team">';
  html += '<div class="s-team-hdr"><div class="s-team-icon">' + team.label + '</div><div class="s-team-desc">' + team.desc + '</div></div>';
  html += '<div class="s-criteria">';
  criteria.forEach(function(c) {
    html += '<div class="s-crit-row"><div class="s-crit-label"><span class="s-crit-icon">' + c.icon + '</span> ' + c.label + '</div>';
    html += SurveyBuildStars(team.id + '_' + c.id, 0);
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function SurveyBuildStars(name, currentVal) {
  var html = '<div class="s-star-group" data-name="' + name + '">';
  for (var s = 5; s >= 1; s--) {
    var checked = (currentVal == s) ? ' checked' : '';
    html += '<input type="radio" name="' + name + '" id="' + name + '_' + s + '" value="' + s + '"' + checked + '><label for="' + name + '_' + s + '" class="s-star">★</label>';
  }
  html += '</div>';
  return html;
}

function SurveyStylesCSS() {
  return '*{box-sizing:border-box;margin:0;padding:0}\n'
    + 'body{font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;line-height:1.6;min-height:100vh}\n'
    + '.hdr{text-align:center;padding:32px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08)}\n'
    + '.hdr .logo{width:54px;height:54px;margin:0 auto 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 30px rgba(99,102,241,.3)}\n'
    + '.hdr h1{font-size:1.3rem;font-weight:700}\n'
    + '.hdr .period{color:#818cf8;font-size:.85rem;font-weight:600;margin-top:2px}\n'
    + '.hdr p{color:#94a3b8;font-size:.8rem;margin-top:6px}\n'
    + '.body{max-width:720px;margin:0 auto;padding:16px}\n'
    + '.s-field{margin-bottom:20px}\n'
    + '.s-field label{display:block;font-size:.8rem;font-weight:600;color:#94a3b8;margin-bottom:6px}\n'
    + '.s-field input,.s-field textarea{width:100%;padding:10px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e0e7ff;font-family:inherit;font-size:.85rem;outline:none;transition:.25s}\n'
    + '.s-field input:focus,.s-field textarea:focus{border-color:#6366f1}\n'
    + '.s-field textarea{resize:vertical;min-height:70px}\n'
    + '.s-hint{font-size:.72rem;color:#64748b;margin-top:4px}\n'
    + '.s-team{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;margin-bottom:16px;overflow:hidden}\n'
    + '.s-team-hdr{padding:14px 18px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06)}\n'
    + '.s-team-icon{font-size:.9rem;font-weight:700;color:#e0e7ff}\n'
    + '.s-team-desc{font-size:.75rem;color:#64748b;margin-top:2px}\n'
    + '.s-criteria{padding:4px 18px}\n'
    + '.s-crit-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;gap:8px}\n'
    + '.s-crit-row:last-child{border-bottom:none}\n'
    + '.s-crit-label{font-size:.82rem;color:#cbd5e1;flex:1;min-width:160px}\n'
    + '.s-crit-icon{font-size:1rem}\n'
    + '.s-star-group{display:flex;flex-direction:row-reverse;gap:2px}\n'
    + '.s-star-group input{display:none}\n'
    + '.s-star{font-size:1.6rem;color:#475569;cursor:pointer;transition:.15s;user-select:none;line-height:1}\n'
    + '.s-star:hover,.s-star:hover ~ .s-star,.s-star-group input:checked ~ .s-star{color:#fbbf24;text-shadow:0 0 8px rgba(251,191,36,.3)}\n'
    + '.s-star-group:hover .s-star{color:#475569}\n'
    + '.s-star-group:hover .s-star:hover,.s-star-group:hover .s-star:hover ~ .s-star{color:#fbbf24 !important}\n'
    + '.s-val{font-size:.72rem;color:#64748b;min-width:20px;text-align:center}\n'
    + '.s-submit{text-align:center;padding:20px 0 30px}\n'
    + '.s-submit .sbtn{padding:14px 40px;border:none;border-radius:12px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;transition:.25s}\n'
    + '.s-submit .sbtn:hover{filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 8px 25px rgba(99,102,241,.4)}\n'
    + '.s-submit .sbtn:disabled{opacity:.5;cursor:not-allowed;transform:none}\n'
    + '.s-error{display:none;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 14px;color:#fca5a5;font-size:.82rem;margin-bottom:16px;text-align:center}\n'
    + '.s-error.show{display:block}\n'
    + '.ftr{text-align:center;padding:16px;color:#475569;font-size:.72rem}\n'
    + '.ftr a{color:#6366f1;text-decoration:none}\n'
    + '@media(max-width:600px){.hdr{padding:24px 14px 16px}.body{padding:12px}.s-crit-row{flex-direction:column;align-items:flex-start;gap:4px}}';
}

function SurveyFormJS(scriptUrl, teams, criteria) {
  var totalItems = teams.length * criteria.length;
  return ''
    + 'var SU=' + JSON.stringify(scriptUrl) + ';'
    + 'var TOTAL_ITEMS=' + totalItems + ';'
    + 'function submitSurvey(){'
    + 'var d=document.getElementById("fdivisi").value.trim();'
    + 'var fb=document.getElementById("ffeedback").value.trim();'
    + 'var er=document.getElementById("serror");'
    + 'er.style.display="none";'
    + 'if(!d){'
    + 'er.textContent="Silakan isi Divisi/Departemen Anda.";'
    + 'er.style.display="block";'
    + 'return;'
    + '}'
    + 'var ratings=document.querySelectorAll(".s-star-group input[type=radio]:checked");'
    + 'if(ratings.length<TOTAL_ITEMS){'
    + 'er.textContent="Silakan beri penilaian untuk semua kritera (' + totalItems + ' item).";'
    + 'er.style.display="block";'
    + 'return;'
    + '}'
    + 'var b=document.getElementById("bsubmit");'
    + 'b.disabled=true;'
    + 'b.textContent="Mengirim...";'
    + 'var params="page=survey&submit=1&divisi="+encodeURIComponent(d)+"&feedback="+encodeURIComponent(fb);'
    + 'ratings.forEach(function(r){params+="&"+encodeURIComponent(r.name)+"="+encodeURIComponent(r.value)});'
    + 'window.top.location.href=SU+"?"+params;'
    + '}';
}
