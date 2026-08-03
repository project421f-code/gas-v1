/**
 * ============================================================
 * Code.gs — Entry Point & API Routing
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── WEB APP ENTRY POINT ────────────────────────────────────

/**
 * doGet() — Dipanggil saat user membuka URL Web App
 * Menampilkan halaman utama (index.html)
 */
function doGet(e) {
  // ─── TEST ENDPOINT: Simulasi webhook survey ────────────
  // Buka URL ini di browser (login sebagai Admin) untuk test:
  // ?testSurvey=1&tiket=MNT-2026-0017&rating=5
  if (e && e.parameter && e.parameter.testSurvey) {
    var tiketId = e.parameter.tiket || '';
    var rating = parseInt(e.parameter.rating, 10);
    if (tiketId && rating >= 1 && rating <= 5) {
      var result = saveSurveyRating(tiketId, rating);
      return ContentService
        .createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Parameter tidak valid. Gunakan ?testSurvey=1&tiket=ID&rating=1-5' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── TEST ENDPOINT: Simulasi webhook Fonnte penuh ──────
  // Buka URL ini di browser (login sebagai Admin) untuk test:
  // ?testWebhook=1&sender=6282247008466&message=5
  if (e && e.parameter && e.parameter.testWebhook) {
    var testPayload = {
      sender: e.parameter.sender || '6282247008466',
      message: e.parameter.message || '5',
      name: e.parameter.name || 'Test Customer'
    };
    var result = handleIncomingWhatsApp(testPayload);
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── SITEMAP PAGE: Daftar Layanan GA — DEFAULT ────
  // Halaman ini adalah default landing page.
  // Menampilkan semua layanan GA dalam bentuk kartu.
  // ?page=home  (eksplisit)
  // Tanpa parameter → otomatis ke sitemap
  var page = e && e.parameter ? e.parameter.page || '' : '';
  var isSitemapPage = !page && !(e && e.parameter && (
    e.parameter.action || e.parameter.testSurvey || e.parameter.testWebhook || 
    e.parameter.testDrive || e.parameter.fixAuditHeaders || e.parameter.cleanupBase64AuditPhotos || 
    e.parameter.initMissingSheets || e.parameter.seedDummy || e.parameter.testWAPhoto
  ));
  
  if (page === 'cek-aset' || isSitemapPage) {
    // Jika tanpa parameter, tampilkan sitemap dulu
    if (isSitemapPage) {
      try {
        return HtmlService
          .createHtmlOutput(generateSitemapPageHtml())
          .setTitle('GA Operations | General Affair')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } catch (err) {
        Logger.log('Sitemap Page Error: ' + err.message);
        // Fallback: redirect to booking
        var scriptUrl = ScriptApp.getService().getUrl();
        return HtmlService
          .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><script>window.top.location.href="' + scriptUrl + '?page=cek-aset"</script></body></html>');
      }
    }
    
    // ─── CEK ASET PAGE ────────────────────────────────
    // ?page=cek-aset  → booking page
    var tanggal = e.parameter.date || '';
    var wa = e.parameter.wa || '';
    var bookingResult = null;
    
    try {
      if (e.parameter.book === '1') {
        var payload = {
          nama_peminjam: e.parameter.nama || '',
          divisi: e.parameter.divisi || '',
          no_wa: e.parameter.wa || '',
          nama_aset: e.parameter.aset || '',
          waktu_mulai: e.parameter.mulai || '',
          waktu_selesai: e.parameter.selesai || '',
          konsumsi: e.parameter.konsumsi || 'Tidak',
          km_awal: e.parameter.km || ''
        };
        bookingResult = publicBooking(payload);
      }
    } catch (err) {
      Logger.log('Public Booking Error: ' + err.message);
      bookingResult = { success: false, error: 'Gagal memproses booking: ' + err.message };
    }
    
    try {
      return HtmlService
        .createHtmlOutput(generatePublicPageHtml(tanggal, wa, bookingResult))
        .setTitle('Cek Ketersediaan Aset | General Affair')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Public Page Render Error: ' + err.message);
      var scriptUrl = ScriptApp.getService().getUrl();
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/\"/g,'&quot;') + '</p><br><a href="' + scriptUrl + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a></body></html>')
        .setTitle('Error | Cek Ketersediaan Aset');
    }
  }

  // ─── SURVEY PAGE: Kepuasan Pelayanan GA ───────────
  // ?page=survey  → tampilkan form survey publik
  // ?page=survey&submit=1&divisi=...&...  → proses submit survey
  // Publik — bisa diakses tanpa login
  if (e && e.parameter && e.parameter.page === 'survey') {
    try {
      var surveyResult = null;
      if (e.parameter.submit === '1') {
        var surveyPayload = {
          divisi: e.parameter.divisi || '',
          feedback: e.parameter.feedback || ''
        };
        // Collect all team_criteria ratings
        ['mnt','hk','gs','aset'].forEach(function(t) {
          ['keramahan','fast_response','3s','kualitas_kerja','komunikasi'].forEach(function(c) {
            var key = t + '_' + c;
            surveyPayload[key] = e.parameter[key] || '';
          });
        });
        surveyResult = submitSurvey(surveyPayload);
      }
      return HtmlService
        .createHtmlOutput(generateSurveyPageHtml(surveyResult))
        .setTitle('Survey Kepuasan GA | ' + CONFIG.ORG_NAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>')
        .setTitle('Error | Survey GA');
    }
  }

  // ─── SITEMAP PAGE (eksplisit) ──────────────────
  // ?page=home  → tampilkan halaman sitemap
  if (page === 'home') {
    try {
      return HtmlService
        .createHtmlOutput(generateSitemapPageHtml())
        .setTitle('GA Operations | General Affair')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Sitemap Error: ' + err.message);
      var scriptUrl = ScriptApp.getService().getUrl();
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>');
    }
  }

  // ─── ADMIN APP: Login & Dashboard ────────────────
  // ?page=app  → tampilkan shell yang load app dari CDN
  if (e && e.parameter && e.parameter.page === 'app') {
    try {
      var htmlOutput = HtmlService.createHtmlOutputFromFile('index');
      var htmlContent = htmlOutput.getContent();
      
      // Inject CDN_URL dari PropertiesService
      var cdnUrl = getSetting('CDN_URL');
      if (!cdnUrl) {
        // Fallback: coba dari parameter URL (untuk setup)
        cdnUrl = e.parameter.cdn || '';
      }
      htmlContent = htmlContent.replace('__CDN_URL__', cdnUrl);
      
      return HtmlService
        .createHtmlOutput(htmlContent)
        .setTitle(CONFIG.APP_NAME + ' | ' + CONFIG.ORG_NAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Admin App Error: ' + err.message);
      var scriptUrl = ScriptApp.getService().getUrl();
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Gagal memuat aplikasi</h2><p style="color:#94a3b8">' + err.message.replace(/\"/g,'&quot;') + '</p><br><a href="' + scriptUrl + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a></body></html>')
        .setTitle('Error | ' + CONFIG.APP_NAME);
    }
  }

  // ─── TEST DRIVE ENDPOINT ─────────────────────────────
  // Buka URL ini untuk menguji akses Drive & memicu authorization:
  // ?testDrive=1
  // Jika belum authorize, GAS akan minta izin. Setelah approve, buka lagi.
  if (e && e.parameter && e.parameter.testDrive) {
    try {
      var testFolderName = 'GA_Test_' + new Date().getTime();
      var testFolder = DriveApp.createFolder(testFolderName);
      var testFile = testFolder.createFile('test.txt', 'Test file - GA Operations Drive access works!');
      testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var folderUrl = testFolder.getUrl();
      var fileUrl = testFile.getUrl();
      // Cleanup: hapus test files
      testFile.setTrashed(true);
      testFolder.setTrashed(true);
      
      var result = { success: true, message: '✅ Akses Drive berfungsi!', folderUrl: folderUrl, fileUrl: fileUrl };
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2 style="color:#34d399">✅ Drive Access OK</h2>' +
        '<p style="color:#94a3b8">Google Drive berfungsi dengan baik! File test berhasil dibuat & dihapus.</p>' +
        '<pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br>' +
        '<a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Test Drive | GA Operations');
    } catch (err) {
      var errMsg = err.message ? err.message.replace(/\"/g,'&quot;') : 'Unknown error';
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2 style="color:#ef4444">❌ Drive Access Error</h2>' +
        '<p style="color:#fca5a5">Gagal mengakses Drive:</p>' +
        '<pre style="color:#fca5a5;text-align:left;max-width:600px;margin:20px auto;background:rgba(239,68,68,0.1);padding:16px;border-radius:12px">' +
        errMsg + '</pre>' +
        '<br>' +
        '<p style="color:#94a3b8">Kemungkinan: Drive App belum di-authorize. Buka GAS Editor → Run fungsi apapun yang pakai DriveApp → Approve izin → deploy ulang.</p>' +
        '<a href="https://script.google.com/home/projects/1nbdV_VaGIzVC1vb9QTAvGnWawtF7zYTX3GdpCk5rgSgR6IhIkxLzvobd/edit" target="_blank" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600;margin-top:12px">🔑 Buka GAS Editor</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Test Drive | GA Operations');
    }
  }

  // ─── FIX AUDIT HEADERS ENDPOINT ──────────────────────
  // Buka URL ini di browser untuk memperbaiki misalignment kolom catatan/foto_temuan:
  // ?fixAuditHeaders=1
  // AMAN: hanya memperbaiki header dan data yang salah urutan
  if (e && e.parameter && e.parameter.fixAuditHeaders) {
    try {
      var result = fixAuditHousekeepingHeaders();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🔧 Fix Audit Headers</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Fix Audit Headers | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── TEST WA PHOTO TO DRIVE ────────────────────────
  // Buka URL ini untuk test simpan file ke Google Drive:
  // ?testWAPhoto=1
  // Test ini membuat dummy file dulu, lalu coba download dari URL jika disediakan
  if (e && e.parameter && e.parameter.testWAPhoto) {
    try {
      var results = [];
      
      // Test 1: Buat folder & file test sederhana
      try {
        var folderName = 'GA_Complaint_Photos';
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        
        var testFile = folder.createFile('test_' + new Date().getTime() + '.txt', 'GA Operations - Drive test file. Created: ' + nowFormatted());
        testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        results.push({ test: 'Buat folder & file test', success: true, url: testFile.getUrl(), name: testFile.getName() });
      } catch (e) {
        results.push({ test: 'Buat folder & file test', success: false, error: e.message });
      }
      
      // Test 2: Download dari URL (jika disediakan parameter url)
      var testUrl = e.parameter.url;
      if (testUrl) {
        try {
          var photoResult = savePhotoFromUrlToDrive(testUrl, 'GA_Complaint_Photos', 'test_download');
          if (photoResult.success) {
            results.push({ test: 'Download dari URL: ' + testUrl.substring(0, 80), success: true, url: photoResult.data.url, name: photoResult.data.name });
          } else {
            results.push({ test: 'Download dari URL', success: false, error: photoResult.error });
          }
        } catch (e) {
          results.push({ test: 'Download dari URL', success: false, error: e.message });
        }
      } else {
        results.push({ test: 'Download dari URL', success: true, skipped: true, message: 'Tidak ada parameter &url=. Gunakan ?testWAPhoto=1&url=IMAGE_URL untuk test download.' });
      }
      
      // Hasil
      var allOk = results.every(function(r) { return r.success === true; });
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>' + (allOk ? '📷✅ Drive Siap!' : '⚠️ Drive OK tapi ada catatan') + '</h2>' +
        '<pre style="color:#94a3b8;text-align:left;max-width:700px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px;overflow-x:auto">' +
        JSON.stringify(results, null, 2) + '</pre><br>';
      
      if (results[0] && results[0].url) {
        html += '<a href="' + results[0].url + '" target="_blank" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600;margin-bottom:12px">📂 Buka File Test</a><br>';
      }
      html += '<a href="https://drive.google.com/drive/search?q=GA_Complaint_Photos" target="_blank" style="color:#94a3b8;font-size:0.85rem">📂 Buka Folder GA_Complaint_Photos</a>' +
        '<br><br><hr style="border-color:rgba(255,255,255,0.1);margin:20px 0">' +
        '<p style="color:#94a3b8;font-size:0.85rem">💡 Untuk test download foto dari URL: <code style="color:#e0e7ff">?testWAPhoto=1&url=https://contoh.com/foto.jpg</code></p>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Test WA Photo | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── CLEANUP BASE64 ENDPOINT ────────────────────────
  // Buka URL ini di browser untuk membersihkan data base64 foto lama:
  // ?cleanupBase64AuditPhotos=1
  // AMAN: hanya mengosongkan cell foto_temuan yang berisi data:image base64
  if (e && e.parameter && e.parameter.cleanupBase64AuditPhotos) {
    try {
      var result = cleanupBase64AuditPhotos();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🧹 Cleanup Base64 Foto</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Cleanup Base64 | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── SEED DUMMY DATA ENDPOINT ────────────────────
  // Buka URL ini di browser untuk mengisi 1 baris dummy data per tabel:
  // ?seedDummy=1
  if (e && e.parameter && e.parameter.seedDummy) {
    try {
      var result = seedDummyData();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🌱 Seed Dummy Data</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Seed Data | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── INIT DB ENDPOINT ─────────────────────────────
  // Buka URL ini di browser untuk membuat sheet yang belum ada:
  // ?initMissingSheets=1
  // AMAN: hanya membuat sheet yang belum ada, tidak menghapus data apapun
  if (e && e.parameter && e.parameter.initMissingSheets) {
    try {
      var result = initializeMissingSheetsOnly();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>✅ Inisialisasi Selesai</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Init DB | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/\"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── PUBLIC JSON API ──────────────────────────────
  // Endpoint untuk akses eksternal (via fetch() dari luar GAS)
  // ?action=getAssets&date=2026-07-20  →  JSON daftar aset
  // ?action=book&nama=...&wa=...&aset=...  →  JSON hasil booking
  if (e && e.parameter && e.parameter.action) {
    return handlePublicApi(e);
  }

  // ─── DEFAULT: Sitemap ───────────────────────────
  // Fallback safety — redirect ke sitemap
  return HtmlService
    .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>🚀 GA Operations</h2><p style="color:#94a3b8">Mengarahkan...</p><script>window.top.location.href="' + ScriptApp.getService().getUrl() + '?page=home"</script></body></html>')
    .setTitle(CONFIG.APP_NAME);
}

// ─── WEB APP ENTRY POINT — POST (fetch dari GitHub Pages) ────

/**
 * doPost() — Endpoint JSON untuk frontend yang di-host di GitHub Pages
 * Frontend memanggil dengan fetch():
 *
 *   fetch(WEBAPP_URL, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
 *     body: JSON.stringify({ email, sessionToken, actionName, args })
 *   })
 *
 * @return {ContentService} JSON response dari executeAction()
 */
function doPost(e) {
  try {
    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      // Fallback: parse URL-encoded jika bukan JSON
      if (e.parameter) {
        payload = {
          email: e.parameter.email || '',
          sessionToken: e.parameter.sessionToken || '',
          actionName: e.parameter.actionName || '',
          args: e.parameter.args ? JSON.parse(e.parameter.args) : []
        };
      }
    }

    var email = payload.email || '';
    var sessionToken = payload.sessionToken || '';
    var actionName = payload.actionName || '';
    var args = payload.args || [];

    var result = executeAction(email, sessionToken, actionName, args);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost Error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── API ROUTING ─────────────────────────────────────────────

/**
 * executeAction() — Router utama untuk semua panggilan dari frontend
 * Semua fungsi API dipanggil melalui fungsi ini dengan validasi sesi
 *
 * @param {string} email - Email user yang sedang login
 * @param {string} sessionToken - Token sesi (dari CacheService)
 * @param {string} actionName - Nama fungsi yang akan dipanggil
 * @param {Array} args - Array argumen untuk fungsi tersebut
 * @return {Object} Response dari fungsi yang dipanggil
 */
function executeAction(email, sessionToken, actionName, args) {
  try {
    // Daftar fungsi yang boleh dipanggil tanpa autentikasi
    var publicActions = [
      'loginWithEmailAndPassword',
      'loginWithGoogleSSO',
      'checkGoogleSSO',
      'getAppInfo',
      'getPublicAssetsAvailability',
      'publicBooking',
      'publicComplaint'
    ];

    // Jika bukan public action, validasi token
    if (publicActions.indexOf(actionName) === -1) {
      if (!email || !sessionToken) {
        return errorResponse('Sesi tidak valid. Silakan login ulang.');
      }

      // Validasi token dari CacheService
      if (!validateSessionToken(email, sessionToken)) {
        return { success: false, error: 'Sesi telah berakhir. Silakan login ulang.', sessionExpired: true };
      }

      // Set current user email untuk digunakan di seluruh API
      CURRENT_USER_EMAIL = email;
    }

    // Cari dan panggil fungsi secara dinamis
    var fn = resolveFunction(actionName);
    if (typeof fn !== 'function') {
      return errorResponse('Fungsi "' + actionName + '" tidak ditemukan.');
    }

    // Panggil fungsi dengan argumen
    if (args && args.length > 0) {
      return fn.apply(this, args);
    } else {
      return fn();
    }

  } catch (e) {
    Logger.log('executeAction Error [' + actionName + ']: ' + e.message);
    return errorResponse(e.message);
  }
}

// ─── FUNCTION REGISTRY ───────────────────────────────────────

/**
 * Resolve fungsi dari nama secara dinamis
 * GAS V8 strict mode: this[name] TIDAK bisa akses fungsi global.
 * Harus pakai globalThis[name] yang selalu mengacu ke global scope.
 */
function resolveFunction(name) {
  // globalThis adalah standar ES2020 untuk mengakses global object
  // Di GAS V8, globalThis berisi SEMUA fungsi dari semua file .gs
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis[name] === 'function') {
      return globalThis[name];
    }
  }
  // Fallback: coba dari this (untuk non-strict mode)
  if (typeof this[name] === 'function') {
    return this[name];
  }
  return null;
}

// ─── UTILITY ENDPOINTS ──────────────────────────────────────

/**
 * Mendapatkan informasi aplikasi (publik)
 */
function getAppInfo() {
  return successResponse({
    appName: CONFIG.APP_NAME,
    orgName: CONFIG.ORG_NAME,
    version: CONFIG.VERSION
  });
}

/**
 * Helper untuk GAS include() pattern
 * Memuat konten dari file .html lain ke dalam template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Cek apakah Google SSO tersedia
 * Mengembalikan email Google aktif jika ada
 */
/**
 * Generate landing page (sitemap) HTML
 * Menampilkan halaman depan GA Operations dengan link ke fitur publik & admin
 */
function generateSitemapPageHtml() {
  var baseUrl = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html lang="id"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">' +
    '<title>GA Operations | General Affair</title>' +
    '<style>' +
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;' +
    'background:linear-gradient(135deg,#0a0f1e,#111936,#0d1229);min-height:100vh;color:#e0e7ff;' +
    'display:flex;flex-direction:column;align-items:center;padding:40px 20px}' +
    '.logo{width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);' +
    'border-radius:16px;display:flex;align-items:center;justify-content:center;' + '.logo svg{width:64px;height:64px}' +
    'box-shadow:0 0 30px rgba(99,102,241,0.3)}' +
    'h1{font-size:1.5rem;font-weight:700;margin-bottom:4px}' +
    '.subtitle{color:#94a3b8;font-size:0.85rem;margin-bottom:32px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));' +
    'gap:16px;width:100%;max-width:900px}' +
    '.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);' +
    'border-radius:16px;padding:24px;text-align:center;transition:all 0.25s ease;' +
    'text-decoration:none;color:#e0e7ff;display:block}' +
    '.card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);' +
    'transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.2)}' +
    '.card-icon{font-size:2rem;margin-bottom:12px}' +
    '.card-title{font-size:1rem;font-weight:600;margin-bottom:4px}' +
    '.card-desc{font-size:0.78rem;color:#94a3b8}' +
    '.footer{margin-top:40px;color:#475569;font-size:0.75rem;text-align:center}' +
    '.admin-link{display:inline-block;margin-top:24px;padding:10px 24px;' +
    'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:12px;' +
    'text-decoration:none;font-weight:600;font-size:0.85rem;transition:all 0.25s ease}' +
    '.admin-link:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(99,102,241,0.4)}' +
    '</style></head><body>' +
    '<div class="logo"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ll"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="14" fill="url(#ll)"/><rect x="5" y="5" width="54" height="54" rx="11" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" opacity="0.3"/><text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-family="Inter,sans-serif" font-weight="800" font-size="16" fill="white" letter-spacing="2">GAS</text><text x="32" y="47" text-anchor="middle" dominant-baseline="central" font-family="Inter,sans-serif" font-weight="500" font-size="4.5" fill="#c4b5fd" letter-spacing="0.6">Operations</text></svg></div>' +
    '<h1>GA Operations</h1>' +
    '<p class="subtitle">Sistem Manajemen Operasional General Affair</p>' +
    '<div class="grid">' +
    '<a class="card" href="' + baseUrl + '?page=cek-aset">' +
    '<div class="card-icon">📅</div>' +
    '<div class="card-title">Cek Ketersediaan Aset</div>' +
    '<div class="card-desc">Lihat jadwal & booking peminjaman aset kantor</div></a>' +
    '<a class="card" href="' + baseUrl + '?page=survey">' +
    '<div class="card-icon">📋</div>' +
    '<div class="card-title">Survey Kepuasan GA</div>' +
    '<div class="card-desc">Berikan penilaian layanan General Affair</div></a>' +
    '</div>' +
    '<a class="admin-link" href="' + baseUrl + '?page=app">🔐 Admin Login</a>' +
    '<div class="footer">GA Operations v1.0 &mdash; Sistem Terintegrasi</div>' +
    '</body></html>'
  ).getContent();
}

function checkGoogleSSO() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) {
      return successResponse({ email: email });
    }
    return successResponse({ email: null });
  } catch (e) {
    return successResponse({ email: null });
  }
}





var IMPORT_ALLOWED_SHEETS = [
  'Asset_List',
  'Master_SLA',
  'Master_CS_Schedule',
  'Master_Lokasi',
  'Master_Patrol_Checkpoints',
  'Master_Patrol_Schedule',
  'User_List'
];

function importMasterData(sheetName, csvData) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (IMPORT_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      throw new Error('Sheet "' + sheetName + '" tidak diizinkan untuk import.');
    }

    if (!csvData || csvData.trim() === '') {
      throw new Error('Data CSV kosong.');
    }

    return withLock(function() {
      var sheet = getSheet(sheetName);
      
      // Parse CSV (handle quoted fields) — pakai fungsi bersama
      var lines = parseCSVToLines(csvData);
      
      if (lines.length < 2) {
        throw new Error('Data CSV harus memiliki minimal 2 baris (header + 1 data).');
      }

      // Parse header
      var headers = parseCSVLine(lines[0]);
      var headerMap = {};
      headers.forEach(function(h, idx) {
        headerMap[h.trim()] = idx;
      });

      // Get existing headers from sheet
      var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Build column mapping: import headers → sheet column index
      var colMap = {};
      for (var h in headerMap) {
        var colIdx = existingHeaders.indexOf(h);
        if (colIdx >= 0) {
          colMap[h] = colIdx;
        }
      }

      if (Object.keys(colMap).length === 0) {
        throw new Error('Tidak ada kolom yang cocok dengan header sheet. Pastikan header CSV sesuai.');
      }

      // Get last row to append after
      var lastRow = sheet.getLastRow();
      if (lastRow < 1) lastRow = 1;
      var totalCols = existingHeaders.length;
      
      var imported = 0;
      var errors = 0;

      for (var li = 1; li < lines.length; li++) {
        if (!lines[li].trim()) continue;
        
        try {
          var values = parseCSVLine(lines[li]);
          var newRow = [];
          for (var ci2 = 0; ci2 < totalCols; ci2++) {
            newRow.push('');
          }
          
          for (var h2 in colMap) {
            var srcIdx = headerMap[h2];
            if (srcIdx < values.length) {
              newRow[colMap[h2]] = values[srcIdx].trim();
            }
          }
          
          sheet.appendRow(newRow);
          imported++;
        } catch (rowErr) {
          errors++;
          Logger.log('Import row ' + (li + 1) + ' error: ' + rowErr.message);
        }
      }

      return successResponse({ imported: imported, errors: errors }, 'Import selesai: ' + imported + ' baris ditambahkan' + (errors > 0 ? ', ' + errors + ' gagal.' : '.'));
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function previewImportData(sheetName, csvData) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (IMPORT_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      throw new Error('Sheet "' + sheetName + '" tidak diizinkan.');
    }
    if (!csvData || csvData.trim() === '') {
      throw new Error('Data CSV kosong.');
    }

    var lines = parseCSVToLines(csvData);
    if (lines.length < 2) {
      throw new Error('CSV harus memiliki header + minimal 1 baris data.');
    }

    var headers = parseCSVLine(lines[0]);
    var totalRows = lines.length - 1;

    // Ambil 10 baris pertama untuk preview
    var previewRows = [];
    var maxPreview = Math.min(totalRows, 10);
    for (var i = 1; i <= maxPreview; i++) {
      var rowData = {};
      var values = parseCSVLine(lines[i]);
      for (var j = 0; j < headers.length; j++) {
        rowData[headers[j].trim()] = (j < values.length) ? values[j].trim() : '';
      }
      previewRows.push(rowData);
    }

    // Cek kecocokan header dengan sheet
    var sheet = getSheet(sheetName);
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var matchedCols = 0;
    var unmatchedCols = [];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = headers[hi].trim();
      if (existingHeaders.indexOf(h) >= 0) {
        matchedCols++;
      } else {
        unmatchedCols.push(h);
      }
    }

    return successResponse({
      headers: headers,
      totalRows: totalRows,
      previewRows: previewRows,
      matchedCols: matchedCols,
      unmatchedCols: unmatchedCols,
      totalCols: headers.length
    }, 'Ditemukan ' + totalRows + ' baris data. ' + matchedCols + '/' + headers.length + ' kolom cocok.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

function parseCSVLine(line) {
  var result = [];
  var current = '';
  var inQuotes = false;
  // Bersihkan carriage return (Windows CRLF)
  line = line.replace(/\r/g, '');
  for (var i = 0; i < line.length; i++) {
    var chr = line[i];
    if (chr === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (chr === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += chr;
    }
  }
  result.push(current);
  return result;
}

function parseCSVToLines(csvData) {
  var lines = [];
  var currentLine = '';
  var inQuote = false;
  for (var ci = 0; ci < csvData.length; ci++) {
    var ch = csvData[ci];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === '\n' && !inQuote) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += ch;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines;
}

function loadMasterData() {
  try {
    var user = getActiveUserSession();
    
    // Baca semua master data — gunakan getCachedSheetData untuk yang jarang berubah
    var userList = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
    var slaList = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    var csSchedule = getCachedSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE, 3600);
    var locationList = getCachedSheetData(CONFIG.SHEETS.MASTER_LOKASI, 3600);
    var patrolCheckpoints = getCachedSheetData(CONFIG.SHEETS.PATROL_CHECKPOINTS, 3600);
    var patrolSchedules = getCachedSheetData(CONFIG.SHEETS.PATROL_SCHEDULE, 3600);
    var assetList = getCachedSheetData(CONFIG.SHEETS.ASSET_LIST, 1800);
    var kosList = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    
    // Jangan kirim field password ke frontend
    var safeUserList = userList.map(function(u) {
      return {
        user_id: u.user_id,
        email: u.email,
        nama: u.nama,
        role: u.role,
        tim: u.tim,
        status: u.status,
        no_wa: u.no_wa || ''
      };
    });
    
    // Build SLA categories untuk dropdown frontend
    var slaCategories = {};
    slaList.forEach(function(d) {
      if (d.kategori && !slaCategories[d.kategori]) {
        slaCategories[d.kategori] = [];
      }
      if (d.sub_kategori && slaCategories[d.kategori] && slaCategories[d.kategori].indexOf(d.sub_kategori) === -1) {
        slaCategories[d.kategori].push(d.sub_kategori);
      }
    });
    
    return successResponse({
      userList: safeUserList,
      slaList: slaList,
      slaCategories: slaCategories,
      csSchedule: csSchedule,
      locationList: locationList,
      patrolCheckpoints: patrolCheckpoints,
      patrolSchedules: patrolSchedules,
      assetList: assetList,
      kosList: kosList
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function generateWebhookStatusHtml() {
  var status = getWebhookStatus();
  var scriptUrl = ScriptApp.getService().getUrl();
  var err = status.error;

  // Status token
  var tokenStatus = err ? 'unknown' : (status.wa_token_configured ? 'ok' : 'missing');
  var tokenIcon = { 'ok': '✅', 'missing': '❌', 'unknown': '❓' }[tokenStatus];
  var tokenText = { 'ok': 'Token WhatsApp <b>terkonfigurasi</b>',
                    'missing': 'Token WhatsApp <b>BELUM dikonfigurasi</b>',
                    'unknown': 'Gagal membaca status token' }[tokenStatus];
  var tokenHint = status.wa_token_configured
    ? 'Preview: ' + status.wa_token_preview
    : 'Jalankan fungsi <code>setupWAToken()</code> di GAS Editor, lalu <b>Deploy ulang</b> Web App.';

  // Status webhook terakhir
  var wh = status.last_webhook;
  var webhookHtml = wh ? '' +
    '<div class="field"><span class="label">Waktu</span><span class="val">' + escapeHtml(wh.time) + '</span></div>' +
    '<div class="field"><span class="label">Pengirim</span><span class="val">' + escapeHtml(wh.sender) + '</span></div>' +
    '<div class="field"><span class="label">Nama</span><span class="val">' + escapeHtml(wh.name) + '</span></div>' +
    '<div class="field"><span class="label">Pesan</span><span class="val mono">' + escapeHtml(wh.message_preview) + '</span></div>' +
    '<div class="field"><span class="label">Aksi</span><span class="val">' + escapeHtml(wh.action) + '</span></div>' +
    '<div class="field"><span class="label">Hasil</span><span class="val">' + escapeHtml(wh.result) + '</span></div>'
    : '<div style="color:#64748b;padding:12px 0">Belum ada webhook yang diterima. Kirim pesan ke nomor WA atau klik tombol test di bawah.</div>';

  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Webhook Status | ' + CONFIG.APP_NAME + '</title>\n<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;min-height:100vh;padding:32px 16px}' +
    '.wrap{max-width:640px;margin:0 auto}' +
    'h1{font-size:1.3rem;font-weight:800;margin-bottom:4px}' +
    'h1 span{font-size:1.1rem}' +
    '.sub{color:#64748b;font-size:.82rem;margin-bottom:24px}' +
    '.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}' +
    '.card-title{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:14px}' +
    '.field{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:12px}' +
    '.field:last-child{border:none}' +
    '.label{color:#94a3b8;font-size:.82rem;min-width:100px;flex-shrink:0}' +
    '.val{font-size:.85rem;text-align:right;word-break:break-all}' +
    '.mono{font-family:monospace;font-size:.78rem;color:#a5b4fc;max-width:300px;overflow:hidden;text-overflow:ellipsis}' +
    '.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700}' +
    '.badge-ok{background:rgba(52,211,153,.15);color:#34d399}' +
    '.badge-missing{background:rgba(239,68,68,.15);color:#fca5a5}' +
    '.badge-unknown{background:rgba(148,163,184,.15);color:#94a3b8}' +
    '.hint{font-size:.78rem;color:#64748b;margin-top:8px;padding:10px 14px;background:rgba(99,102,241,.1);border-radius:10px;line-height:1.5}' +
    '.hint code{background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px;font-size:.75rem}' +
    '.btn-group{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}' +
    '.btn{display:inline-block;padding:10px 18px;border-radius:10px;text-decoration:none;font-size:.82rem;font-weight:600;text-align:center;transition:all .2s}' +
    '.btn-primary{background:#6366f1;color:#fff}' +
    '.btn-primary:hover{background:#4f46e5}' +
    '.btn-outline{border:1px solid rgba(255,255,255,.15);color:#c7d2fe}' +
    '.btn-outline:hover{background:rgba(255,255,255,.05)}' +
    '.btn-success{background:#10b981;color:#fff}' +
    '.btn-success:hover{background:#059669}' +
    '.empty{text-align:center;padding:20px 0}' +
    '.url-box{background:rgba(0,0,0,.2);border-radius:10px;padding:12px 14px;font-family:monospace;font-size:.78rem;color:#a5b4fc;word-break:break-all;margin:8px 0}' +
    '</style>\n</head>\n<body>\n<div class="wrap">' +
    '<h1><span>📡</span> Webhook Status</h1>' +
    '<p class="sub">' + CONFIG.APP_NAME + ' — Validasi koneksi WhatsApp &amp; webhook Fonnte</p>' +
    '<!-- KARTU 1: STATUS TOKEN -->' +
    '<div class="card">' +
    '<div class="card-title">🔑 WhatsApp API Token</div>' +
    '<div style="margin-bottom:10px"><span class="badge badge-' + tokenStatus + '">' + tokenIcon + ' ' + { 'ok': 'Terkonfigurasi', 'missing': 'Belum Diset', 'unknown': 'Error' }[tokenStatus] + '</span></div>' +
    '<div class="hint">' + tokenText + '<br>' + tokenHint + '</div>' +
    '</div>' +
    '<!-- KARTU 2: WEBHOOK URL -->' +
    '<div class="card">' +
    '<div class="card-title">🌐 Webhook URL (Fonnte)</div>' +
    '<div class="url-box">' + escapeHtml(scriptUrl) + '</div>' +
    '<div class="hint">' +
    '1. Buka <a href="https://panel.fonnte.com" target="_blank" style="color:#6366f1">panel.fonnte.com</a> → Device → Edit<br>' +
    '2. Paste URL di atas ke kolom <b>Webhook URL</b><br>' +
    '3. Nyalakan <b>Auto Read</b> (WAJIB ON)<br>' +
    '4. Klik Save &nbsp; <span style="color:#f59e0b">⚡</span>' +
    '</div>' +
    '</div>' +
    '<!-- KARTU 3: WEBHOOK TERAKHIR -->' +
    '<div class="card">' +
    '<div class="card-title">📩 Webhook Terakhir Diterima</div>' +
    webhookHtml +
    '<div class="btn-group">' +
    '<a href="' + scriptUrl + '?testWebhook=1&sender=628xxx&message=Nama:Test%0ALokasi:Kamar%0ADeskripsi:Test%20webhook" class="btn btn-primary">🧪 Test Tiket</a>' +
    '<a href="' + scriptUrl + '?testWebhook=1&sender=628xxx&message=5" class="btn btn-success">⭐ Test Survey</a>' +
    '<a href="' + scriptUrl + '" class="btn btn-outline">🏠 Beranda</a>' +
    '</div>' +
    '<div class="hint" style="margin-top:12px">' +
    'Klik tombol test di atas setelah deploy untuk simulasi webhook.<br>' +
    'Ganti <code>628xxx</code> dengan nomor WA tujuan (format 628xx tanpa +).' +
    '</div>' +
    '</div>' +
    '<!-- KARTU 4: INFORMASI -->' +
    '<div class="card">' +
    '<div class="card-title">ℹ️ Informasi Sistem</div>' +
    '<div class="field"><span class="label">Spreadsheet</span><span class="val mono" style="font-size:.7rem">' + escapeHtml(status.spreadsheet_id || '-') + '</span></div>' +
    '<div class="field"><span class="label">Timezone</span><span class="val">' + escapeHtml(status.timezone || '-') + '</span></div>' +
    '</div>' +
    '</div>\n</body>\n</html>';
}

function generateComplaintReportHtml(lokasiPrefill, result) {
  var scriptUrl = ScriptApp.getService().getUrl();
  var currentYear = new Date().getFullYear();
  
  // Kategori options
  var kategoriOptions = '';
  try {
    var slaData = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    var kategoris = {};
    slaData.forEach(function(d) {
      if (d.kategori && !kategoris[d.kategori]) {
        kategoris[d.kategori] = true;
      }
    });
    var katList = Object.keys(kategoris);
    katList.forEach(function(k) {
      kategoriOptions += '<option value="' + k + '">' + k + '</option>';
    });
  } catch(e) {
    kategoriOptions = '<option>Lainnya</option>';
  }
  if (kategoriOptions.indexOf('Lainnya') < 0) {
    kategoriOptions += '<option>Lainnya</option>';
  }
  
  // Lokasi options
  var lokasiOptions = '<option value="">Pilih Lokasi</option>';
  try {
    var csData = getCachedSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE, 3600);
    var seenLokasi = {};
    csData.forEach(function(d) {
      if (d.lokasi_area && !seenLokasi[d.lokasi_area]) {
        seenLokasi[d.lokasi_area] = true;
        var sel = (lokasiPrefill === d.lokasi_area) ? ' selected' : '';
        lokasiOptions += '<option value="' + escapeHtml(d.lokasi_area) + '"' + sel + '>' + escapeHtml(d.lokasi_area) + '</option>';
      }
    });
  } catch(e) {}
  
  // Success/Error message
  var msgHtml = '';
  if (result) {
    if (result.success || result.status === true) {
      msgHtml = '<div class="msg success">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">✅</div>' +
        '<h2 style="color:#34d399;margin-bottom:8px">Laporan Terkirim!</h2>' +
        '<p style="color:#e0e7ff">' + escapeHtml(result.message || 'Tiket berhasil dibuat. Tim kami akan segera menindaklanjuti.') + '</p>' +
        (result.data && result.data.tiket_id ? '<p style="color:#94a3b8;margin-top:8px;font-size:0.82rem">ID Tiket: <strong>' + escapeHtml(result.data.tiket_id) + '</strong></p>' : '') +
        '<a href="' + scriptUrl + '?page=report" class="btn btn-primary" style="margin-top:16px">📝 Laporkan Lagi</a>' +
        '</div>';
    } else {
      msgHtml = '<div class="msg error">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">❌</div>' +
        '<h2 style="color:#fca5a5;margin-bottom:8px">Gagal Mengirim</h2>' +
        '<p style="color:#e0e7ff">' + escapeHtml(result.error || 'Terjadi kesalahan. Silakan coba lagi.') + '</p>' +
        '</div>';
    }
  }
  
  var formDisplay = result ? 'style="display:none"' : '';
  
  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Lapor Kerusakan | ' + CONFIG.ORG_NAME + '</title>\n<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;min-height:100vh;padding:24px 16px}' +
    '.wrap{max-width:520px;margin:0 auto}' +
    '.logo{width:56px;height:56px;margin:0 auto 16px;background:linear-gradient(135deg,#ef4444,#f87171);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 30px rgba(239,68,68,.3)}' +
    'h1{font-size:1.3rem;font-weight:800;text-align:center;margin-bottom:4px}' +
    'h1 span{font-size:1.1rem}' +
    '.sub{color:#64748b;font-size:.82rem;text-align:center;margin-bottom:24px}' +
    '.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}' +
    '.form-group{margin-bottom:14px}' +
    'label{display:block;font-size:.78rem;font-weight:600;color:#94a3b8;margin-bottom:6px}' +
    'input,select,textarea{width:100%;padding:10px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e0e7ff;font-family:inherit;font-size:.85rem;outline:none;transition:all .2s}' +
    'input:focus,select:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}' +
    'select option{background:#1e293b;color:#e0e7ff}' +
    'textarea{resize:vertical;min-height:80px}' +
    '.btn{display:inline-flex;align-items:center;gap:6px;padding:12px 24px;border:none;border-radius:10px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s}' +
    '.btn-primary{background:linear-gradient(135deg,#ef4444,#f87171);color:#fff;width:100%;justify-content:center}' +
    '.btn-primary:hover{box-shadow:0 4px 15px rgba(239,68,68,.4);transform:translateY(-1px)}' +
    '.btn-secondary{background:rgba(255,255,255,.08);color:#e0e7ff;border:1px solid rgba(255,255,255,.12);width:100%;justify-content:center}' +
    '.msg{text-align:center;padding:32px 20px}' +
    '.ftr{text-align:center;padding:16px;color:#475569;font-size:.75rem}' +
    '.ftr a{color:#6366f1;text-decoration:none}' +
    '.urg{display:flex;gap:6px}' +
    '.urg-btn{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#94a3b8;font-size:.75rem;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;font-family:inherit}' +
    '.urg-btn:hover{border-color:#6366f1;color:#e0e7ff}' +
    '.urg-btn.active{background:rgba(239,68,68,.2);border-color:#ef4444;color:#fca5a5}' +
    '</style>' +
    '</head><body>' +
    '<div class="wrap">' +
    '<div class="logo">🔧</div>' +
    '<h1><span>🔧</span> Lapor Kerusakan</h1>' +
    '<p class="sub">Laporkan kerusakan fasilitas — tim kami akan segera merespon</p>' +
    msgHtml +
    '<form method="GET" action="' + scriptUrl + '" class="card" ' + formDisplay + '>' +
    '<input type="hidden" name="page" value="report">' +
    '<input type="hidden" name="submit" value="1">' +
    '<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-group"><label>Nama Pelapor *</label><input type="text" name="nama" required placeholder="Nama Anda"></div>' +
    '<div class="form-group"><label>No. WhatsApp</label><input type="tel" name="wa" placeholder="628xxx (opsional, untuk notifikasi)"></div>' +
    '<div class="form-group"><label>Lokasi *</label><select name="lokasi" required>' + lokasiOptions + '</select></div>' +
    '<div class="form-group"><label>Kategori</label><select name="kategori">' + kategoriOptions + '</select></div>' +
    '<div class="form-group"><label>Urgensi</label><div class="urg" id="urg-group">' +
    '<span class="urg-btn" data-val="Low" onclick="selectUrg(this)">🟢 Rendah</span>' +
    '<span class="urg-btn active" data-val="Medium" onclick="selectUrg(this)">🟡 Sedang</span>' +
    '<span class="urg-btn" data-val="High" onclick="selectUrg(this)">🔴 Tinggi</span>' +
    '</div><input type="hidden" name="urgensi" id="f-urgensi" value="Medium"></div>' +
    '<div class="form-group"><label>Deskripsi Kerusakan *</label><textarea name="deskripsi" required placeholder="Jelaskan detail kerusakan..."></textarea></div>' +
    '<button type="submit" class="btn btn-primary">📨 Kirim Laporan</button>' +
    '</form>' +
    '<div style="text-align:center;margin-top:12px"><a href="' + scriptUrl + '?page=home" style="color:#64748b;font-size:.78rem">🏠 Kembali ke beranda</a></div>' +
    '<div class="ftr">' + currentYear + ' &bull; ' + CONFIG.ORG_NAME + '</div>' +
    '</div>' +
    '<script>' +
    'function selectUrg(el){' +
    'document.querySelectorAll(".urg-btn").forEach(function(b){b.classList.remove("active")});' +
    'el.classList.add("active");' +
    'document.getElementById("f-urgensi").value=el.getAttribute("data-val")}' +
    '</script>' +
    '</body></html>';
}