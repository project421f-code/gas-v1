# 🌐 Deploy Frontend ke GitHub Pages

Panduan langkah demi langkah untuk menghosting frontend statis aplikasi (GA Operations v2.0) di **GitHub Pages** — gratis, tanpa server, dan langsung terhubung ke backend GAS.

> **Status project Anda:** repo GitHub **sudah ada** (`github.com/project421f-code/gas-v1`, branch `master`). Frontend memakai **path relatif** sehingga siap di-subpath `/gas-v1/`. Tinggal ikuti Langkah 4–7.

---

## 1. Prasyarat

| Kebutuhan | Status Anda |
|-----------|-------------|
| Repo GitHub | ✅ `https://github.com/project421f-code/gas-v1.git` |
| Git diinstal | ✅ |
| Backend GAS sudah deploy | ✅ Deployment `@81` (URL berakhir `/exec`) |
| File frontend | `index.html` + folder `src/` (13 file JS) |

---

## 2. Apa saja yang di-host?

Hanya **file statis** ini yang dibutuhkan:

```
index.html        ← UI utama + bootstrap sesi + halaman publik (?page=public)
src/              ← semua file JS (gas.js, auth.js, dashboard.js, dll.)
```

CDN (Chart.js, html5-qrcode, qrcode, Google Fonts) dimuat langsung dari internet — **tidak perlu di-upload**. File `.gs` tidak di-host; itu hanya backup di repo.

> ⚠️ **JANGAN host `public.html` dan `public-complaint.html`** — kedua file lama ini masih berisi kode Supabase (CDN + URL + query langsung) dan **tidak akan berfungsi** tanpa Supabase. Halaman publik yang aktif: `index.html?page=public` (booking) dan `index.html?page=complaint` (komplain) — keduanya backend GAS.

---

## 3. Pilih skema hosting

### Opsi A — Halaman utama (https://username.github.io)
Paling sederhana: buat repo bernama `<username>.github.io` dan taruh `index.html` + `src/` di root.

### Opsi B — Sub-path repo (https://username.github.io/gas-v1) ✅ RECOMMENDED
Satu GitHub account bisa menampung banyak aplikasi. Project Anda sudah memakai path relatif (`src/gas.js`), jadi **sub-path langsung berfungsi tanpa konfigurasi**.

---

## 4. Push frontend ke repo (sekali)

```bash
cd "/c/Users/MGA/Downloads/File repo/Gas v1.0 - stable -migrasi"

git add index.html src/ appsscript.json *.gs README.md DEPLOY-CLASP.md DEPLOY-GITHUB-PAGES.md .gitignore .claspignore .clasp.json
git reset -- _setup_wa_token.gs    # ⚠️ JANGAN commit file ini (token Fonnte bocor)
git commit -m "feat: v2.0 frontend GitHub Pages + backend GAS"
git push origin master
```

> ⚠️ **Keamanan:** `git add *.gs` akan menyertakan `_setup_wa_token.gs` yang berisi **token Fonnte hardcoded** (sudah terekspos di repo lama — sebaiknya di-rotate di dashboard Fonnte). Baris `git reset -- _setup_wa_token.gs` di atas mencegahnya ikut ter-commit.
>
> Pastikan `.gitignore` mengecualikan `supabase-arsip/cli/`, `node_modules/`, dan `frontend/` (sudah diatur). Periksa dengan: `git status --short`.

---

## 5. Aktifkan GitHub Pages

1. Buka repo di GitHub: `https://github.com/project421f-code/gas-v1`
2. **Settings** (⚙️) → **Pages** (sidebar kiri).
3. Di **Build and deployment** → **Source**: pilih **Deploy from a branch**.
4. **Branch**: `master` → folder: **/(root)** → **Save**.
5. Tunggu 1–2 menit → situs live di:
   ```
   https://project421f-code.github.io/gas-v1/
   ```

> 💡 **Alternatif cepat — GitHub Actions (otomatis):** GitHub Pages sekarang support **GitHub Actions** sebagai source. Pilih **Source: GitHub Actions**, lalu gunakan workflow resmi *"Static HTML"* — setiap `git push` otomatis di-deploy. (Cara manual di atas sudah cukup.)

---

## 6. Isi URL Web App GAS

Setelah situs live, hubungkan ke backend:

1. Buka `https://project421f-code.github.io/gas-v1/` → halaman login muncul.
2. Login `admin@ga.com` / `ga2026` (seed bawaan).
3. Menu **Pengaturan → URL Web App GAS** → tempel URL deployment GAS:
   ```
   https://script.google.com/macros/s/AKfycbx8QERx-jfwsHnRWU72SDjgt_BG7XFmgHsfJ_cMfAWd9y4Uf61sPIvgrvQ2kC27TkM4GA/exec
   ```
4. **Simpan** → aplikasi siap dipakai.

> URL tersimpan di `localStorage` browser. Untuk meng-hardcode agar semua user tidak perlu mengisi manual, edit `src/gas.js`:
> ```js
> var GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbx8QERx-jfwsHnRWU72SDjgt_BG7XFmgHsfJ_cMfAWd9y4Uf61sPIvgrvQ2kC27TkM4GA/exec';
> ```
> ⚠️ Kalau di-hardcode, jangan commit jika token/URL itu rahasia — URL GAS publik tidak sensitif, tapi sebaiknya tetap via Pengaturan.

---

## 7. Halaman publik (tanpa login)

- **Booking aset:** `https://project421f-code.github.io/gas-v1/?page=public`
- **Komplain / perbaikan:** `https://project421f-code.github.io/gas-v1/?page=complaint`

Kedua halaman ini memanggil aksi GAS publik (`getPublicAssetsAvailability`, `publicBooking`, `publicComplaint`) — **tidak butuh login**. Backend harus di-deploy dengan akses **Anyone** (sudah: `ANYONE_ANONYMOUS` di `appsscript.json`).

---

## 8. Alur update frontend (setiap ada perubahan)

```bash
git add -A
git commit -m "fix: perbaikan halaman dashboard"
git push origin master
```

GitHub Pages otomatis men-deploy ulang dalam 1–2 menit. **Backend GAS tidak perlu diubah** (kecuali ada perubahan API):
```bash
clasp push
clasp deploy -i <DeploymentId> -d "update v2.0.1"   # URL /exec tetap sama
```

---

## 9. Custom domain (opsional)

1. Beli domain (mis. `gas.gaops.com`).
2. Tambahkan DNS CNAME: `gas` → `project421f-code.github.io`.
3. Di repo: **Settings → Pages → Custom domain** → isi `gas.gaops.com` → Save.
4. Buat file `CNAME` berisi `gas.gaops.com` di root repo, lalu push.
5. Aktifkan **Enforce HTTPS** setelah verifikasi.

---

## 10. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Halaman **404** setelah push | Pastikan branch & folder benar (master + /root); tunggu 1–2 menit; hard-refresh (Ctrl+F5) |
| **CSS/JS tidak termuat** (halaman polos) | Semua file `src/*.js` harus ikut ter-push (cek `https://.../gas-v1/src/gas.js` bisa dibuka) |
| Login gagal / "URL belum diatur" | Isi URL Web App GAS di menu Pengaturan (Langkah 6), atau hardcode di `src/gas.js` |
| **CORS** saat fetch ke GAS | Backend harus akses **Anyone** (`ANYONE_ANONYMOUS`) — sudah diatur di `appsscript.json` |
| Halaman publik kosong | Akses `?page=public` dari root (bukan `public.html`); cek console → koneksi ke GAS |
| File `_setup_wa_token.gs` ikut commit | Jalankan `git reset -- _setup_wa_token.gs` sebelum commit; jangan push file token |
| Perubahan tidak muncul | GitHub Pages butuh 1–2 menit; pastikan push ke branch yang diaktifkan |
| Sub-path tidak jalan | Jangan pakai path absolut (`/src/...`) — project sudah relatif, jadi aman |

---

## Cheat Sheet

```bash
git add -A && git commit -m "update" && git push origin master   # deploy frontend
# Situs: https://project421f-code.github.io/gas-v1/
# Publik: .../gas-v1/?page=public  |  .../gas-v1/?page=complaint
# Backend: clasp push + clasp deploy -i <DeploymentId>
```
