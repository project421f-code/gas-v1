# GA Operations — Management System

Aplikasi manajemen operasional General Affair (Maintenance, Security Patroli, Housekeeping, Booking Aset, Tamu Kos, Survey).

> **Versi 2.0** — 100% **tanpa Supabase**. Database = **Google Spreadsheet**, Backend = **Google Apps Script**, Frontend = **statis (siap GitHub Pages)**.

---

## 🏗️ Arsitektur

| Lapisan | Teknologi |
|---------|-----------|
| **Database** | Google Spreadsheet (21 sheet) |
| **Backend / API** | Google Apps Script — Web App `doPost` → `executeAction()` |
| **Frontend** | `index.html` + file JS statis di `src/` (Vanilla JS + Chart.js) |
| **Hosting Frontend** | GitHub Pages (atau hosting statis apa pun) |
| **Komunikasi** | `fetch()` dari browser → URL Web App GAS (JSON) |
| **WhatsApp** | Fonnte (token disimpan di `PropertiesService`) |
| **Foto** | Disimpan ke Google Drive (folder `GA_Photos`) |

```
Browser (GitHub Pages)
   │  POST JSON { email, sessionToken, actionName, args }
   ▼
GAS Web App (doPost → executeAction)
   │
   ▼
Google Spreadsheet (DB_Layer.gs) + Google Drive (foto) + Fonnte (WA)
```

### File penting

| File | Fungsi |
|------|--------|
| `index.html` | UI utama + bootstrap sesi |
| `src/gas.js` | Client API (`apiCall`) + session + definisi `APP` |
| `src/auth.js` | Login / logout |
| `src/*.js` lainnya | Logika tiap halaman |
| `Code.gs` | `doGet`/`doPost`, `executeAction`, `resolveFunction` |
| `DB_Layer.gs` | Emulator helper Supabase → murni Spreadsheet |
| `Helpers.gs` | Helper umum (sheet, sesi, WA, dll) |
| `API_*.gs` | Fungsi bisnis per modul (Auth, Booking, Kost, HK, Maintenance, Security, Survey) |
| `initDatabase.gs` | Definisi sheet + seed data |
| `supabase-arsip/` | Arsip semua file Supabase lama (tidak dipakai, disimpan lokal) |

---

## 🚀 Cara Deploy (3 Langkah)

### Langkah 1 — Siapkan Spreadsheet (sekali saja)

1. Buat **Google Spreadsheet** baru.
2. Buka **Extensions → Apps Script**.
3. Salin SEMUA file `.gs` (Code.gs, DB_Layer.gs, Helpers.gs, API_*.gs, initDatabase.gs) ke editor Apps Script.
4. Di `Helpers.gs`, ubah `CONFIG.SPREADSHEET_ID` → ID spreadsheet Anda (ambil dari URL spreadsheet: `https://docs.google.com/spreadsheets/d/<ID>/edit`).
5. Jalankan fungsi **`initializeAllSheets()`** sekali dari editor (ikon ▶ → pilih fungsi). Ini membuat semua sheet + seed data.
   - Login bawaan: `admin@ga.com` / `ga2026`
   - Ganti password default lewat menu **Users** di aplikasi.

### Langkah 2 — Deploy GAS sebagai Web App

> ⚡ **Cara cepat (disarankan):** pakai **clasp (CLI)** — panduan lengkap di [`DEPLOY-CLASP.md`](DEPLOY-CLASP.md).
> ```bash
> clasp login
> clasp push
> clasp deploy -d "Production v2.0"   # atau: clasp deploy -i <DeploymentId> (URL tetap)
> clasp run initializeAllSheets        # buat semua sheet + seed data
> ```

Cara manual di editor Apps Script:

1. **Extensions → Apps Script** → **Deploy → New deployment**.
2. Type: **Web app**.
3. **Execute as:** *Me*.
4. **Who has access:** *Anyone* (Siapa saja) — agar bisa dipanggil dari GitHub Pages.
5. Klik **Deploy**, izinkan akses, salin **Web app URL** (berakhiran `/exec`).
6. Jalankan fungsi **`initializeAllSheets()`** sekali untuk membuat semua sheet + seed data (login awal: `admin@ga.com` / `ga2026`).

### Langkah 3 — Hosting Frontend di GitHub Pages

> 📖 **Panduan lengkap langkah demi langkah:** [`DEPLOY-GITHUB-PAGES.md`](DEPLOY-GITHUB-PAGES.md) — sudah termasuk push, aktivasi Pages, custom domain, troubleshooting.

Ringkasnya (repo Anda: `github.com/project421f-code/gas-v1`):

1. `git add index.html src/ && git commit -m "v2.0" && git push origin master`
2. Repo → **Settings → Pages** → **Deploy from a branch** → `master` / `/ (root)` → **Save**.
3. Tunggu 1–2 menit → situs live di `https://project421f-code.github.io/gas-v1/`.
4. Login `admin@ga.com` / `ga2026` → menu **Pengaturan** → isi **URL Web App GAS** (dari Langkah 2) → Simpan.
   - URL ini disimpan di `localStorage` browser. Setiap user yang login pertama kali perlu mengisinya (atau di-hardcode di `src/gas.js` → `GAS_APP_URL`).

> ⚠️ **Jangan host `public.html` & `public-complaint.html`** — keduanya masih berisi kode Supabase lama. Halaman publik yang aktif: `index.html?page=public` (booking aset) dan `index.html?page=complaint` (komplain) — keduanya backend GAS, tanpa login. Jangan commit `_setup_wa_token.gs` (token Fonnte bocor — jalankan `git reset -- _setup_wa_token.gs` setelah `git add *.gs`).

---

## 🔑 Autentikasi

- Email & password diverifikasi di **backend GAS** terhadap sheet `User_List` (password di-hash dengan `hashPassword`).
- Token sesi (UUID) disimpan di `CacheService` (TTL 2 jam) + `localStorage` browser.
- Menambah user baru: menu **Users** → password wajib diisi (digunakan untuk login).
- Halaman publik booking aset (`?page=public`) tidak butuh login (aksi `getPublicAssetsAvailability` & `publicBooking` bersifat publik).

## 📱 WhatsApp (Fonnte)

- Token disimpan di **PropertiesService** (aman, tidak di frontend).
- Set via menu **Pengaturan** → token → Test Koneksi.
- Webhook Fonnte (pesan masuk → tiket komplain): arahkan ke URL Web App GAS yang sama.

## 🗄️ Arsip Supabase

Semua yang berkaitan dengan Supabase (SQL migrasi, CLI, `src/supabase.js`, fungsi `migrate*ToSupabase`) dipindahkan ke folder **`supabase-arsip/`** (di-ignore git) untuk dilanjutkan nanti jika diperlukan. Backend aktif tidak lagi bergantung padanya.

## 🧪 Development Lokal

```bash
# Dari folder project (jalankan server statis)
python -m http.server 8123
# Buka http://localhost:8123/index.html
```
