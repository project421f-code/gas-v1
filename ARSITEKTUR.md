# WMS Lite — Dokumentasi Arsitektur Aplikasi

> **Versi Dokumen:** 1.0  
> **Platform:** Google Apps Script + Google Sheets  
> **Tujuan:** Referensi pembuatan aplikasi serupa di masa depan

---

## 📋 Daftar Isi

1. [Ringkasan Teknologi](#1-ringkasan-teknologi)
2. [Struktur Proyek](#2-struktur-proyek)
3. [Arsitektur Backend (GAS)](#3-arsitektur-backend-gas)
4. [Arsitektur Frontend](#4-arsitektur-frontend)
5. [Autentikasi & Sesi](#5-autentikasi--sesi)
6. [Database Schema (Google Sheets)](#6-database-schema-google-sheets)
7. [Pola API](#7-pola-api)
8. [Pola Frontend](#8-pola-frontend)
9. [Cara Menambah Fitur Baru](#9-cara-menambah-fitur-baru)
10. [Deployment](#10-deployment)
11. [Cheat Sheet — Pattern yang Sering Dipakai](#11-cheat-sheet--pattern-yang-sering-dipakai)

---

## 1. Ringkasan Teknologi

| Lapisan | Teknologi | Keterangan |
|---------|-----------|------------|
| **Database** | Google Sheets | 11 sheet sebagai tabel database |
| **Backend** | Google Apps Script (JavaScript V8) | Logika bisnis, API, autentikasi |
| **Frontend** | HTML + CSS + Vanilla JavaScript | `index.html` + file JS di `src/` |
| **Komunikasi** | `fetch()` → GAS Web App `doPost` | JSON `{ email, sessionToken, actionName, args }` |
| **Hosting** | GitHub Pages | Frontend statis — backend tetap GAS |
| **Client API** | `src/gas.js` | `apiCall(action, args)` pengganti `supabase-js` |
| **CLI Tools** | clasp | Deploy dari terminal ke GAS |

### Library Eksternal (Frontend)

| Library | CDN | Fungsi |
|---------|-----|--------|
| Chart.js | `cdn.jsdelivr.net/npm/chart.js` | Grafik dashboard |
| chartjs-plugin-datalabels | `cdn.jsdelivr.net/npm/chartjs-plugin-datalabels` | Label di chart |
| html5-qrcode | `cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js` | QR Scanner |
| qrcodejs | `cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js` | QR Generator |

---

## 2. Struktur Proyek

```
WMS-Lite-V4/
├── appsscript.json          # Konfigurasi GAS project
├── .clasp.json              # Konfigurasi clasp deployment
├── Code.gs                  # Entry point Web App + routing API
├── Helpers.gs               # Config, utility functions, session
├── initDatabase.gs          # Inisialisasi database (sheet + seed)
├── API_Auth.gs              # Autentikasi + manajemen user
├── API_Master.gs            # CRUD produk, gudang, laporan
├── API_Stock.gs             # Transaksi stok, dashboard, chart
├── API_Request.gs           # Permintaan barang antar cabang
├── API_Opname.gs            # Stock opname + approval
├── API_Asset.gs             # Manajemen aset tetap
├── index.html               # Frontend UI (ALL-IN-ONE)
├── login_enhanced.html      # Halaman login alternatif
└── docs/
    └── index.html           # Dokumentasi
```

### Pembagian Tanggung Jawab File

| File | Tanggung Jawab |
|------|----------------|
| `Code.gs` | Entry point `doGet()`, routing `executeAction()`, master data |
| `Helpers.gs` | Config (Spreadsheet ID), session/auth utilities, response helpers, ID generator |
| `initDatabase.gs` | Membuat sheet, seed data awal (gudang, produk, user, stok) |
| `API_Auth.gs` | Login/logout manual, CRUD user, toggle status |
| `API_Master.gs` | CRUD produk & gudang, import CSV bulk, laporan |
| `API_Stock.gs` | Transaksi stok (in/out), dashboard stats, chart data, stok realtime |
| `API_Request.gs` | Permintaan barang + workflow (Approved→Shipped→Received) |
| `API_Opname.gs` | Stock opname + approval selisih |
| `API_Asset.gs` | CRUD aset, mutasi, maintenance, depresiasi, disposal |
| `index.html` | **Semua** HTML, CSS, JavaScript frontend dalam satu file |

---

## 3. Arsitektur Backend (GAS)

### 3.1 Entry Point & Routing

**File:** `Code.gs`

```javascript
// Entry point — dipanggil saat user membuka URL Web App
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('WMS Lite | General Affair')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Routing untuk semua panggilan dari frontend
function executeAction(email, sessionToken, actionName, args) {
  // 1. Validasi token sesi
  // 2. Set CURRENT_USER_EMAIL
  // 3. Panggil fungsi secara dinamis: this[actionName].apply(this, args)
  // 4. Return response
}
```

### 3.2 Pola Fungsi API

Setiap fungsi API mengikuti pola yang sama:

```javascript
function namaFungsi(params) {
  try {
    // 1. Dapatkan user session
    var user = getActiveUserSession();
    
    // 2. (Opsional) Validasi role
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);
    
    // 3. (Opsional) Validasi input
    if (!params.wajib) throw new Error('Field wajib tidak boleh kosong.');
    
    // 4. Logika bisnis — baca/tulis sheet
    var data = getSheetData(CONFIG.SHEETS.NAMA_SHEET);
    // ... operasi CRUD ...
    
    // 5. Return response
    return successResponse(result, 'Pesan berhasil.');
  } catch (e) {
    return errorResponse(e.message);
  }
}
```

### 3.3 Helper Functions (Helpers.gs)

| Fungsi | Kegunaan |
|--------|----------|
| `getSpreadsheet()` | Mendapatkan instance Spreadsheet |
| `getSheet(nama)` | Mendapatkan Sheet by name |
| `getSheetData(nama)` | Baca semua data → array of objects |
| `findRow(sheet, keyColumn, keyValue)` | Cari satu baris → `{rowIndex, data}` |
| `updateCell(sheet, rowIndex, colName, value)` | Update satu sel |
| `updateRowCells(sheet, rowIndex, updates)` | Update multiple sel sekaligus |
| `generateId(prefix)` | Generate ID unik (PREFIX-YYYYMMDD-XXXX) |
| `getActiveUserSession(email?)` | Validasi sesi → `{email, nama, role, id_gudang}` |
| `requireRole(role, allowedRoles)` | Validasi akses berdasarkan role |
| `successResponse(data, message)` | Response sukses |
| `errorResponse(message)` | Response error |
| `withLock(fn)` | Race condition protection |
| `hashPassword(password)` | SHA-256 hashing |
| `getNamaGudang(id)` | Nama gudang dari ID |
| `getNamaProduk(sku)` | Nama produk dari SKU |

### 3.4 Konfigurasi (Helpers.gs)

```javascript
var CONFIG = {
  SPREADSHEET_ID: '...',  // WAJIB DIGANTI!
  APP_NAME: 'WMS Lite',
  ORG_NAME: 'General Affair',
  VERSION: '1.0.0',
  TIMEZONE: 'Asia/Jakarta',
  
  SHEETS: {
    USER:    'm_user',
    PRODUK:  'm_produk',
    GUDANG:  'm_gudang',
    STOK:    't_stok_aktual',
    LOG:     't_log_mutasi',
    REQUEST: 't_permintaan_barang',
    OPNAME:  't_opname_log',
    ASET:    'm_aset',
    // ... dan seterusnya
  },
  
  ROLES: {
    ADMIN:      'Center Admin',
    SUPERVISOR: 'Branch Supervisor',
    STAFF:      'Branch Staff'
  }
};
```

---

## 4. Arsitektur Frontend

### 4.1 Struktur File

**Satu file:** `index.html` (~5000 baris)

```
index.html
├── <head>
│   ├── Meta tags
│   ├── Library CDN (Chart.js, QR scanner/generator)
│   ├── <script>: QR Scanner & Generator functions
│   └── <style>: Semua CSS (variabel, layout, komponen, dark mode)
├── <body>
│   ├── Loading Screen
│   ├── Toast Container
│   ├── Modal Overlay (generic)
│   ├── Login Screen
│   ├── #app
│   │   ├── #sidebar (navigasi + user info)
│   │   └── #main-content
│   │       ├── #topbar
│   │       ├── .page#page-dashboard
│   │       ├── .page#page-transaksi
│   │       ├── .page#page-request
│   │       ├── .page#page-opname
│   │       ├── .page#page-master (admin only)
│   │       ├── .page#page-users (admin only)
│   │       ├── .page#page-stokrealtime
│   │       ├── .page#page-laporan
│   │       ├── .page#page-log
│   │       ├── .page#page-aset
│   │       └── .page#page-qrgenerator
│   └── <script>: SEMUA JavaScript aplikasi
└── </html>
```

### 4.2 Pola Halaman (Page Pattern)

Setiap halaman mengikuti pola yang sama:

```html
<div class="page" id="page-nama">
  <!-- Stat Cards -->
  <div class="stats-grid">
    <div class="stat-card blue">...</div>
    <div class="stat-card green">...</div>
  </div>

  <!-- Card dengan tabel -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">📋 Judul</div>
      <button class="btn btn-outline btn-sm" onclick="refresh()">🔄 Refresh</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Kolom1</th><th>Kolom2</th></tr></thead>
          <tbody id="tbody-nama">
            <tr><td colspan="2" class="table-empty">Memuat...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

### 4.3 Navigasi

```javascript
function navigateTo(page) {
  // 1. Sembunyikan semua .page
  // 2. Tampilkan .page#page-{page}
  // 3. Update .nav-item.active
  // 4. Update #topbar-title dan #topbar-subtitle
  // 5. Panggil fungsi load data sesuai halaman
  APP.currentPage = page;
}
```

### 4.4 Komunikasi Frontend-Backend

Menggunakan `google.script.run` dengan Proxy pattern:

```javascript
google.script.run
  .withSuccessHandler(function(res) {
    if (res.success) {
      showToast('success', res.message);
      // Update UI
    } else {
      showToast('error', res.error);
    }
  })
  .withFailureHandler(function(e) {
    showToast('error', e.message);
  })
  .namaFungsiBackend(param1, param2);
```

### 4.5 Komponen UI

| Komponen | CSS Class | Fungsi |
|----------|-----------|--------|
| Stat Card | `.stat-card.blue/green/amber/red/purple` | Kartu statistik |
| Card | `.card` + `.card-header` + `.card-body` | Container |
| Tabel | `table` + `.table-wrap` | Data tabel |
| Badge | `.badge.badge-blue/green/amber/red/purple/gray/kritis` | Status label |
| Button | `.btn.btn-primary/success/danger/warning/outline` + `.btn-sm/xs` | Tombol |
| Modal | `.modal-overlay` + `.modal` | Dialog |
| Toast | `.toast.success/error/warning` | Notifikasi |
| Filter Chip | `.filter-chip.active` | Filter tab |
| Form | `.form-group` + `.form-label` + `.form-control` | Input form |

### 4.6 CSS Variables & Dark Mode

```css
:root {
  --sidebar-w: 260px;
  --sidebar-bg: #0f172a;
  --content-bg: #f1f5f9;
  --card-bg: #ffffff;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --blue: #3b82f6;
  --green: #10b981;
  --amber: #f59e0b;
  --red: #ef4444;
  --purple: #8b5cf6;
  --radius: 12px;
  --radius-sm: 8px;
  --transition: all .2s ease;
}

[data-theme="dark"] {
  /* Override semua warna untuk dark mode */
}
```

### 4.7 Global State

```javascript
var APP = {
  user:        null,       // User info
  role:        null,       // User role
  id_gudang:   null,       // Branch ID
  gudangs:     [],         // Daftar gudang
  produks:     [],         // Daftar produk
  stokCache:   [],         // Cache stok
  reqDraft:    [],         // Draft permintaan
  currentPage: 'dashboard', // Halaman aktif
  // ...
};
```

---

## 5. Autentikasi & Sesi

### 5.1 Flow Login

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Browser     │────▶│  Code.gs         │────▶│  Helpers.gs  │
│  index.html  │     │  loginCheck()    │     │  getActive-  │
│              │◀────│  executeAction()  │◀────│  UserSession │
└──────────────┘     └──────────────────┘     └─────────────┘
```

### 5.2 Mode Autentikasi

**Mode 1: Google SSO (Otomatis)**
- `Session.getActiveUser().getEmail()` — otomatis dari Google session
- Token tidak diperlukan

**Mode 2: Manual (Email + Password)**
- `loginWithEmailAndPassword(email, password)` → generate UUID token
- Token disimpan di `CacheService.getScriptCache()` selama 2 jam
- Token disimpan di `localStorage` client
- Setiap panggilan via `executeAction(email, token, fnName, args)`

### 5.3 Role & Hak Akses

| Role | Kode | Akses |
|------|------|-------|
| Center Admin | `CONFIG.ROLES.ADMIN` | Semua fitur |
| Branch Supervisor | `CONFIG.ROLES.SUPERVISOR` | Transaksi, request, opname |
| Branch Staff | `CONFIG.ROLES.STAFF` | Transaksi, stok realtime, laporan |

Filter data by branch:
```javascript
if (user.role !== CONFIG.ROLES.ADMIN) {
  data = data.filter(function(d) { return d.id_gudang === user.id_gudang; });
}
```

---

## 6. Database Schema (Google Sheets)

### 6.1 Master Tables (m_*)

#### `m_user` — Master User
| email_user | nama_lengkap | password | role | id_gudang_akses | status_aktif | diperbarui_pada | diubah_oleh |
|------------|-------------|----------|------|-----------------|--------------|-----------------|-------------|

#### `m_produk` — Master Produk
| sku | nama_produk | kategori | satuan | stok_minimum_global |
|-----|------------|----------|--------|---------------------|

#### `m_gudang` — Master Gudang
| id_gudang | nama_gudang | lokasi | penanggung_jawab |
|-----------|-------------|--------|------------------|

### 6.2 Transaction Tables (t_*)

#### `t_stok_aktual` — Posisi Stok Aktual
| id_stok | sku | id_gudang | jumlah_stok | rak_lokasi | update_terakhir |
|---------|-----|-----------|-------------|------------|-----------------|

#### `t_log_mutasi` — Riwayat Transaksi Stok
| id_log | timestamp | sku | id_gudang_asal | id_gudang_tujuan | jenis_mutasi | jumlah | keterangan | operator |
|--------|-----------|-----|----------------|------------------|--------------|--------|------------|----------|

#### `t_permintaan_barang` — Permintaan Barang
| id_request | timestamp | id_gudang_pemohon | sku | jumlah_diminta | status | catatan | id_log_transfer |
|------------|-----------|-------------------|-----|----------------|--------|---------|-----------------|

#### `t_opname_log` — Stock Opname
| id_opname | timestamp | id_gudang | sku | stok_sistem | stok_fisik | selisih | status_persetujuan | operator | supervisor_pusat |
|-----------|-----------|-----------|-----|-------------|------------|---------|--------------------|----------|-----------------|

### 6.3 Asset Tables

#### `m_aset` — Master Aset
| kode_aset | nama_aset | kategori | merek | model | spesifikasi | barcode | tgl_perolehan | nilai_perolehan | masa_manfaat_tahun | nilai_sisa | lokasi | penanggung_jawab | status | keterangan | diperbarui_pada | diubah_oleh |
|-----------|-----------|----------|-------|-------|-------------|---------|---------------|-----------------|--------------------|------------|--------|-----------------|--------|------------|-----------------|-------------|

#### `t_aset_mutasi` — Mutasi Aset
| id_mutasi | kode_aset | jenis_mutasi | tgl_mutasi | dari_lokasi | ke_lokasi | dari_pic | ke_pic | estimasi_kembali | tgl_kembali | kondisi_kembali | kondisi_aset | catatan | operator | diperbarui_pada |
|-----------|-----------|--------------|------------|-------------|-----------|----------|--------|------------------|-------------|----------------|--------------|---------|----------|-----------------|

#### `t_aset_maintenance` — Perawatan Aset
| id_maintenance | kode_aset | jenis | tgl_maintenance | deskripsi | biaya | vendor | tgl_maintenance_berikutnya | status | catatan | operator | diperbarui_pada |
|----------------|-----------|-------|-----------------|-----------|-------|--------|---------------------------|--------|---------|----------|-----------------|

#### `t_aset_log` — Log Aktivitas Aset
| id_log | kode_aset | aksi | detail | operator | timestamp |
|--------|-----------|------|--------|----------|-----------|

### 6.4 Penamaan Convention

| Prefix | Arti |
|--------|------|
| `m_` | Master data (relatif statis) |
| `t_` | Transaction/Transaksi data (dinamis) |

---

## 7. Pola API

### 7.1 Standard Response Format

```javascript
// Sukses
{ success: true, data: {...}, message: 'Berhasil' }

// Error
{ success: false, error: 'Pesan error...' }
```

### 7.2 CRUD Pattern

```javascript
// READ — ambil semua
function getAllSomething() { ... }

// READ — ambil dengan filter
function getSomethingByFilter(param1, param2) { ... }

// CREATE / UPDATE
function saveSomething(payload) {
  if (payload.id) {
    // UPDATE — findRow + updateRowCells
  } else {
    // INSERT — sheet.appendRow
  }
}

// DELETE
function deleteSomething(id) {
  // findRow + sheet.deleteRow
}
```

### 7.3 Import CSV Pattern (Bulk Insert/Update)

```javascript
function importSomethingBulk(dataList) {
  // 1. Validasi: array tidak kosong, max 1000 baris
  // 2. Loop: forEach
  //    a. Validasi required fields
  //    b. findRow → jika ada: UPDATE / jika tidak: INSERT
  // 3. Return: { total, inserted, updated, errors }
}
```

### 7.4 Race Condition Protection

Gunakan `withLock()` untuk operasi yang mengubah data:

```javascript
function operasiKritis(params) {
  return withLock(function() {
    // Baca stok
    // Update stok
    // Catat log
  });
}
```

---

## 8. Pola Frontend

### 8.1 Load Data Table

```javascript
function loadNamaTable() {
  var tbody = document.getElementById('tbody-nama');
  tbody.innerHTML = '<tr><td colspan="N" class="table-empty">Memuat...</td></tr>';
  
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="N" class="table-empty">Belum ada data</td></tr>';
        return;
      }
      var html = '';
      res.data.forEach(function(d) {
        html += '<tr>' +
          '<td>' + d.field1 + '</td>' +
          '<td><span class="badge badge-green">' + d.status + '</span></td>' +
          '<td><button class="btn btn-primary btn-xs" onclick="edit(\'' + d.id + '\')">✏️</button></td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    })
    .withFailureHandler(function(e) {
      tbody.innerHTML = '<tr><td colspan="N" class="table-empty">Error: ' + e.message + '</td></tr>';
    })
    .getAllSomething();
}
```

### 8.2 Modal Pattern

```html
<div class="modal-overlay" id="modal-nama" onclick="closeModalNama(event)">
  <div class="modal-container" style="max-width:560px">
    <div class="modal-header" id="modal-nama-title">Form Title</div>
    <div class="modal-body" id="modal-nama-body"></div>
    <div class="modal-footer" id="modal-nama-footer"></div>
  </div>
</div>
```

```javascript
function showNamaModal(id) {
  document.getElementById('modal-nama-title').textContent = '📝 Form Data';
  document.getElementById('modal-nama-body').innerHTML = '...form HTML...';
  document.getElementById('modal-nama-footer').innerHTML = 
    '<button class="btn btn-outline" onclick="closeModalNama()">Batal</button>' +
    '<button class="btn btn-primary" onclick="saveNama()">💾 Simpan</button>';
  document.getElementById('modal-nama').classList.add('show');
}

function closeModalNama(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-nama').classList.remove('show');
}
```

### 8.3 Autosearch Pattern

```html
<div class="autosearch-wrapper">
  <input type="text" class="form-control autosearch-input" id="search-input" 
    onkeyup="filterAutosearch(this, 'search-dropdown', 'search')" />
  <input type="hidden" id="search" />
  <div id="search-dropdown" class="autosearch-dropdown"></div>
</div>
```

```javascript
function filterAutosearch(input, dropdownId, hiddenId) {
  // 1. Dapatkan query
  // 2. Filter APP.produks berdasarkan query
  // 3. Tampilkan dropdown dengan hasil
  // 4. Klik item → set hidden input, tutup dropdown
}
```

### 8.4 Toast Notification

```javascript
function showToast(type, message) {
  // type: 'success' | 'error' | 'warning'
  // Buat elemen toast, tambahkan ke #toast-container
  // Auto-remove setelah 3-5 detik
}
```

### 8.5 Import CSV (Client-side)

```javascript
// 1. User pilih file CSV
// 2. Baca file dengan FileReader
// 3. Parse CSV → array of objects (parseCSV)
// 4. Validasi client-side
// 5. Tampilkan preview di tabel
// 6. Kirim ke backend via google.script.run
```

---

## 9. Cara Menambah Fitur Baru

### Step-by-step untuk module baru (contoh: baru "Inventory Adjustment")

**1. Database — `initDatabase.gs`**
```javascript
// Tambah header sheet baru
DB_HEADERS['t_adjustment'] = ['id', 'sku', 'qty', 'alasan', 'timestamp', 'operator'];

// Tambah ke DB_SHEET_ORDER
DB_SHEET_ORDER.push('t_adjustment');

// Tambah ke CONFIG.SHEETS di Helpers.gs
```

**2. Backend — buat file baru (contoh: `API_Adjustment.gs`)**
```javascript
function getAllAdjustments() { ... }
function saveAdjustment(payload) { ... }
```

**3. Register di `Code.gs`**
- Fungsi akan otomatis terdaftar via `executeAction()` yang menggunakan `this[actionName]`
- Tidak perlu registrasi manual

**4. Frontend — `index.html`**
```html
<!-- Tambah page baru -->
<div class="page" id="page-adjustment">
  ...
</div>

<!-- Tambah navigasi sidebar -->
<div class="nav-item" id="nav-adjustment" onclick="navigateTo('adjustment')">
  <span class="nav-icon">⚡</span> Adjustment
</div>
```

```javascript
// Tambah fungsi load table, form modal, dsb
function loadAdjustmentTable() { ... }
function showAdjustmentForm() { ... }
function saveAdjustment() { ... }
```

**5. Update CONFIG di `Helpers.gs`**
```javascript
SHEETS: {
  // ... existing ...
  ADJUSTMENT: 't_adjustment'
}
```

---

## 10. Deployment

### 10.1 Menggunakan clasp (Terminal)

```bash
# Install clasp
npm install -g @google/clasp

# Login
clasp login

# Clone project
clasp clone <scriptId>

# Push perubahan
clasp push

# Pull perubahan dari GAS Editor
clasp pull

# Deploy versi baru
clasp deploy -d "Deskripsi perubahan"
```

### 10.2 Manual (via GAS Editor)

1. Buka [script.google.com](https://script.google.com)
2. Copy semua file `.gs` dan `index.html`
3. Edit `Helpers.gs` → ganti `SPREADSHEET_ID`
4. Deploy → **Deploy as Web App**
   - `Execute as:` User accessing the web app
   - `Who has access:` Anyone with Google account
5. Buka URL deployment

### 10.3 appsscript.json — Konfigurasi

```json
{
  "timeZone": "Asia/Jakarta",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_ACCESSING"
  }
}
```

---

## 11. Cheat Sheet — Pattern yang Sering Dipakai

### Generate ID Unik
```javascript
generateId('AST');  // → AST-20260712-4521
```

### Format Tanggal
```javascript
Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
```

### Baca Semua Data Sheet
```javascript
var data = getSheetData(CONFIG.SHEETS.PRODUK);
// → [{ sku: 'SKU-001', nama_produk: 'Kertas A4', ... }]
```

### Cari Baris
```javascript
var found = findRow(CONFIG.SHEETS.PRODUK, 'sku', 'SKU-001');
if (found) {
  // found.rowIndex → nomor baris (1-based)
  // found.data → object data baris tersebut
}
```

### Update Multiple Cells
```javascript
updateRowCells(CONFIG.SHEETS.PRODUK, rowIndex, {
  nama_produk: 'Nama Baru',
  kategori: 'ATK'
});
```

### Filter by Branch (non-Admin)
```javascript
if (user.role !== CONFIG.ROLES.ADMIN) {
  data = data.filter(function(d) { return d.id_gudang === user.id_gudang; });
}
```

### Escape HTML (Cegah XSS)
```javascript
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

### Format Rupiah
```javascript
function formatRupiah(num) {
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
```

### Toast Notification
```javascript
showToast('success', 'Data berhasil disimpan!');
showToast('error', 'Terjadi kesalahan: ' + error.message);
showToast('warning', 'Peringatan: stok menipis');
```

### Modal Show/Close
```javascript
document.getElementById('modal-nama').classList.add('show');  // Tampilkan
document.getElementById('modal-nama').classList.remove('show'); // Tutup
```

### Button Loading State
```javascript
function setBtnLoading(id, loading) {
  document.getElementById(id).disabled = loading;
  document.getElementById(id).innerHTML = loading ? '⏳ Memproses...' : '💾 Simpan';
}
```

---

## Catatan Penting

1. **Satu file index.html** — Semua HTML, CSS, dan JavaScript frontend ada dalam satu file. Untuk proyek yang lebih besar, pertimbangkan untuk memisahkan ke file terpisah.
2. **google.script.run** — Library GAS hanya bisa dipanggil dari file yang di-deploy bersama project GAS. Tidak bisa dari file eksternal.
3. **CacheService** — Token sesi disimpan di CacheService dengan TTL 2 jam. Cache bersifat volatile.
4. **LockService** — Gunakan untuk operasi yang mengubah data (stok, transaksi) untuk mencegah race condition.
5. **CSS Variables** — Selalu gunakan CSS variables untuk warna dan spacing agar konsisten.
6. **Colspan** — Pastikan `colspan` pada baris "Memuat..."/empty state sesuai dengan jumlah kolom header.
7. **Naming Convention** — Fungsi backend: camelCase (`getAllAssets`). ID HTML: kebab-case (`modal-aset`).

---

## 12. Migrasi v2.0 — Tanpa Supabase, Hosting GitHub Pages

> Perubahan besar dari v1.0 (Supabase + google.script.run) menjadi v2.0.

### Yang berubah

1. **Database** — Supabase → **Google Spreadsheet** (`DB_Layer.gs`).
   Semua helper `fetchSupabase`, `findInSupabase`, `getDataFromSupabase`,
   `generateSupabaseSequentialId` kini membaca/menulis spreadsheet langsung
   (kompatibel dengan pemanggil lama, tanpa mengubah kode API).
2. **Frontend** — `src/supabase.js` → **`src/gas.js`**.
   `apiCall(actionName, args)` memanggil `doPost` → `executeAction()`
   dengan sesi token dari `loginWithEmailAndPassword`.
3. **Login** — Supabase Auth → verifikasi email/password di sheet `User_List`
   (hash password, sesi UUID di `CacheService` + `localStorage`).
4. **Hosting** — Frontend statis di **GitHub Pages**; backend tetap GAS Web App
   (deploy "Anyone" agar bisa di-fetch lintas domain; CORS memakai `text/plain`
   agar tidak preflight).
5. **Foto** — Supabase Storage → **Google Drive** (`uploadAuditPhoto`).
6. **WA** — Supabase Edge Function → fungsi GAS `sendWhatsApp`/`sendWaMessage`
   (token Fonnte di `PropertiesService`).

### Fungsi GAS baru (v2.0)

- `deleteAssetInspection(rowIndex)` — hapus inspeksi kendaraan.
- `getAllSurveyGA()` — raw rows survey GA untuk halaman Rating GA.
- `sendWaMessage(phone, message)` — wrapper `successResponse` untuk kirim WA.
- `getDashboardStats()` — diperluas: `assets.total`, `users.total`, `kos.total`, `booking.pending`.
- `doPost(e)` — endpoint JSON untuk `fetch()` dari frontend GitHub Pages.

### Folder arsip

`supabase-arsip/` menyimpan SQL migrasi, CLI, dan integrasi Supabase lama —
tidak dipakai, di-ignore git, disimpan untuk dilanjutkan nanti.
