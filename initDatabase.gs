/**
 * ============================================================
 * initDatabase.gs — Inisialisasi Database (13 Sheets + Seed Data)
 * GA Operations Management System v1.0
 * ============================================================
 *
 * CARA PAKAI:
 * 1. Jalankan fungsi initializeAllSheets() sekali saja
 * 2. Fungsi ini akan membuat semua sheet dan mengisi data awal
 */

// ─── HEADER DEFINITIONS ─────────────────────────────────────

var DB_HEADERS = {
  'Main_Data': [
    'timestamp', 'tiket_id', 'no_wa', 'nama_customer', 'lokasi',
    'deskripsi', 'foto_kerusakan', 'kategori', 'sub_kategori', 'urgensi',
    'target_sla_jam', 'status', 'teknisi', 'foto_perbaikan', 'catatan',
    'waktu_selesai', 'durasi_jam', 'status_sla', 'rating_survei'
  ],

  'Master_SLA': [
    'kategori', 'sub_kategori', 'urgensi', 'target_sla_jam'
  ],

  'Dashboard_KPI_Mnt': [
    'nama_staff', 'total_tiket', 'tiket_selesai', 'persen_sla',
    'rata_rata_rating', 'skor_performa'
  ],

  'Patrol_Log': [
    'timestamp', 'tanggal_shift', 'nama_personel', 'pos_checkpoint',
    'kondisi_area', 'catatan_temuan'
  ],

  'Asset_Inspection': [
    'bulan_tahun', 'no_polisi', 'jenis_tipe', 'jadwal_cek_fisik',
    'status_cek_fisik', 'jadwal_pencucian', 'status_pencucian', 'petugas'
  ],

  'KPI_Security': [
    'nama_anggota', 'shift_dominan', 'persen_kepatuhan_patroli',
    'inspeksi_selesai', 'insiden_keamanan', 'skor_performa'
  ],

  'Asset_Booking': [
    'timestamp', 'id_booking', 'nama_peminjam', 'divisi', 'no_wa', 'nama_aset',
    'waktu_mulai', 'waktu_selesai', 'konsumsi', 'status_booking', 'alasan_gagal',
    'km_awal', 'km_akhir'
  ],

  'Asset_List': [
    'kategori', 'nama_aset', 'detail_kapasitas', 'status_operasional'
  ],

  'Audit_Housekeeping': [
    'timestamp', 'nama_auditor', 'lokasi_area', 'tim_diaudit',
    'nama_staf', 'skor_kebersihan', 'status_kelayakan', 'catatan',
    'foto_temuan'
  ],

  'CS_Daily_Checklist': [
    'timestamp', 'tim', 'nama_staf', 'lokasi_area', 'status_pekerjaan',
    'checklist_kerja', 'kondisi_fasilitas', 'detail_kerusakan', 'kesesuaian_jadwal'
  ],

  'Master_CS_Schedule': [
    'lokasi_area', 'tim_penanggungjawab', 'frekuensi', 'jam_target'
  ],

  'GC_Execution': [
    'id_gc', 'lokasi_area', 'jenis_pekerjaan', 'tanggal_target',
    'tim_pelaksana', 'penanggung_jawab', 'tanggal_selesai',
    'foto_before', 'foto_after', 'status_eksekusi'
  ],

  'User_List': [
    'user_id', 'nama', 'email', 'password', 'no_wa', 'tim', 'role', 'status'
  ],

  'Master_Patrol_Checkpoints': [
    'id_pos', 'nama_pos', 'area', 'status'
  ],

  'Master_Patrol_Schedule': [
    'id_jadwal', 'hari', 'shift', 'nama_personel', 'jam_mulai', 'jam_selesai'
  ],

  'Survey_GA': [
    'timestamp', 'periode', 'divisi', 'tim_dinilai',
    'keramahan', 'fast_response', '3s', 'kualitas_kerja', 'komunikasi',
    'feedback'
  ],

  'Master_Survey_Config': [
    'config_type', 'config_key', 'config_value', 'config_label', 'config_icon', 'config_desc', 'urutan'
  ],

  'Master_Kos': [
    'kode_kos', 'nama_kos', 'alamat', 'jumlah_kamar', 'status'
  ],

  'Master_Kamar': [
    'kode_kamar', 'kode_kos', 'nama_kamar', 'tipe_kamar', 'kapasitas',
    'harga_sewa', 'status_kamar', 'keterangan'
  ],

  'Guest_Booking': [
    'id_booking', 'kode_kamar', 'nama_tamu', 'no_wa', 'durasi_sewa',
    'tanggal_check_in', 'tanggal_check_out', 'status', 'harga_sewa', 'catatan'
  ],

  'Room_Status_Log': [
    'kode_kamar', 'status_sebelum', 'status_sesudah', 'pic', 'catatan', 'timestamp'
  ]
};

// Urutan pembuatan sheet
var DB_SHEET_ORDER = [
  'User_List', 'Master_SLA', 'Master_CS_Schedule', 'Asset_List',
  'Main_Data', 'Dashboard_KPI_Mnt', 'Patrol_Log', 'Asset_Inspection',
  'KPI_Security', 'Asset_Booking', 'Audit_Housekeeping',
  'CS_Daily_Checklist', 'GC_Execution',
  'Master_Patrol_Checkpoints', 'Master_Patrol_Schedule',
  'Survey_GA', 'Master_Survey_Config',
  'Master_Kos', 'Master_Kamar',
  'Guest_Booking', 'Room_Status_Log'
];

// ─── CHECKPOINT PATROLI (seed data untuk sheet baru) ───────

var SEED_PATROL_CHECKPOINTS = [
  ['CP-001', 'Pos 1 - Gerbang Utama', 'Gerbang Utama', 'Aktif'],
  ['CP-002', 'Pos 2 - Area Parkir Depan', 'Parkir Depan', 'Aktif'],
  ['CP-003', 'Pos 3 - Lobby & Resepsionis', 'Lobby', 'Aktif'],
  ['CP-004', 'Pos 4 - Koridor Lantai 1', 'Koridor Lt.1', 'Aktif'],
  ['CP-005', 'Pos 5 - Koridor Lantai 2', 'Koridor Lt.2', 'Aktif'],
  ['CP-006', 'Pos 6 - Koridor Lantai 3', 'Koridor Lt.3', 'Aktif'],
  ['CP-007', 'Pos 7 - Area Belakang Gedung', 'Area Belakang', 'Aktif'],
  ['CP-008', 'Pos 8 - Gudang & Utilitas', 'Gudang', 'Aktif'],
  ['CP-009', 'Pos 9 - Area Parkir Belakang', 'Parkir Belakang', 'Aktif'],
  ['CP-010', 'Pos 10 - Taman & Perimeter', 'Taman', 'Aktif']
];

var SEED_PATROL_SCHEDULE = [
  ['SCH-001', 'Senin', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-002', 'Senin', 'Shift 2 (Siang)', 'Budi Security', '14:00', '22:00'],
  ['SCH-003', 'Selasa', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-004', 'Selasa', 'Shift 2 (Siang)', 'Budi Security', '14:00', '22:00'],
  ['SCH-005', 'Rabu', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-006', 'Rabu', 'Shift 2 (Siang)', 'Budi Security', '14:00', '22:00'],
  ['SCH-007', 'Kamis', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-008', 'Kamis', 'Shift 2 (Siang)', 'Budi Security', '14:00', '22:00'],
  ['SCH-009', 'Jumat', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-010', 'Jumat', 'Shift 2 (Siang)', 'Budi Security', '14:00', '22:00'],
  ['SCH-011', 'Sabtu', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00'],
  ['SCH-012', 'Minggu', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00']
];

// ─── SEED DATA ──────────────────────────────────────────────

var SEED_DATA = {
  'User_List': [
    ['USR-001', 'Administrator', 'admin@ga.com', '', '', 'Management', 'Admin', 'Aktif'],
    ['USR-002', 'Supervisor GA', 'supervisor@ga.com', '', '', 'Management', 'Supervisor', 'Aktif'],
    ['USR-003', 'Ahmad Teknisi', 'ahmad@ga.com', '', '', 'Maintenance', 'Staff', 'Aktif'],
    ['USR-004', 'Budi Security', 'budi@ga.com', '', '', 'Security', 'Staff', 'Aktif'],
    ['USR-005', 'Citra CS', 'citra@ga.com', '', '', 'Housekeeping', 'Staff', 'Aktif'],
    ['USR-006', 'Dewi CS', 'dewi@ga.com', '', '', 'General Services', 'Staff', 'Aktif']
  ],

  'Master_SLA': [
    // Plumbing
    ['Plumbing', 'Keran Rusak', 'Low', 24],
    ['Plumbing', 'Keran Rusak', 'Medium', 12],
    ['Plumbing', 'Keran Rusak', 'High', 4],
    ['Plumbing', 'Pipa Bocor', 'Low', 24],
    ['Plumbing', 'Pipa Bocor', 'Medium', 8],
    ['Plumbing', 'Pipa Bocor', 'High', 2],
    ['Plumbing', 'Toilet Mampet', 'Low', 12],
    ['Plumbing', 'Toilet Mampet', 'Medium', 6],
    ['Plumbing', 'Toilet Mampet', 'High', 2],
    // Electrical
    ['Electrical', 'Lampu Mati', 'Low', 24],
    ['Electrical', 'Lampu Mati', 'Medium', 8],
    ['Electrical', 'Lampu Mati', 'High', 4],
    ['Electrical', 'Stop Kontak Rusak', 'Low', 24],
    ['Electrical', 'Stop Kontak Rusak', 'Medium', 12],
    ['Electrical', 'Stop Kontak Rusak', 'High', 4],
    ['Electrical', 'Korsleting', 'Low', 8],
    ['Electrical', 'Korsleting', 'Medium', 4],
    ['Electrical', 'Korsleting', 'High', 1],
    // AC/HVAC
    ['AC/HVAC', 'AC Tidak Dingin', 'Low', 48],
    ['AC/HVAC', 'AC Tidak Dingin', 'Medium', 24],
    ['AC/HVAC', 'AC Tidak Dingin', 'High', 8],
    ['AC/HVAC', 'AC Bocor', 'Low', 24],
    ['AC/HVAC', 'AC Bocor', 'Medium', 12],
    ['AC/HVAC', 'AC Bocor', 'High', 4],
    // Furniture
    ['Furniture', 'Meja Rusak', 'Low', 48],
    ['Furniture', 'Meja Rusak', 'Medium', 24],
    ['Furniture', 'Meja Rusak', 'High', 8],
    ['Furniture', 'Kursi Rusak', 'Low', 48],
    ['Furniture', 'Kursi Rusak', 'Medium', 24],
    ['Furniture', 'Kursi Rusak', 'High', 8],
    ['Furniture', 'Pintu/Jendela Rusak', 'Low', 48],
    ['Furniture', 'Pintu/Jendela Rusak', 'Medium', 24],
    ['Furniture', 'Pintu/Jendela Rusak', 'High', 4],
    // IT/Network
    ['IT/Network', 'WiFi Mati', 'Low', 12],
    ['IT/Network', 'WiFi Mati', 'Medium', 6],
    ['IT/Network', 'WiFi Mati', 'High', 2],
    ['IT/Network', 'Printer Rusak', 'Low', 24],
    ['IT/Network', 'Printer Rusak', 'Medium', 12],
    ['IT/Network', 'Printer Rusak', 'High', 4],
    // Lainnya
    ['Lainnya', 'Lainnya', 'Low', 48],
    ['Lainnya', 'Lainnya', 'Medium', 24],
    ['Lainnya', 'Lainnya', 'High', 8]
  ],

  'Master_CS_Schedule': [
    ['Lobby Utama', 'General Services', '3x sehari', '06:00, 12:00, 18:00'],
    ['Lantai 1 - Koridor', 'General Services', '2x sehari', '07:00, 14:00'],
    ['Lantai 2 - Koridor', 'General Services', '2x sehari', '07:30, 14:30'],
    ['Lantai 3 - Koridor', 'General Services', '2x sehari', '08:00, 15:00'],
    ['Toilet Lt.1', 'General Services', '4x sehari', '06:00, 09:00, 12:00, 16:00'],
    ['Toilet Lt.2', 'General Services', '4x sehari', '06:30, 09:30, 12:30, 16:30'],
    ['Toilet Lt.3', 'General Services', '4x sehari', '07:00, 10:00, 13:00, 17:00'],
    ['Kantin', 'General Services', '3x sehari', '06:00, 13:00, 18:00'],
    ['Mushola', 'General Services', '5x sehari', '05:30, 12:00, 15:00, 17:30, 19:00'],
    ['Area Parkir', 'General Services', '1x sehari', '07:00'],
    ['Taman & Outdoor', 'General Services', '1x sehari', '06:30'],
    ['Kamar 101', 'Housekeeping', '1x sehari', '09:00'],
    ['Kamar 102', 'Housekeeping', '1x sehari', '09:30'],
    ['Kamar 103', 'Housekeeping', '1x sehari', '10:00'],
    ['Kamar 201', 'Housekeeping', '1x sehari', '10:30'],
    ['Kamar 202', 'Housekeeping', '1x sehari', '11:00'],
    ['Kamar 203', 'Housekeeping', '1x sehari', '11:30'],
    ['Ruang Meeting A', 'General Services', '2x sehari', '08:00, 13:00'],
    ['Ruang Meeting B', 'General Services', '2x sehari', '08:30, 13:30'],
    ['Ruang Meeting C', 'General Services', '2x sehari', '09:00, 14:00'],
    ['Ruang Direktur', 'Housekeeping', '2x sehari', '07:00, 17:00'],
    ['Ruang Arsip', 'General Services', '1x seminggu', '08:00 (Senin)']
  ],

  'Asset_List': [
    ['Ruangan', 'Ruang Meeting A', 'Kapasitas 10 orang, Proyektor, Whiteboard', 'Tersedia'],
    ['Ruangan', 'Ruang Meeting B', 'Kapasitas 8 orang, TV Screen, Whiteboard', 'Tersedia'],
    ['Ruangan', 'Ruang Meeting C', 'Kapasitas 20 orang, Proyektor, Sound System', 'Tersedia'],
    ['Ruangan', 'Ruang Training', 'Kapasitas 30 orang, Proyektor, Mic Wireless', 'Tersedia'],
    ['Kendaraan', 'Mobil Dinas 1 - Avanza (B 1234 GA)', 'Toyota Avanza 2023, 7 Seat', 'Tersedia'],
    ['Kendaraan', 'Mobil Dinas 2 - Innova (B 5678 GA)', 'Toyota Innova 2022, 8 Seat', 'Tersedia'],
    ['Kendaraan', 'Motor Dinas 1 (B 9012 GA)', 'Honda Beat 2024', 'Tersedia'],
    ['Kendaraan', 'Motor Dinas 2 (B 3456 GA)', 'Honda Vario 2023', 'Tersedia'],
    ['Peralatan', 'Proyektor Portable', 'Epson EB-X51, 3800 Lumens', 'Tersedia'],
    ['Peralatan', 'Laptop Cadangan', 'Lenovo ThinkPad, Core i5', 'Tersedia'],
    ['Peralatan', 'Speaker Portable', 'JBL PartyBox 110', 'Tersedia'],
    ['Peralatan', 'Kamera DSLR', 'Canon EOS 200D, Kit Lens', 'Tersedia']
  ],

  'Master_Patrol_Checkpoints': SEED_PATROL_CHECKPOINTS,
  'Master_Patrol_Schedule': SEED_PATROL_SCHEDULE,

  'Master_Survey_Config': [
    // ─── TEAMS ──────────────────────────────────────────
    ['team', 'mnt', 'Maintenance', '🔧', 'Tim perbaikan & penanganan komplain', '1'],
    ['team', 'hk', 'Housekeeping', '🧹', 'Tim kebersihan kamar & area dalam', '2'],
    ['team', 'gs', 'General Services', '✨', 'Tim kebersihan area umum & outdoor', '3'],
    ['team', 'aset', 'Asset Inventory', '📦', 'Tim peminjaman ruangan & kendaraan', '4'],
    // ─── CRITERIA ──────────────────────────────────────
    ['criteria', 'keramahan', 'Keramahan & Sopan Santun', '😊', 'Sikap ramah dan sopan dalam melayani', '1'],
    ['criteria', 'fast_response', 'Fast Response (Kecepatan Tanggap)', '⚡', 'Kecepatan merespon permintaan/komplain', '2'],
    ['criteria', '3s', 'Senyum Salam Sapa (3S)', '🤝', 'Penerapan budaya 3S dalam pelayanan', '3'],
    ['criteria', 'kualitas_kerja', 'Kualitas Hasil Kerja', '🏆', 'Kualitas dan ketelitian hasil pekerjaan', '4'],
    ['criteria', 'komunikasi', 'Kemudahan Komunikasi', '💬', 'Kemudahan dalam berkomunikasi dan koordinasi', '5']
  ],

  'Master_Kos': [
    ['KOS-001', 'Kos Mawar', 'Jl. Melati No. 10', 10, 'Aktif'],
    ['KOS-002', 'Kos Melati', 'Jl. Anggrek No. 25', 8, 'Aktif']
  ],

  'Master_Kamar': [
    ['KMR-001', 'KOS-001', 'Kamar 101', 'Reguler', 4, 500000, 'Tersedia', ''],
    ['KMR-002', 'KOS-001', 'Kamar 102', 'Reguler', 4, 500000, 'Tersedia', ''],
    ['KMR-003', 'KOS-001', 'Kamar 103', 'VIP', 2, 750000, 'Tersedia', ''],
    ['KMR-004', 'KOS-001', 'Kamar 201', 'Reguler', 4, 500000, 'Tersedia', ''],
    ['KMR-005', 'KOS-001', 'Kamar 202', 'Reguler', 4, 500000, 'Tersedia', ''],
    ['KMR-006', 'KOS-001', 'Kamar 203', 'Suite', 4, 1000000, 'Tersedia', ''],
    ['KMR-007', 'KOS-002', 'Kamar A1', 'Reguler', 4, 400000, 'Tersedia', ''],
    ['KMR-008', 'KOS-002', 'Kamar A2', 'Reguler', 4, 400000, 'Tersedia', ''],
    ['KMR-009', 'KOS-002', 'Kamar B1', 'VIP', 2, 650000, 'Tersedia', ''],
    ['KMR-010', 'KOS-002', 'Kamar B2', 'Reguler', 4, 400000, 'Tersedia', '']
  ],

  'Guest_Booking': [
    ['BKG-KMR-001', 'KMR-001', 'Bambang', '6281234567890', 'Bulanan', '2026-07-01', '', 'Aktif', 500000, ''],
    ['BKG-KMR-002', 'KMR-007', 'Siti', '6289876543210', 'Mingguan', '2026-07-15', '', 'Aktif', 400000, '']
  ],

  'Room_Status_Log': [
    ['KMR-001', 'Tersedia', 'Terisi', 'Administrator', 'Check in - Bambang', ''],
    ['KMR-007', 'Tersedia', 'Terisi', 'Administrator', 'Check in - Siti', '']
  ]
};

// ─── INITIALIZATION FUNCTIONS ───────────────────────────────

/**
 * Fungsi utama — Jalankan ini untuk inisialisasi semua sheet
 * ⚠️ Jalankan SEKALI saja!
 */
function initializeAllSheets() {
  var ss = getSpreadsheet();
  var created = [];
  var skipped = [];

  Logger.log('🚀 Memulai inisialisasi database...');
  Logger.log('Spreadsheet: ' + ss.getName());

  // 1. Buat semua sheet dengan header
  DB_SHEET_ORDER.forEach(function(sheetName) {
    var existing = ss.getSheetByName(sheetName);
    if (existing) {
      skipped.push(sheetName);
      Logger.log('⏭️ Sheet "' + sheetName + '" sudah ada — dilewati.');
      return;
    }

    var sheet = ss.insertSheet(sheetName);
    var headers = DB_HEADERS[sheetName];

    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format header
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a237e');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment('center');

    // Freeze header row
    sheet.setFrozenRows(1);

    // Auto resize columns
    for (var i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 150);
    }

    created.push(sheetName);
    Logger.log('✅ Sheet "' + sheetName + '" berhasil dibuat.');
  });

  // 2. Seed data awal
  for (var sheetName in SEED_DATA) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    // Cek apakah sudah ada data (selain header)
    if (sheet.getLastRow() > 1) {
      Logger.log('⏭️ Seed data untuk "' + sheetName + '" dilewati — sudah ada data.');
      continue;
    }

    var seedRows = SEED_DATA[sheetName];

    // Hash passwords untuk User_List
    if (sheetName === 'User_List') {
      seedRows = seedRows.map(function(row) {
        var newRow = row.slice();
        newRow[3] = hashPassword('ga2026'); // Default password: ga2026
        return newRow;
      });
    }

    if (seedRows.length > 0) {
      sheet.getRange(2, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
      Logger.log('🌱 Seed data "' + sheetName + '" — ' + seedRows.length + ' baris ditambahkan.');
    }
  }

  // 3. Hapus Sheet1 default jika ada
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
      Logger.log('🗑️ Sheet "Sheet1" default dihapus.');
    } catch (e) {
      // ignore
    }
  }

  // 4. Summary
  Logger.log('\n========================================');
  Logger.log('📊 RINGKASAN INISIALISASI');
  Logger.log('========================================');
  Logger.log('Sheet dibuat: ' + created.length + ' (' + created.join(', ') + ')');
  Logger.log('Sheet dilewati: ' + skipped.length + ' (' + skipped.join(', ') + ')');
  Logger.log('Total sheet: ' + ss.getSheets().length);
  Logger.log('========================================');
  Logger.log('✅ Inisialisasi selesai!');
  Logger.log('📝 Default login: admin@ga.com / ga2026');

  return {
    created: created,
    skipped: skipped,
    total: ss.getSheets().length
  };
}

/**
 * Inisialisasi hanya sheet yang BELUM ADA + tambah kolom baru ke sheet yang sudah ada
 * AMAN: tidak menghapus atau mengubah data yang sudah ada
 */
function initializeMissingSheetsOnly() {
  var ss = getSpreadsheet();
  var created = [];
  var migrated = [];
  
  DB_SHEET_ORDER.forEach(function(sheetName) {
    var existing = ss.getSheetByName(sheetName);
    
    if (!existing) {
      // ─── BUAT SHEET BARU ──────────────────────────
      var sheet = ss.insertSheet(sheetName);
      var headers = DB_HEADERS[sheetName];
      if (!headers) return;
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var hr = sheet.getRange(1, 1, 1, headers.length);
      hr.setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
      sheet.setFrozenRows(1);
      
      created.push(sheetName);
      Logger.log('✅ Sheet "' + sheetName + '" berhasil dibuat.');
    } else {
      // ─── TAMBAH KOLOM BARU (MIGRASI SCHEMA) ──────
      var expectedHeaders = DB_HEADERS[sheetName];
      if (!expectedHeaders) return;
      
      var existingHeaders = existing.getRange(1, 1, 1, existing.getLastColumn()).getValues()[0];
      var addedCols = [];
      
      expectedHeaders.forEach(function(h, idx) {
        if (existingHeaders.indexOf(h) === -1) {
          // Kolom ini belum ada — tambahkan di ujung kanan (paling aman)
          existing.insertColumnAfter(existing.getLastColumn());
          var newCol = existing.getLastColumn(); // Kolom baru pasti di posisi ini
          existing.getRange(1, newCol).setValue(h);
          existing.getRange(1, newCol).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
          addedCols.push(h);
          Logger.log('➕ Kolom "' + h + '" ditambahkan ke sheet "' + sheetName + '".');
        }
      });
      
      if (addedCols.length > 0) {
        migrated.push(sheetName + ': ' + addedCols.join(', '));
      }
    }
  });
  
  // Seed data khusus untuk Master_Survey_Config
  if (created.indexOf('Master_Survey_Config') >= 0 && SEED_DATA['Master_Survey_Config']) {
    var sheet = ss.getSheetByName('Master_Survey_Config');
    var seedRows = SEED_DATA['Master_Survey_Config'];
    if (seedRows.length > 0) {
      sheet.getRange(2, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
      Logger.log('🌱 Seed data Master_Survey_Config: ' + seedRows.length + ' baris.');
    }
  }
  
  return {
    created: created,
    migrated: migrated,
    message: created.length > 0 || migrated.length > 0
      ? '✅ Sheet baru: ' + (created.length > 0 ? created.join(', ') : '-') + ' | Kolom baru: ' + (migrated.length > 0 ? migrated.join(' | ') : '-')
      : 'Semua sheet sudah lengkap. Tidak ada yang perlu diubah.'
  };
}

/**
 * Seed dummy data — 1 baris sample per tabel
 * Panggil via URL: ?seedDummy=1
 */
function seedDummyData() {
  var ss = getSpreadsheet();
  var now = new Date();
  var nowStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  var hasil = [];
  var errors = [];

  var dummyRows = {
    'Main_Data': [[
      nowStr, 'MNT-2026-0001', '6281234567890', 'Bambang Customer', 'Lantai 2 - Ruang 201',
      'Lampu ruangan mati', '', 'Electrical', 'Lampu Mati', 'Medium',
      8, 'Selesai', 'Ahmad Teknisi', '', 'Ganti ballast',
      nowStr, 2.5, 'Achieved', 5
    ]],
    'Master_SLA': [['Plumbing', 'Keran Rusak', 'Low', 24]],
    'Dashboard_KPI_Mnt': [['Ahmad Teknisi', 10, 8, 80, 4.5, 85]],
    'Patrol_Log': [[
      nowStr, Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      'Budi Security', 'Pos 1 - Gerbang Utama', 'Aman', 'Tidak ada temuan'
    ]],
    'Asset_Inspection': [[
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM'), 'B 1234 GA',
      'Toyota Avanza', '2026-07-20', 'Done', '2026-07-22', 'Done', 'Budi Security'
    ]],
    'KPI_Security': [['Budi Security', 'Shift 1 (Pagi)', 100, 15, 0, 95]],
    'Asset_Booking': [[
      nowStr, 'BKG-2026-0001', 'Siti Peminjam', 'Finance', '6289876543210',
      'Ruang Meeting A', '2026-07-21 09:00', '2026-07-21 12:00', 'Ya (Snack)',
      'Approved (Auto)', '', '', ''
    ]],
    'Asset_List': [['Ruangan', 'Ruang Meeting A', 'Kapasitas 10 orang', 'Tersedia']],
    'Audit_Housekeeping': [[
      nowStr, 'Supervisor GA', 'Lobby Utama', 'General Services',
      'Citra CS', 85, 'Layak', 'Sudah dibersihkan dengan baik', ''
    ]],
    'CS_Daily_Checklist': [[
      nowStr, 'General Services', 'Citra CS', 'Lobby Utama', 'Selesai',
      'Menyapu, mengepel', 'Baik', 'Tidak ada', 'Sesuai'
    ]],
    'Master_CS_Schedule': [['Lobby Utama', 'General Services', '3x sehari', '06:00, 12:00, 18:00']],
    'GC_Execution': [[
      'GC-2026-0001', 'Taman Depan', 'Pemangkasan Tanaman', '2026-07-25',
      'General Services', 'Dewi CS', '', '', '', 'Open'
    ]],
    'User_List': [[
      'USR-001', 'Administrator', 'admin@ga.com', hashPassword('ga2026'),
      '6281234567890', 'Management', 'Admin', 'Aktif'
    ]],
    'Master_Patrol_Checkpoints': [['CP-001', 'Pos 1 - Gerbang Utama', 'Gerbang Utama', 'Aktif']],
    'Master_Patrol_Schedule': [['SCH-001', 'Senin', 'Shift 1 (Pagi)', 'Budi Security', '06:00', '14:00']],
    'Survey_GA': [[
      nowStr, Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM'), 'Finance', 'Maintenance',
      4, 5, 4, 5, 4, 'Pelayanan sangat baik'
    ]],
    'Master_Survey_Config': [['team', 'mnt', 'Maintenance', '🔧', 'Tim perbaikan & penanganan komplain', '1']]
  };

  DB_SHEET_ORDER.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      errors.push(sheetName + ': sheet tidak ditemukan');
      return;
    }
    var rows = dummyRows[sheetName];
    if (!rows) {
      errors.push(sheetName + ': tidak ada data dummy');
      return;
    }
    // Cek apakah sudah ada data (header di row 1, data mulai row 2)
    if (sheet.getLastRow() > 1) {
      hasil.push(sheetName + ': sudah ada data — dilewati');
      return;
    }
    var headers = DB_HEADERS[sheetName];
    sheet.getRange(2, 1, 1, headers.length).setValues(rows);
    hasil.push(sheetName + ': ✅ 1 baris ditambahkan');
  });

  Logger.log('=== seedDummyData Selesai ===');
  hasil.forEach(function(h) { Logger.log(h); });
  errors.forEach(function(e) { Logger.log('⚠️ ' + e); });

  return {
    success: true,
    seeded: hasil.filter(function(h) { return h.indexOf('✅') >= 0; }).length,
    skipped: hasil.filter(function(h) { return h.indexOf('dilewati') >= 0; }).length,
    detail: hasil,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0
      ? '⚠️ ' + hasil.length + ' diproses, ' + errors.length + ' error'
      : '✅ ' + hasil.length + ' sheet berhasil diisi dummy data.'
  };
}

/**
 * Perbaiki misalignment kolom catatan/foto_temuan di Audit_Housekeeping
 *
 * Masalah: Header "catatan" hilang (tertumpuk oleh "foto_temuan" saat migrasi),
 * sehingga data catatan (kolom 8) tampil sebagai foto_temuan.
 *
 * Fix: 
 * - Jika foto_temuan di posisi 8 & catatan hilang → ganti header posisi 8 jadi "catatan"
 * - Cek apakah data di kolom 9 sudah ada (dari appendRow yg auto-expand)
 *   → Jika ya, set header kolom 9 jadi "foto_temuan"
 *   → Jika belum, tambah kolom baru "foto_temuan" di posisi 9
 * - Data TIDAK dipindah-pindah karena saveAuditHousekeeping() selalu
 *   append 9 nilai dalam urutan yang benar
 *
 * Cara jalan: buka URL ?fixAuditHeaders=1 di browser
 */
function fixAuditHousekeepingHeaders() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Audit_Housekeeping');
    if (!sheet) {
      return { success: false, error: 'Sheet Audit_Housekeeping tidak ditemukan.' };
    }
    
    // Baca header dari row 1 (baris header SAJA, bukan seluruh data)
    var headerRange = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
    var actualHeaders = [];
    for (var i = 0; i < headerRange.length; i++) {
      if (headerRange[i]) actualHeaders.push(headerRange[i]);
    }
    
    var expectedHeaders = DB_HEADERS['Audit_Housekeeping'];
    var lastDataCol = sheet.getLastColumn(); // Kolom terakhir yang ADA DATA (tidak hanya header)
    
    Logger.log('=== fixAuditHousekeepingHeaders ===');
    Logger.log('Actual headers: ' + JSON.stringify(actualHeaders));
    Logger.log('Expected: ' + JSON.stringify(expectedHeaders));
    Logger.log('Max cols: ' + sheet.getMaxColumns() + ', Last data col: ' + lastDataCol);
    
    var changes = [];
    var catatanIdx = actualHeaders.indexOf('catatan');
    var fotoIdx = actualHeaders.indexOf('foto_temuan');
    
    // Expected positions (0-based): catatan=7, foto_temuan=8
    var CATATAN_POS = 7;
    var FOTO_POS = 8;
    
    if (catatanIdx === -1 && fotoIdx >= 0) {
      // ─── CASE 1: catatan hilang, foto_temuan ada ──────
      if (fotoIdx === CATATAN_POS) {
        // foto_temuan di posisi 8 — overwrite oleh migrasi sebelumnya
        // Data di kolom 8 adalah catatan (dari old rows), header salah
        sheet.getRange(1, CATATAN_POS + 1).setValue('catatan');
        changes.push('Header kolom ' + (CATATAN_POS + 1) + ' diubah dari "foto_temuan" ke "catatan"');
        
        // Cek kolom 9: apakah ada data di sana? (dari appendRow 9 nilai)
        if (lastDataCol >= FOTO_POS + 1) {
          // Kolom 9 sudah punya data — tinggal set header
          sheet.getRange(1, FOTO_POS + 1).setValue('foto_temuan');
          sheet.getRange(1, FOTO_POS + 1).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
          changes.push('Header "foto_temuan" di-set di kolom ' + (FOTO_POS + 1) + ' (data sudah ada)');
        } else {
          // Kolom 9 belum ada — tambah kolom baru
          sheet.insertColumnAfter(FOTO_POS);
          sheet.getRange(1, FOTO_POS + 1).setValue('foto_temuan');
          sheet.getRange(1, FOTO_POS + 1).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
          changes.push('Kolom baru "foto_temuan" ditambahkan di posisi ' + (FOTO_POS + 1));
        }
      } else {
        changes.push('⚠️ foto_temuan di posisi tak terduga (' + (fotoIdx + 1) + '). Tidak dilakukan perubahan otomatis.');
      }
      
    } else if (catatanIdx >= 0 && fotoIdx >= 0) {
      // ─── CASE 2: keduanya sudah ada ───────────────────
      if (catatanIdx > fotoIdx) {
        // Urutan terbalik — swap header saja (data sudah benar dari appendRow)
        sheet.getRange(1, catatanIdx + 1).setValue('foto_temuan');
        sheet.getRange(1, fotoIdx + 1).setValue('catatan');
        changes.push('Header ditukar: catatan ↔ foto_temuan');
      } else if (catatanIdx === CATATAN_POS && fotoIdx === FOTO_POS) {
        changes.push('Header sudah benar: catatan di ' + (CATATAN_POS + 1) + ', foto_temuan di ' + (FOTO_POS + 1));
      } else {
        changes.push('Header sudah ada (catatan di ' + (catatanIdx + 1) + ', foto_temuan di ' + (fotoIdx + 1) + ') — tidak diubah.');
      }
      
    } else if (catatanIdx === -1 && fotoIdx === -1) {
      // ─── CASE 3: keduanya hilang — tambah di akhir ────
      sheet.insertColumnAfter(sheet.getLastColumn());
      var colC = sheet.getLastColumn();
      sheet.getRange(1, colC).setValue('catatan');
      sheet.getRange(1, colC).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
      
      sheet.insertColumnAfter(sheet.getLastColumn());
      var colF = sheet.getLastColumn();
      sheet.getRange(1, colF).setValue('foto_temuan');
      sheet.getRange(1, colF).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
      
      changes.push('Kolom "catatan" ditambahkan di ' + colC);
      changes.push('Kolom "foto_temuan" ditambahkan di ' + colF);
    }
    
    Logger.log('Changes: ' + JSON.stringify(changes));
    return {
      success: true,
      changes: changes,
      actualHeaders: actualHeaders,
      message: changes.length > 0 ? '✅ ' + changes.join(' | ') : 'Tidak ada perubahan.'
    };
  } catch (e) {
    Logger.log('❌ fixAuditHousekeepingHeaders: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Bersihkan data base64 foto lama di sheet Audit_Housekeeping
 * Hanya menghapus cell foto_temuan yang berisi data:image base64, data lain tetap aman
 * Bisa dipanggil via URL: ?cleanupBase64AuditPhotos=1
 */
function cleanupBase64AuditPhotos() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Audit_Housekeeping');
    if (!sheet) {
      return { success: false, error: 'Sheet Audit_Housekeeping tidak ditemukan.' };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, message: 'Tidak ada data untuk dibersihkan.', cleaned: 0 };
    }
    
    // Cari index kolom foto_temuan
    var headers = data[0];
    var fotoCol = headers.indexOf('foto_temuan');
    if (fotoCol === -1) {
      return { success: false, error: 'Kolom foto_temuan tidak ditemukan.' };
    }
    
    var cleaned = 0;
    var cleanedRows = [];
    
    for (var i = 1; i < data.length; i++) {
      var val = data[i][fotoCol];
      // Cek apakah berisi base64 data URL
      if (val && typeof val === 'string' && val.indexOf('data:') === 0) {
        // Kosongkan cell
        sheet.getRange(i + 1, fotoCol + 1).setValue('');
        cleaned++;
        cleanedRows.push('Baris ' + (i + 1) + ': ' + data[i][0] + ' | ' + data[i][2]);
      }
    }
    
    Logger.log('🧹 Cleanup selesai: ' + cleaned + ' baris base64 dibersihkan.');
    
    return {
      success: true,
      cleaned: cleaned,
      detail: cleanedRows,
      message: cleaned > 0
        ? '✅ ' + cleaned + ' data foto base64 berhasil dibersihkan.'
        : 'Tidak ada data base64 yang ditemukan.'
    };
    
  } catch (e) {
    Logger.log('❌ Gagal cleanup: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Reset semua sheet — HATI-HATI! Menghapus semua data!
 * Gunakan hanya untuk development/testing
 */
function resetAllSheets() {
  var ss = getSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    '⚠️ PERINGATAN',
    'Anda akan menghapus SEMUA data dan membuat ulang semua sheet.\nApakah Anda yakin?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    Logger.log('❌ Reset dibatalkan oleh user.');
    return;
  }

  // Hapus semua sheet kecuali yang pertama
  var sheets = ss.getSheets();
  if (sheets.length > 1) {
    for (var i = sheets.length - 1; i >= 1; i--) {
      ss.deleteSheet(sheets[i]);
    }
  }

  // Rename sheet pertama ke temp
  sheets[0].setName('_temp_');
  sheets[0].clear();

  // Jalankan inisialisasi ulang
  initializeAllSheets();

  // Hapus temp sheet
  var tempSheet = ss.getSheetByName('_temp_');
  if (tempSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(tempSheet);
  }

  Logger.log('🔄 Reset selesai! Semua data telah direset.');
}

/**
 * Mendapatkan daftar checkpoint patroli (dari sheet Master_Patrol_Checkpoints)
 */
function getPatrolCheckpoints() {
  try {
    var data = getSheetData(CONFIG.SHEETS.PATROL_CHECKPOINTS);
    // Filter hanya yang status Aktif
    var active = data.filter(function(d) { return d.status === 'Aktif'; });
    // Return array of nama_pos (backward compatible)
    var list = active.map(function(d) { return d.nama_pos; });
    return successResponse(list);
  } catch (e) {
    // Fallback ke hardcoded
    return successResponse([
      'Pos 1 - Gerbang Utama', 'Pos 2 - Area Parkir Depan',
      'Pos 3 - Lobby & Resepsionis', 'Pos 4 - Koridor Lantai 1',
      'Pos 5 - Koridor Lantai 2', 'Pos 6 - Koridor Lantai 3',
      'Pos 7 - Area Belakang Gedung', 'Pos 8 - Gudang & Utilitas',
      'Pos 9 - Area Parkir Belakang', 'Pos 10 - Taman & Perimeter'
    ]);
  }
}
