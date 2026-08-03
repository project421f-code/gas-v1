# 🚀 Deploy Backend GAS dengan clasp (CLI)

Panduan langkah demi langkah deploy Google Apps Script memakai **clasp** (Command Line Interface) — lebih cepat dan bisa diulang dibanding menyalin manual lewat editor Apps Script.

> **Status project Anda:** konfigurasi clasp **sudah siap** (`.clasp.json`, `appsscript.json`, `.claspignore`). Node.js v24 + clasp 3.3.0 terdeteksi. Tinggal ikuti Langkah 5–10.

---

## 1. Prasyarat

| Kebutuhan | Status Anda |
|-----------|-------------|
| Node.js ≥ 16 | ✅ v24.18.0 |
| npm | ✅ 11.16.0 |
| Akun Google | ✅ |
| Akses ke spreadsheet `17kLMlyR1KL1vPlUFTELPBKS8ho_8CZ8gRwjjf-DXzXo` | ✅ |

## 2. Install clasp

```bash
npm install -g @google/clasp
# atau tanpa install global:
npx @google/clasp@latest
```

Cek berhasil:

```bash
clasp --version   # → 3.3.0
```

## 3. Login ke Google

```bash
clasp login
```

- Browser terbuka → pilih akun Google → izinkan akses **Google Apps Script API**.
- Jika muncul error `403: Access Not Configured`, aktifkan dulu **Apps Script API**:
  https://console.developers.google.com/apis/library/script.googleapis.com
- Cek status: `clasp whoami` (harus menampilkan email Anda).

## 4. Konfigurasi project (sudah ada — jangan diubah)

| File | Isi | Keterangan |
|------|-----|-----------|
| `.clasp.json` | `scriptId`, `parentId` (spreadsheet), `rootDir: "."`, `fileExtension: "gs"` | Menghubungkan folder ini ke project GAS |
| `appsscript.json` | timezone `Asia/Jakarta`, runtime `V8`, scopes, **webapp access `ANYONE_ANONYMOUS`** | Wajib `ANYONE_ANONYMOUS` agar bisa di-`fetch` dari GitHub Pages |
| `.claspignore` | Mengecualikan `supabase-arsip/`, `src/`, `frontend/`, `_setup_wa_token.gs`, dll. | Mencegah file `.gs` duplikat dari arsip ter-push → error **Duplicate function** |

## 5. Pastikan ID Spreadsheet benar

Edit **`Helpers.gs`**:

```js
var CONFIG = {
  SPREADSHEET_ID: '17kLMlyR1KL1vPlUFTELPBKS8ho_8CZ8gRwjjf-DXzXo', // ← ID spreadsheet Anda
  ...
};
```

ID = bagian URL spreadsheet: `https://docs.google.com/spreadsheets/d/<ID>/edit`.

## 6. Push kode ke Apps Script

```bash
clasp push
```

File yang ter-push (11 file `.gs` + `appsscript.json`):

```
API_Auth.gs, API_Booking.gs, API_Housekeeping.gs, API_Kost.gs,
API_Maintenance.gs, API_Security.gs, API_Survey.gs,
Code.gs, DB_Layer.gs, Helpers.gs, initDatabase.gs, appsscript.json
```

Jika muncul `Files in your project on script.google.com that were not found locally: ...` pilih **`n`** (Ignore).

## 7. Deploy Web App

```bash
# Lihat deployment yang sudah ada
clasp deployments
```

**Opsi A — Deployment baru (URL baru):**

```bash
clasp deploy -d "Production v2.0"
```

**Opsi B — Update deployment yang sama (URL TIDAK berubah) — DIREKOMENDASIKAN** agar user tidak perlu mengubah URL di Pengaturan:

```bash
clasp deployments                      # catat "Deployment ID"
clasp deploy -i <DeploymentId> -d "Update v2.0.1"
```

> `clasp deploy -i` memperbarui deployment yang sudah ada → **URL web app tetap sama**.

Catat **Web app URL** (berakhiran `/exec`) dari output → isi di menu **Pengaturan → URL Web App GAS** pada aplikasi (setelah login).

## 8. Jalankan fungsi dari terminal (inisialisasi spreadsheet)

```bash
clasp run initializeAllSheets
```

- Pertama kali akan meminta authorization — buka URL yang diberikan, izinkan.
- `clasp run` hanya untuk fungsi **tanpa parameter**. Fungsi berparameter tetap dijalankan lewat editor atau lewat URL web app.

## 9. Buka editor & pantau log

```bash
clasp open              # buka editor Apps Script di browser
clasp open --webapp     # buka URL web app
clasp logs              # streaming log eksekusi
```

## 10. Alur update (setiap ada perubahan kode)

```bash
clasp push                                  # 1. kirim file terbaru
clasp deploy -i <DeploymentId> -d "v2.0.2"  # 2. perbarui deployment (URL tetap)
```

Frontend GitHub Pages tidak perlu diubah apa pun — URL backend tetap sama.

## 11. Rollback / hapus deployment

```bash
clasp deployments                                    # lihat daftar
clasp undeploy <DeploymentId>                        # hapus deployment
clasp deploy -V <nomorVersiLama> -d "Rollback"       # aktifkan versi lama (URL baru)
```

## 12. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `401 Unauthorized` saat push | `clasp login` ulang |
| Error **Duplicate function** di GAS | Pastikan `.claspignore` mengecualikan `supabase-arsip/` |
| `403` saat `clasp run` | Aktifkan Apps Script API + izinkan scopes |
| CORS / fetch diblokir dari GitHub Pages | Pastikan deploy ber-access **Anyone** (`ANYONE_ANONYMOUS` di `appsscript.json`) — sudah diatur; `src/gas.js` memakai `Content-Type: text/plain` agar tidak preflight |
| Perubahan tidak muncul di web app | Gunakan `clasp deploy -i <DeploymentId>` (update deployment yang sama) |
| `clasp run` butuh parameter | Jalankan via editor Apps Script |

## 13. ⚠️ Keamanan — token WhatsApp

File `_setup_wa_token.gs` berisi **token Fonnte hardcoded** yang sudah terekspos di repo. Tindakan yang disarankan:

1. **Hapus file** `_setup_wa_token.gs` dari project.
2. **Rotate (ganti) token** di dashboard Fonnte — token lama dianggap bocor.
3. Set token baru lewat aplikasi: **Pengaturan → WhatsApp Integration → isi token → Test Koneksi** (tersimpan di `PropertiesService`, tidak di frontend).

File ini sudah di-exclude dari push (`.claspignore`) sehingga tidak ikut ter-deploy.

---

## Cheat Sheet

```bash
clasp login                 # login Google
clasp status                # cek perbedaan file lokal vs remote
clasp push                  # kirim kode ke GAS
clasp pull                  # tarik kode dari GAS (hati-hati: menimpa)
clasp deployments           # daftar deployment
clasp deploy -i <ID> -d "msg"   # update deployment (URL tetap)
clasp run <FunctionName>    # jalankan fungsi (tanpa parameter)
clasp open                  # buka editor
clasp logs                  # lihat log
clasp undeploy <ID>         # hapus deployment
```
