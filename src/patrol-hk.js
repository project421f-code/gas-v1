function switchPatrolTab(tab) {
  _patrolTab = tab;
  if (APP.currentPage === 'patrol') {
    var content = document.getElementById('main-content');
    if (content) renderPatrol(content);
  }
}

function showPatrolLogDetail(i) {
  var l = _patrolLogData[i];
  if (!l) return;
  showModal('Detail Patroli', [
    {label: 'Personel', value: l.nama_personel},
    {label: 'Checkpoint', value: l.pos_checkpoint},
    {label: 'Tanggal Shift', value: l.tanggal_shift},
    {label: 'Kondisi', value: l.kondisi_area, highlight: l.kondisi_area !== 'Aman'},
    {label: 'Catatan', value: l.catatan_temuan}
  ]);
}

function showPatrolCPDetail(i) {
  var cp = _patrolCPData[i];
  if (!cp) return;
  showModal('Detail Checkpoint', [
    {label: 'ID Pos', value: cp.id_pos},
    {label: 'Nama Pos', value: cp.nama_pos},
    {label: 'Area', value: cp.area},
    {label: 'Status', value: cp.status, highlight: true}
  ]);
}

async function renderPatrol(content) {
  content.innerHTML = renderSkeleton('stats');
  var html = '<div class="page-header"><div class="page-title">Patroli</div><div class="page-desc">Log patroli keamanan & KPI Security</div></div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
  [
    { key: 'logs', label: '&#x1F4C4; Log Patroli' },
    { key: 'kpisec', label: '&#x1F4CA; KPI Security' }
  ].forEach(function(t) {
    var active = t.key === _patrolTab;
    html += '<button onclick="switchPatrolTab(\'' + t.key + '\')" style="background:' + (active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)') + ';color:' + (active ? '#a5b4fc' : '#94a3b8') + ';border:1px solid ' + (active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)') + ';padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '600' : '500') + '">' + t.label + '</button>';
  });
  html += '</div>';

  try {
    if (_patrolTab === 'kpisec') {
      html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
      html += '<button onclick="recalcKPISec()" style="background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">&#x1F504; Kalkulasi Ulang KPI</button>';
      html += '</div>';
      html += '<div class="section-card"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem">';
      html += '<thead><tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06)">';
      html += '<th style="padding:8px;text-align:left">Nama Anggota</th><th style="padding:8px;text-align:left">Shift</th><th style="padding:8px;text-align:left">Kepatuhan Patroli</th><th style="padding:8px;text-align:left">Inspeksi</th><th style="padding:8px;text-align:left">Insiden</th><th style="padding:8px;text-align:left">Performa</th></tr></thead><tbody id="tbody-kpisec">';
      html += '<tr><td colspan="6" style="text-align:center;padding:30px;color:#475569">Memuat...</td></tr>';
      html += '</tbody></table></div></div>';
      content.innerHTML = html;
      loadKPISecData();
    } else {
      var [logRes, cpRes] = await Promise.all([
        supabase.from('patrol_log').select('*').order('timestamp', { ascending: false }),
        supabase.from('master_patrol_checkpoints').select('*').order('id')
      ]);
      if (logRes.error) throw logRes.error;
      if (cpRes.error) throw cpRes.error;
      var logs = logRes.data || [];
      var checkpoints = cpRes.data || [];
      _patrolLogData = logs;
      _patrolCPData = checkpoints;
      var totalPatrol = logs.length;
      var aman = logs.filter(function(l) { return l.kondisi_area === 'Aman'; }).length;
      var tidakAman = logs.filter(function(l) { return l.kondisi_area === 'Tidak Aman' || l.kondisi_area === 'Dalam Perbaikan'; }).length;
      var totalCP = checkpoints.length;
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total Patroli</div><div class="stat-value blue">' + totalPatrol + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Aman</div><div class="stat-value green">' + aman + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Temuan</div><div class="stat-value ' + (tidakAman > 0 ? 'red' : 'green') + '">' + tidakAman + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Checkpoint</div><div class="stat-value purple">' + totalCP + '</div></div>';
    html += '</div>';

    // Checkpoints list
    html += '<div class="section-card" style="margin-bottom:12px">';
    html += '<div class="section-title">&#x1F6E1; Checkpoint Patroli</div>';
    checkpoints.forEach(function(cp, ci) {
      var cpColor = cp.status === 'Aktif' ? '#34d399' : '#f87171';
      html += '<div class="activity-item clickable" onclick="showPatrolCPDetail(' + ci + ')">';
      html += '<div class="activity-dot" style="background:' + cpColor + '"></div>';
      html += '<div class="activity-text"><strong>' + escapeHtml(cp.nama_pos) + '</strong> <span style="color:#64748b">(' + escapeHtml(cp.area || '-') + ')</span></div>';
      html += '<div class="activity-time" style="color:' + cpColor + '">' + escapeHtml(cp.status) + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Patrol logs
    html += '<div class="section-card">';
    html += '<div class="section-title">&#x1F4C4; Log Patroli Terbaru</div>';
    if (logs.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada log patroli</div>';
    } else {
      logs.slice(0, 20).forEach(function(l, li) {
        var kondisiColor = l.kondisi_area === 'Aman' ? '#34d399' : (l.kondisi_area === 'Dalam Perbaikan' ? '#fb923c' : '#f87171');

        html += '<div class="activity-item clickable" onclick="showPatrolLogDetail(' + li + ')">';
        html += '<div class="activity-dot" style="background:' + kondisiColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(l.nama_personel) + '</strong> — ' + escapeHtml(l.pos_checkpoint);
        html += '<br><span style="color:#64748b">Shift: ' + escapeHtml(l.tanggal_shift || '-') + '</span>';
        if (l.catatan_temuan) html += '<br><span style="color:#475569">Catatan: ' + escapeHtml(l.catatan_temuan) + '</span>';
        html += '</div>';
        html += '<div class="activity-time" style="color:' + kondisiColor + '">' + escapeHtml(l.kondisi_area) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    content.innerHTML = html;
    }  // closes else
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Patroli</div><div class="page-desc">Log patroli keamanan</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

// ════════════════════════════════════════════════════════════
// PAGE: HOUSEKEEPING — Checklist, Audit, GC (cs_daily_checklist, audit_housekeeping, gc_execution)
// ════════════════════════════════════════════════════════════
var APP_HK_TAB = 'checklist';
var _hkCSData = [];
var _hkAuditData = [];
var _hkGCData = [];
var _hkKPIData = [];

function showHKDetailCS(i) {
  var c = _hkCSData[i]; if (!c) return;
  showModal('Daily Checklist', [
    {label: 'Staf', value: c.nama_staf},
    {label: 'Tim', value: c.tim},
    {label: 'Lokasi', value: c.lokasi_area},
    {label: 'Pekerjaan', value: c.status_pekerjaan, highlight: true},
    {label: 'Checklist', value: c.checklist_kerja},
    {label: 'Kondisi Fasilitas', value: c.kondisi_fasilitas},
    {label: 'Detail Kerusakan', value: c.detail_kerusakan},
    {label: 'Kesesuaian Jadwal', value: c.kesesuaian_jadwal}
  ]);
}
function showHKDetailAudit(i) {
  var a = _hkAuditData[i]; if (!a) return;
  showModal('Audit Housekeeping', [
    {label: 'Auditor', value: a.nama_auditor},
    {label: 'Lokasi', value: a.lokasi_area},
    {label: 'Tim Diaudit', value: a.tim_diaudit},
    {label: 'Staf', value: a.nama_staf},
    {label: 'Skor Kebersihan', value: a.skor_kebersihan ? a.skor_kebersihan + '/5' : '-'},
    {label: 'Kelayakan', value: a.status_kelayakan, highlight: true},
    {label: 'Catatan', value: a.catatan}
  ]);
}
function showHKDetailGC(i) {
  var g = _hkGCData[i]; if (!g) return;
  showModal('General Cleaning', [
    {label: 'ID GC', value: g.id_gc, highlight: true},
    {label: 'Lokasi', value: g.lokasi_area},
    {label: 'Pekerjaan', value: g.jenis_pekerjaan},
    {label: 'Tanggal Target', value: g.tanggal_target},
    {label: 'Tim Pelaksana', value: g.tim_pelaksana},
    {label: 'PIC', value: g.penanggung_jawab},
    {label: 'Tanggal Selesai', value: g.tanggal_selesai || '-'},
    {label: 'Status', value: g.status_eksekusi, highlight: true}
  ]);
}

async function renderHousekeeping(content) {
  content.innerHTML = renderSkeleton('stats');
  try {
    var [csRes, auditRes, gcRes] = await Promise.all([
      supabase.from('cs_daily_checklist').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_housekeeping').select('*').order('created_at', { ascending: false }),
      supabase.from('gc_execution').select('*').order('id', { ascending: false })
    ]);
    if (csRes.error) throw csRes.error;
    if (auditRes.error) throw auditRes.error;
    if (gcRes.error) throw gcRes.error;

    var csData = csRes.data || [];
    var auditData = auditRes.data || [];
    var gcData = gcRes.data || [];
    _hkCSData = csData;
    _hkAuditData = auditData;
    _hkGCData = gcData;

    var html = '<div class="page-header"><div class="page-title">Housekeeping</div><div class="page-desc">Audit, checklist kebersihan & general cleaning</div></div>';

    // Stats
    var csSelesai = csData.filter(function(c) { return c.status_pekerjaan === 'Selesai'; }).length;
    var csPending = csData.filter(function(c) { return c.status_pekerjaan === 'Belum' || c.status_pekerjaan === 'Dalam Proses'; }).length;
    var auditDone = auditData.filter(function(a) { return a.status_kelayakan === 'Layak'; }).length;
    var gcOpen = gcData.filter(function(g) { return g.status_eksekusi === 'Open' || g.status_eksekusi === 'In Progress'; }).length;

    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Checklist Selesai</div><div class="stat-value green">' + csSelesai + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Checklist Pending</div><div class="stat-value orange">' + csPending + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Audit Layak</div><div class="stat-value blue">' + auditDone + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">GC Open</div><div class="stat-value ' + (gcOpen > 0 ? 'red' : 'green') + '">' + gcOpen + '</div></div>';
    html += '</div>';

    // Tabs
    html += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
    html += '<button class="hk-tab-btn" data-tab="checklist" style="' + (APP_HK_TAB === 'checklist' ? activeTabStyle : inactiveTabStyle) + '" onclick="switchHKTab(\'checklist\')">&#x1F9F9; Daily Checklist</button>';
    html += '<button class="hk-tab-btn" data-tab="audit" style="' + (APP_HK_TAB === 'audit' ? activeTabStyle : inactiveTabStyle) + '" onclick="switchHKTab(\'audit\')">&#x1F50D; Audit</button>';
    html += '<button class="hk-tab-btn" data-tab="gc" style="' + (APP_HK_TAB === 'gc' ? activeTabStyle : inactiveTabStyle) + '" onclick="switchHKTab(\'gc\')">&#x1F9F1; General Cleaning</button>';
    html += '<button class="hk-tab-btn" data-tab="kpi" style="' + (APP_HK_TAB === 'kpi' ? activeTabStyle : inactiveTabStyle) + '" onclick="switchHKTab(\'kpi\')">&#x1F4CA; KPI</button>';
    html += '</div>';

    // Content container for tab switching
    html += '<div id="hk-content">' + renderHKTabContent(APP_HK_TAB, csData, auditData, gcData) + '</div>';

    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Housekeeping</div><div class="page-desc">Audit & checklist kebersihan</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

var activeTabStyle = 'background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);padding:8px 16px;border-radius:10px;cursor:pointer;font-size:0.8rem;font-weight:600;transition:all 0.2s';
var inactiveTabStyle = 'background:rgba(255,255,255,0.03);color:#94a3b8;border:1px solid rgba(255,255,255,0.06);padding:8px 16px;border-radius:10px;cursor:pointer;font-size:0.8rem;font-weight:500;transition:all 0.2s';

function switchHKTab(tab) {
  APP_HK_TAB = tab;
  var btns = document.querySelectorAll('.hk-tab-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.cssText = btns[i].dataset.tab === tab ? activeTabStyle : inactiveTabStyle;
  }
  var container = document.getElementById('hk-content');
  if (!container) return;
  // Data already in closure — re-fetch
  renderHKContent();
}

async function renderHKContent() {
  var container = document.getElementById('hk-content');
  if (!container) return;
  container.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px">Memuat...</div>';
  try {
    var [csRes, auditRes, gcRes] = await Promise.all([
      supabase.from('cs_daily_checklist').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_housekeeping').select('*').order('created_at', { ascending: false }),
      supabase.from('gc_execution').select('*').order('id', { ascending: false })
    ]);
    _hkCSData = csRes.data || [];
    _hkAuditData = auditRes.data || [];
    _hkGCData = gcRes.data || [];
    container.innerHTML = renderHKTabContent(APP_HK_TAB, _hkCSData, _hkAuditData, _hkGCData);
  } catch(e) {
    container.innerHTML = '<div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div>';
  }
}

// ═══ KPI Housekeeping — Functions ═══

function _renderKPIHKTable(staffData) {
  var html = '<div class="section-card">';
  html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
  html += '<button onclick="recalcKPIHK()" style="background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;border:none;padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600">&#x1F504; Kalkulasi Ulang</button>';
  html += '</div>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem">';
  html += '<thead><tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06)">';
  html += '<th style="padding:8px;text-align:left">Nama Staff</th><th style="padding:8px;text-align:left">Tim</th><th style="padding:8px;text-align:left">Total Tugas</th><th style="padding:8px;text-align:left">Selesai</th><th style="padding:8px;text-align:left">Compliance</th><th style="padding:8px;text-align:left">Kondisi Baik</th><th style="padding:8px;text-align:left">Performa</th></tr></thead><tbody>';
  if (!staffData || staffData.length === 0) {
    html += '<tr><td colspan="7" style="text-align:center;padding:20px;color:#475569">Belum ada data KPI. Klik "Kalkulasi Ulang".</td></tr>';
  } else {
    staffData.forEach(function(d) {
      var perfColor = d.skor === 'Baik' ? '#34d399' : (d.skor === 'Cukup' ? '#fb923c' : '#f87171');
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">';
      html += '<td style="padding:8px"><strong>' + escapeHtml(d.nama) + '</strong></td>';
      html += '<td style="padding:8px;color:#64748b">' + escapeHtml(d.tim || '-') + '</td>';
      html += '<td style="padding:8px">' + d.total + '</td>';
      html += '<td style="padding:8px;color:#34d399">' + d.selesai + '</td>';
      html += '<td style="padding:8px;color:#a5b4fc;font-weight:600">' + d.compliance + '%</td>';
      html += '<td style="padding:8px;color:' + (d.kondisi_baik_persen >= 80 ? '#34d399' : '#fb923c') + '">' + d.kondisi_baik_persen + '%</td>';
      html += '<td style="padding:8px"><span style="background:' + perfColor + '20;color:' + perfColor + ';padding:2px 8px;border-radius:6px;font-size:0.7rem;font-weight:600">' + escapeHtml(d.skor) + '</span></td>';
      html += '</tr>';
    });
  }
  html += '</tbody></table></div></div>';
  return html;
}

async function recalcKPIHK() {
  var btn = document.querySelector('[onclick="recalcKPIHK()"]');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Menghitung...'; }
  try {
    var res = await supabase.from('cs_daily_checklist').select('*');
    if (res.error) throw res.error;
    var data = res.data || [];
    var grouped = {};
    data.forEach(function(c) {
      var name = c.nama_staf || 'Unknown';
      if (!grouped[name]) grouped[name] = { total: 0, selesai: 0, kondisi_baik: 0, tim: c.tim || '' };
      grouped[name].total++;
      if (c.status_pekerjaan === 'Selesai') grouped[name].selesai++;
      if (c.kondisi_fasilitas === 'Baik' || c.kondisi_fasilitas === 'Bersih') grouped[name].kondisi_baik++;
    });
    var result = Object.keys(grouped).map(function(name) {
      var g = grouped[name];
      var compliance = g.total > 0 ? ((g.selesai / g.total) * 100).toFixed(1) : 0;
      var kondisiBaik = g.total > 0 ? ((g.kondisi_baik / g.total) * 100).toFixed(1) : 0;
      var skor = parseFloat(compliance) >= 80 ? 'Baik' : (parseFloat(compliance) >= 50 ? 'Cukup' : 'Kurang');
      return { nama: name, tim: g.tim, total: g.total, selesai: g.selesai, compliance: parseFloat(compliance), kondisi_baik_persen: parseFloat(kondisiBaik), skor: skor };
    });
    result.sort(function(a, b) { return b.compliance - a.compliance; });
    _hkKPIData = result;
    var container = document.getElementById('hk-content');
    if (container && APP_HK_TAB === 'kpi') container.innerHTML = _renderKPIHKTable(result);
    showToast('KPI Housekeeping berhasil dikalkulasi!', 'success');
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDD04 Kalkulasi Ulang'; }
  }
}

function renderHKTabContent(tab, csData, auditData, gcData) {
  var html = '';
  if (tab === 'kpi') {
    html += _renderKPIHKTable(_hkKPIData);
  } else if (tab === 'checklist') {
    html += '<div class="section-card">';
    html += '<div class="section-title">&#x1F9F9; Daily Checklist</div>';
    if (csData.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data checklist</div>';
    } else {
      csData.slice(0, 20).forEach(function(c, ci) {
        var statusColor = c.status_pekerjaan === 'Selesai' ? '#34d399' : (c.status_pekerjaan === 'Dalam Proses' ? '#fb923c' : '#f87171');
        html += '<div class="activity-item clickable" onclick="showHKDetailCS(' + ci + ')">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(c.nama_staf) + '</strong> — ' + escapeHtml(c.lokasi_area);
        html += '<br><span style="color:#64748b">' + escapeHtml(c.tim || '-') + ' | ' + escapeHtml(c.checklist_kerja || '-') + '</span>';
        if (c.detail_kerusakan) html += '<br><span style="color:#475569">Catatan: ' + escapeHtml(c.detail_kerusakan) + '</span>';
        html += '</div>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(c.status_pekerjaan) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
  } else if (tab === 'audit') {
    html += '<div class="section-card">';
    html += '<div class="section-title">&#x1F50D; Audit Housekeeping</div>';
    if (auditData.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data audit</div>';
    } else {
      auditData.slice(0, 20).forEach(function(a, ai) {
        var kelayakanColor = a.status_kelayakan === 'Layak' ? '#34d399' : '#f87171';
        html += '<div class="activity-item clickable" onclick="showHKDetailAudit(' + ai + ')">';
        html += '<div class="activity-dot" style="background:' + kelayakanColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(a.nama_auditor) + '</strong> — ' + escapeHtml(a.lokasi_area);
        html += '<br><span style="color:#64748b">' + escapeHtml(a.tim_diaudit || '-') + ' | Skor: ' + (a.skor_kebersihan || '-') + '/5</span>';
        if (a.catatan) html += '<br><span style="color:#475569">Catatan: ' + escapeHtml(a.catatan) + '</span>';
        html += '</div>';
        html += '<div class="activity-time" style="color:' + kelayakanColor + '">' + escapeHtml(a.status_kelayakan) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
  } else if (tab === 'gc') {
    html += '<div class="section-card">';
    html += '<div class="section-title">&#x1F9F1; General Cleaning Execution</div>';
    if (gcData.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data GC</div>';
    } else {
      gcData.slice(0, 20).forEach(function(g, gi) {
        var statusColor = g.status_eksekusi === 'Selesai' ? '#34d399' : (g.status_eksekusi === 'In Progress' ? '#fb923c' : (g.status_eksekusi === 'Cancelled' ? '#f87171' : '#60a5fa'));
        html += '<div class="activity-item clickable" onclick="showHKDetailGC(' + gi + ')">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(g.id_gc) + '</strong> — ' + escapeHtml(g.lokasi_area);
        html += '<br><span style="color:#64748b">' + escapeHtml(g.jenis_pekerjaan || '-') + ' | PIC: ' + escapeHtml(g.penanggung_jawab || '-') + '</span>';
        html += '</div>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(g.status_eksekusi) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
  }
  return html;
}

// ════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════
