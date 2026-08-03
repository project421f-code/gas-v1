function switchSurveyTab(tab) {
  APP.surveyTab = tab;
  if (APP.currentPage === 'survey') {
    var content = document.getElementById('main-content');
    if (content) renderSurvey(content);
  }
}

function renderSurveyTabButtons() {
  var tabs = [
    { key: 'garating', label: '&#11088; Rating GA' },
    { key: 'ticketrating', label: '&#x1F4CB; Rating Tiket' }
  ];
  var html = '<div style="display:flex;gap:6px;margin-bottom:14px">';
  tabs.forEach(function(t) {
    var active = t.key === APP.surveyTab;
    html += '<button onclick="switchSurveyTab(\'' + t.key + '\')" style="' +
      'background:' + (active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)') + ';' +
      'color:' + (active ? '#a5b4fc' : '#94a3b8') + ';' +
      'border:1px solid ' + (active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)') + ';' +
      'padding:6px 16px;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '600' : '500') + '">' +
      t.label + '</button>';
  });
  html += '</div>';
  return html;
}

async function renderSurvey(content) {
  content.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px">Memuat data survey...</div>';

  var html = '<div class="page-header"><div class="page-title">Survey Kepuasan</div><div class="page-desc">Rating GA & rating tiket maintenance</div></div>';
  html += renderSurveyTabButtons();

  try {
    if (APP.surveyTab === 'garating') {
      // ═══ RATING GA (dari sheet Survey_GA via GAS) ═══
      var data = await apiCall('getAllSurveyGA', []);

      // Stats
      var totalEntries = data.length;
      var totalResp = 0; var sumRating = 0;
      var teamStats = {}; var monthlyTrend = {};
      data.forEach(function(s) {
        totalResp++;
        var r = (s.keramahan || 0) + (s.fast_response || 0) + (s['3s'] || 0) + (s.kualitas_kerja || 0) + (s.komunikasi || 0);
        sumRating += r / 5;
        var team = s.tim_dinilai || 'Lainnya';
        if (!teamStats[team]) teamStats[team] = { count: 0, sum: 0, criteria: { keramahan: 0, fast_response: 0, '3s': 0, kualitas_kerja: 0, komunikasi: 0 } };
        teamStats[team].count++;
        teamStats[team].sum += r / 5;
        teamStats[team].criteria.keramahan += s.keramahan || 0;
        teamStats[team].criteria.fast_response += s.fast_response || 0;
        teamStats[team].criteria['3s'] += s['3s'] || 0;
        teamStats[team].criteria.kualitas_kerja += s.kualitas_kerja || 0;
        teamStats[team].criteria.komunikasi += s.komunikasi || 0;
        // Monthly trend
        if (s.timestamp) {
          var d = new Date(String(s.timestamp).replace(' ', 'T'));
          var key = (d.getMonth()+1) + '-' + d.getFullYear();
          if (!monthlyTrend[key]) monthlyTrend[key] = { sum: 0, count: 0 };
          monthlyTrend[key].sum += r / 5;
          monthlyTrend[key].count++;
        }
      });
      var avgRating = totalResp > 0 ? (sumRating / totalResp) : 0;
      var bestTeam = ''; var bestScore = 0;
      Object.keys(teamStats).forEach(function(t) { var s = teamStats[t].sum / teamStats[t].count; if (s > bestScore) { bestScore = s; bestTeam = t; } });

      html += '<div class="stats-grid">';
      html += '<div class="stat-card"><div class="stat-label">Total Entri</div><div class="stat-value blue">' + totalEntries + '</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Rata-rata Rating</div><div class="stat-value purple">' + avgRating.toFixed(2) + '</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Tim Terbaik</div><div class="stat-value green">' + escapeHtml(bestTeam || '-') + '</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Total Responden</div><div class="stat-value orange">' + totalResp + '</div></div>';
      html += '</div>';

      // Chart: Perbandingan Tim
      html += '<div class="section-card"><div class="section-title">&#x1F4CA; Perbandingan Rating per Tim</div><div style="height:240px"><canvas id="chart-gasurvey-team"></canvas></div></div>';
      // Chart: Kriteria per Tim
      html += '<div class="section-card"><div class="section-title">&#x1F4CA; Rating per Kriteria</div><div style="height:240px"><canvas id="chart-gasurvey-criteria"></canvas></div></div>';
      // Chart: Trend Bulanan
      html += '<div class="section-card"><div class="section-title">&#x1F4C5; Trend Rating Bulanan</div><div style="height:240px"><canvas id="chart-gasurvey-trend"></canvas></div></div>';
      // Team Detail
      html += '<div class="section-card"><div class="section-title">&#x1F3C6; Detail Performa Tim</div><div id="gasurvey-team-detail"></div></div>';
      // Recent table
      html += '<div class="section-card"><div class="section-title">&#x1F4C4; Riwayat Responden Terbaru</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem"><thead><tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06)">';
      html += '<th style="padding:8px;text-align:left">Divisi</th><th style="padding:8px;text-align:left">Tim</th><th style="padding:8px;text-align:left">Keramahan</th><th style="padding:8px;text-align:left">Fast Resp</th><th style="padding:8px;text-align:left">3S</th><th style="padding:8px;text-align:left">Kualitas</th><th style="padding:8px;text-align:left">Komunikasi</th><th style="padding:8px;text-align:left">Feedback</th></tr></thead><tbody id="tbody-gasurvey"></tbody></table></div></div>';

      content.innerHTML = html;

      // Render charts after DOM is ready
      setTimeout(function() {
        renderGATeamChart(teamStats);
        renderGACriteriaChart(teamStats);
        renderGATrendChart(monthlyTrend);
        renderGATeamDetail(teamStats);
        renderGATable(data);
      }, 100);

    } else {
      // ═══ RATING TIKET (dari main_data.rating_survei via GAS) ═══
      var allTickets = await apiCall('getAllComplaints', []);
      allTickets = allTickets || [];
      var data = allTickets.filter(function(t) {
        return t.rating_survei !== null && t.rating_survei !== undefined && String(t.rating_survei).trim() !== '';
      }).sort(function(a, b) {
        return new Date(String(b.timestamp).replace(' ', 'T')) - new Date(String(a.timestamp).replace(' ', 'T'));
      });
      var totalSelesai = allTickets.filter(function(t) { return t.status === 'Selesai' || t.status === 'Closed'; }).length;

      // Stats
      var totalRated = data.length;
      var sumRating = 0; var fiveStar = 0;
      var catStats = {}; var tekStats = {}; var dist = {'1':0,'2':0,'3':0,'4':0,'5':0};
      var monthlyTrend = {};
      data.forEach(function(t) {
        var r = parseFloat(t.rating_survei) || 0;
        sumRating += r;
        if (r >= 5) fiveStar++;
        var key = Math.floor(r);
        if (key < 1) key = 1; if (key > 5) key = 5;
        dist[key] = (dist[key] || 0) + 1;
        var kat = t.kategori || 'Lainnya';
        if (!catStats[kat]) catStats[kat] = { sum: 0, count: 0 };
        catStats[kat].sum += r; catStats[kat].count++;
        var tek = t.teknisi || 'Unassigned';
        if (!tekStats[tek]) tekStats[tek] = { sum: 0, count: 0 };
        tekStats[tek].sum += r; tekStats[tek].count++;
        if (t.timestamp) {
          var d = new Date(String(t.timestamp).replace(' ', 'T'));
          var mk = (d.getMonth()+1) + '-' + d.getFullYear();
          if (!monthlyTrend[mk]) monthlyTrend[mk] = { sum: 0, count: 0 };
          monthlyTrend[mk].sum += r; monthlyTrend[mk].count++;
        }
      });
      var avgR = totalRated > 0 ? (sumRating / totalRated) : 0;
      var responseRate = totalSelesai > 0 ? ((totalRated / totalSelesai) * 100).toFixed(1) : 0;

      html += '<div class="stats-grid">';
      html += '<div class="stat-card"><div class="stat-label">Rata-rata Rating</div><div class="stat-value purple">' + avgR.toFixed(1) + '</div><div class="stat-sub">Dari ' + totalRated + ' responden</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Total Rated</div><div class="stat-value blue">' + totalRated + '</div><div class="stat-sub">Dari ' + totalSelesai + ' tiket selesai</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Response Rate</div><div class="stat-value ' + (responseRate > 50 ? 'green' : 'orange') + '">' + responseRate + '%</div></div>';
      html += '<div class="stat-card"><div class="stat-label">Bintang 5</div><div class="stat-value green">' + fiveStar + '</div></div>';
      html += '</div>';

      // Charts row
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
      html += '<div class="section-card"><div class="section-title">&#x1F4CA; Rating per Kategori</div><div style="height:200px"><canvas id="chart-survey-category"></canvas></div></div>';
      html += '<div class="section-card"><div class="section-title">&#x1F4CA; Rating per Teknisi</div><div style="height:200px"><canvas id="chart-survey-teknisi"></canvas></div></div>';
      html += '</div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
      html += '<div class="section-card"><div class="section-title">&#x1F4CA; Distribusi Rating</div><div style="height:200px"><canvas id="chart-survey-distribusi"></canvas></div></div>';
      html += '<div class="section-card"><div class="section-title">&#x1F4C5; Trend Rating Bulanan</div><div style="height:200px"><canvas id="chart-survey-trend"></canvas></div></div>';
      html += '</div>';
      // Detail table
      html += '<div class="section-card"><div class="section-title">&#x1F4C4; Detail Rating Tiket</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem"><thead><tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06)">';
      html += '<th style="padding:8px;text-align:left">Tiket</th><th style="padding:8px;text-align:left">Tanggal</th><th style="padding:8px;text-align:left">Pelapor</th><th style="padding:8px;text-align:left">Kategori</th><th style="padding:8px;text-align:left">Teknisi</th><th style="padding:8px;text-align:left">Rating</th></tr></thead><tbody id="tbody-survey"></tbody></table></div></div>';

      content.innerHTML = html;

      setTimeout(function() {
        renderCategoryChart(catStats);
        renderTeknisiChart(tekStats);
        renderDistribusiChart(dist);
        renderTrendChart(monthlyTrend);
        renderTicketTable(data);
      }, 100);
    }
  } catch(e) {
    content.innerHTML = html + '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

// ═══ RATING GA — Chart Functions ═══

function renderGATeamChart(teams) {
  var ctx = document.getElementById('chart-gasurvey-team');
  if (!ctx) return;
  if (APP.charts.gaTeam) APP.charts.gaTeam.destroy();
  var labels = [], values = [], colors = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#f97316','#a855f7','#14b8a6','#e11d48'];
  Object.keys(teams).forEach(function(key, i) {
    labels.push(key);
    values.push(teams[key].count > 0 ? (teams[key].sum / teams[key].count) : 0);
  });
  APP.charts.gaTeam = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return 'Rating: ' + ctx.parsed.y.toFixed(2); } } } } }
  });
}

function renderGACriteriaChart(teams) {
  var ctx = document.getElementById('chart-gasurvey-criteria');
  if (!ctx) return;
  if (APP.charts.gaCriteria) APP.charts.gaCriteria.destroy();
  var criteriaLabels = ['Keramahan','Fast Resp','3S','Kualitas','Komunikasi'];
  var criteriaIds = ['keramahan','fast_response','3s','kualitas_kerja','komunikasi'];
  var datasets = [], colors = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
  var idx = 0;
  Object.keys(teams).forEach(function(key) {
    var t = teams[key];
    if (t.count === 0) return;
    var data = criteriaIds.map(function(cid) { return t.criteria[cid] ? (t.criteria[cid] / t.count) : 0; });
    datasets.push({ label: key, data: data, backgroundColor: colors[idx % colors.length], borderRadius: 4, borderSkipped: false });
    idx++;
  });
  APP.charts.gaCriteria = new Chart(ctx, {
    type: 'bar',
    data: { labels: criteriaLabels, datasets: datasets },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12, padding: 12 } } } }
  });
}

function renderGATrendChart(trendData) {
  var ctx = document.getElementById('chart-gasurvey-trend');
  if (!ctx) return;
  if (APP.charts.gaTrend) APP.charts.gaTrend.destroy();
  var labels = [], avgData = [], countData = [];
  var bulanNama = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  Object.keys(trendData).sort(function(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return parseInt(pa[1]) - parseInt(pb[1]) || parseInt(pa[0]) - parseInt(pb[0]);
  }).forEach(function(key) {
    var parts = key.split('-');
    labels.push(bulanNama[parseInt(parts[0])-1] + ' ' + parts[1]);
    avgData.push(trendData[key].count > 0 ? (trendData[key].sum / trendData[key].count) : 0);
    countData.push(trendData[key].count);
  });
  if (labels.length === 0) { ctx.parentElement.innerHTML = '<div style="text-align:center;padding:30px;color:#475569">Belum ada data trend</div>'; return; }
  APP.charts.gaTrend = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [
      { label: 'Rata-rata Rating', data: avgData, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#8b5cf6' },
      { label: 'Jumlah Responden', data: countData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#10b981', yAxisID: 'y1' }
    ] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 5, position: 'left', ticks: { stepSize: 1, font: { size: 11 } }, title: { display: true, text: 'Rating', font: { size: 10 } } }, y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { font: { size: 11 } }, title: { display: true, text: 'Responden', font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12, padding: 12 } } } }
  });
}

function renderGATeamDetail(teams) {
  var el = document.getElementById('gasurvey-team-detail');
  if (!el) return;
  var html = '';
  Object.keys(teams).forEach(function(key) {
    var t = teams[key];
    var rating = t.count > 0 ? (t.sum / t.count) : 0;
    var stars = '';
    for (var i = 0; i < Math.floor(rating); i++) stars += '\u2B50';
    if (rating - Math.floor(rating) >= 0.5) stars += '\u00BD';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">';
    html += '<div><strong>' + escapeHtml(key) + '</strong><br><span style="font-size:0.72rem;color:#64748b">' + t.count + ' responden</span></div>';
    html += '<div style="text-align:right"><span style="font-size:1.1rem;font-weight:700">' + rating.toFixed(2) + '</span><br><span style="font-size:0.8rem">' + stars + '</span></div>';
    html += '</div>';
  });
  el.innerHTML = html || '<div style="color:#475569">Belum ada data</div>';
}

function renderGATable(data) {
  var tbody = document.getElementById('tbody-gasurvey');
  if (!tbody) return;
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#475569">Belum ada data</td></tr>'; return; }
  var html = '';
  data.slice(0, 15).forEach(function(s) {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">';
    html += '<td style="padding:8px">' + escapeHtml(s.divisi || '-') + '</td>';
    html += '<td style="padding:8px">' + escapeHtml(s.tim_dinilai || '-') + '</td>';
    html += '<td style="padding:8px;color:#a78bfa">' + (s.keramahan || '-') + '</td>';
    html += '<td style="padding:8px;color:#a78bfa">' + (s.fast_response || '-') + '</td>';
    html += '<td style="padding:8px;color:#a78bfa">' + (s['3s'] || '-') + '</td>';
    html += '<td style="padding:8px;color:#a78bfa">' + (s.kualitas_kerja || '-') + '</td>';
    html += '<td style="padding:8px;color:#a78bfa">' + (s.komunikasi || '-') + '</td>';
    html += '<td style="padding:8px;color:#64748b;max-width:150px;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(s.feedback || '') + '</td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ═══ RATING TIKET — Chart Functions ═══

function renderCategoryChart(catStats) {
  var ctx = document.getElementById('chart-survey-category');
  if (!ctx) return;
  if (APP.charts.surveyCategory) APP.charts.surveyCategory.destroy();
  var labels = [], values = [], counts = [], colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
  Object.keys(catStats).forEach(function(k, i) {
    labels.push(k); values.push(catStats[k].count > 0 ? (catStats[k].sum / catStats[k].count) : 0); counts.push(catStats[k].count);
  });
  APP.charts.surveyCategory = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Rata-rata Rating', data: values, backgroundColor: colors.slice(0, labels.length), borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function(ctx) { return 'Jumlah: ' + (counts[ctx.dataIndex] || 0) + ' responden'; } } } } }
  });
}

function renderTeknisiChart(tekStats) {
  var ctx = document.getElementById('chart-survey-teknisi');
  if (!ctx) return;
  if (APP.charts.surveyTeknisi) APP.charts.surveyTeknisi.destroy();
  var labels = [], values = [], counts = [], colors = ['#10b981','#6366f1','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#ec4899'];
  Object.keys(tekStats).forEach(function(k, i) {
    labels.push(k); values.push(tekStats[k].count > 0 ? (tekStats[k].sum / tekStats[k].count) : 0); counts.push(tekStats[k].count);
  });
  APP.charts.surveyTeknisi = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Rata-rata Rating', data: values, backgroundColor: colors.slice(0, labels.length), borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 11 } } }, y: { ticks: { font: { size: 10 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function(ctx) { return 'Jumlah: ' + (counts[ctx.dataIndex] || 0) + ' responden'; } } } } }
  });
}

function renderDistribusiChart(dist) {
  var ctx = document.getElementById('chart-survey-distribusi');
  if (!ctx) return;
  if (APP.charts.surveyDistribusi) APP.charts.surveyDistribusi.destroy();
  var colors = ['#ef4444','#f59e0b','#fbbf24','#10b981','#059669'];
  APP.charts.surveyDistribusi = new Chart(ctx, {
    type: 'bar',
    data: { labels: ['1','2','3','4','5'], datasets: [{ label: 'Jumlah Responden', data: [dist['1']||0, dist['2']||0, dist['3']||0, dist['4']||0, dist['5']||0], backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { display: false } } }
  });
}

function renderTrendChart(trendData) {
  var ctx = document.getElementById('chart-survey-trend');
  if (!ctx) return;
  if (APP.charts.surveyTrend) APP.charts.surveyTrend.destroy();
  var labels = [], values = [], counts = [];
  var bulanNama = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  Object.keys(trendData).sort(function(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return parseInt(pa[1]) - parseInt(pb[1]) || parseInt(pa[0]) - parseInt(pb[0]);
  }).forEach(function(key) {
    var parts = key.split('-');
    labels.push(bulanNama[parseInt(parts[0])-1] + ' ' + parts[1]);
    values.push(trendData[key].count > 0 ? (trendData[key].sum / trendData[key].count) : 0);
    counts.push(trendData[key].count);
  });
  if (labels.length === 0) return;
  APP.charts.surveyTrend = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Rata-rata Rating', data: values, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 5, pointHoverRadius: 7 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function(ctx) { return 'Responden: ' + (counts[ctx.dataIndex] || 0); } } } } }
  });
}

function renderTicketTable(data) {
  var tbody = document.getElementById('tbody-survey');
  if (!tbody) return;
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#475569">Belum ada data rating survei</td></tr>'; return; }
  var html = '';
  data.slice(0, 20).forEach(function(t) {
    var r = parseFloat(t.rating_survei) || 0;
    var stars = '';
    for (var i = 0; i < Math.floor(r); i++) stars += '\u2B50';
    var badgeColor = r <= 2 ? '#f87171' : (r === 3 ? '#fb923c' : '#34d399');
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">';
    html += '<td style="padding:8px"><strong>' + escapeHtml(t.tiket_id || '-') + '</strong></td>';
    html += '<td style="padding:8px;color:#64748b">' + formatTime(t.timestamp) + '</td>';
    html += '<td style="padding:8px">' + escapeHtml(t.nama_customer || '-') + '</td>';
    html += '<td style="padding:8px"><span style="background:rgba(99,102,241,0.15);color:#a5b4fc;padding:2px 8px;border-radius:6px;font-size:0.7rem">' + escapeHtml(t.kategori || '-') + '</span></td>';
    html += '<td style="padding:8px">' + escapeHtml(t.teknisi || '-') + '</td>';
    html += '<td style="padding:8px;color:' + badgeColor + '">' + stars + ' ' + r.toFixed(1) + '</td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// PAGE: INBOX — Pesanan Masuk (asset_booking)
// ════════════════════════════════════════════════════════════
var _inboxData = [];

function showInboxDetail(i) {
  var b = _inboxData[i];
  if (!b) return;
  showModal('Detail Booking', [
    {label: 'ID Booking', value: b.id_booking},
    {label: 'Peminjam', value: b.nama_peminjam},
    {label: 'Divisi', value: b.divisi},
    {label: 'No. WA', value: b.no_wa},
    {label: 'Aset', value: b.nama_aset},
    {label: 'Mulai', value: b.waktu_mulai || '-'},
    {label: 'Selesai', value: b.waktu_selesai || '-'},
    {label: 'Konsumsi', value: b.konsumsi},
    {label: 'KM Awal', value: b.km_awal || '-'},
    {label: 'KM Akhir', value: b.km_akhir || '-'},
    {label: 'Status', value: b.status_booking, highlight: true}
  ]);
}

async function renderInbox(content) {
  content.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px">Memuat pesanan...</div>';
  try {
    var data = await apiCall('getAllBookings', []);
    _inboxData = data;

    // Stats
    var total = data.length;
    var pending = data.filter(function(b) { return b.status_booking === 'Pending' || b.status_booking === 'Approved (Auto)'; }).length;
    var completed = data.filter(function(b) { return b.status_booking === 'Completed'; }).length;
    var cancelled = data.filter(function(b) { return b.status_booking === 'Cancelled' || b.status_booking === 'Rejected (Bentrok)'; }).length;

    var html = '<div class="page-header"><div class="page-title">Pesanan Masuk</div><div class="page-desc">Booking & permintaan peminjaman aset</div></div>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-label">Total Booking</div><div class="stat-value blue">' + total + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Aktif / Pending</div><div class="stat-value orange">' + pending + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Selesai</div><div class="stat-value green">' + completed + '</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Dibatalkan</div><div class="stat-value red">' + cancelled + '</div></div>';
    html += '</div>';

    html += '<div class="section-card">';
    if (data.length === 0) {
      html += '<div style="color:#475569;text-align:center;padding:20px">Belum ada data booking</div>';
    } else {
      _inboxData = data;
      data.forEach(function(b, idx) {
        var statusColor = '#34d399';
        if (b.status_booking === 'Pending' || b.status_booking === 'Approved (Auto)') statusColor = '#fb923c';
        else if (b.status_booking === 'Cancelled' || b.status_booking === 'Rejected (Bentrok)') statusColor = '#f87171';
        else if (b.status_booking === 'Completed') statusColor = '#34d399';

        html += '<div class="activity-item clickable" onclick="showInboxDetail(' + idx + ')">';
        html += '<div class="activity-dot" style="background:' + statusColor + '"></div>';
        html += '<div class="activity-text">';
        html += '<strong>' + escapeHtml(b.nama_peminjam) + '</strong> — ' + escapeHtml(b.nama_aset);
        html += '<br><span style="color:#64748b">' + escapeHtml(b.divisi || '-') + ' | ' + formatTime(b.waktu_mulai) + ' - ' + formatTime(b.waktu_selesai) + '</span>';
        html += '</div>';
        html += '<div class="activity-time" style="color:' + statusColor + '">' + escapeHtml(b.status_booking) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div class="page-header"><div class="page-title">Pesanan Masuk</div><div class="page-desc">Booking & permintaan aset</div></div>' +
      '<div class="section-card"><div style="color:#f87171;text-align:center;padding:20px">Gagal memuat: ' + e.message + '</div></div>';
    console.error(e);
  }
}

// ════════════════════════════════════════════════════════════
// PAGE: GUESTS — Tamu Kos (master_kos, master_kamar, guest_booking)
// ════════════════════════════════════════════════════════════
var _guestKamarData = [];
var _guestKosData = [];

