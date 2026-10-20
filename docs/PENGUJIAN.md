# Pengujian dan Hardening (Tahap 8)

Dokumen ini mencatat strategi pengujian LPTI-ISBN, cara menjalankannya, cakupan
yang sudah diuji, serta temuan hardening yang diperbaiki pada Tahap 8.

> Pengujian dijalankan terhadap **sistem pengelolaan pengajuan ISBN**, bukan
> portal resmi Perpusnas. Tidak ada pengujian yang menyentuh sistem pihak ketiga
> atau menghasilkan nomor ISBN secara otomatis.

## 1. Lapisan pengujian

| Lapisan | Alat | Lokasi | Tujuan |
|---|---|---|---|
| Feature test API | PHPUnit 12 + `RefreshDatabase` (SQLite in-memory) | `backend/tests/Feature` | Validasi, otorisasi, isolasi data, transisi status, dokumen, notifikasi, laporan |
| Unit test | PHPUnit | `backend/tests/Unit` | Matriks transisi status & label enum |
| Lint & format | Pint (PHP), ESLint (TS) | `backend/`, `frontend/` | Konsistensi gaya & kesalahan statis |
| Build produksi | `next build` | `frontend/` | TypeScript + rute + rendering produksi |
| Smoke integrasi | Skrip Python (stdlib) | dijalankan manual | Backend + frontend hidup, termasuk BFF & progressive enhancement |

Semua feature test memakai factory (`UserFactory`, `BookSubmissionFactory`) dan
trait helper `Tests\Concerns\InteractsWithApi`, sehingga data uji selalu bersih
per-test dan tidak menyentuh basis data pengembangan.

## 2. Menjalankan pengujian

```powershell
# Seluruh suite backend (155 test, 726 assertion)
cd D:\LPTI_ISBN\backend
php artisan test --compact

# Satu berkas / satu test
php artisan test tests/Feature/StatusTransitionTest.php
php artisan test --filter=test_record_isbn_stores_normalized_number_and_audit_metadata

# Gaya kode
vendor\bin\pint --format agent

# Frontend
cd D:\LPTI_ISBN\frontend
npx eslint .
npx next build
```

Smoke integrasi memerlukan backend (`php artisan serve`) dan frontend
(`npm run dev`) berjalan:

```powershell
python smoke_tahap8_integration.py   # API end-to-end + BFF + CSV
python smoke_tahap8_frontend.py      # halaman, proteksi route, header keamanan
```

## 3. Cakupan feature test

| Berkas | Fokus |
|---|---|
| `AuthTest` | Register/login/logout/profil, hash password, token, rate limit, audit |
| `ApiContractTest` | Envelope sukses/gagal, pemetaan status HTTP, otentikasi semua rute, anti-enumeration |
| `SubmissionManagementTest` | Draft, nomor pengajuan, filter/pencarian/paginasi, edit terkunci, hapus, ajukan/ajukan ulang, statistik |
| `SubmissionValidationTest` | Validasi panjang/rentang field, path traversal nama berkas, batas peran |
| `DocumentAccessTest` | Unggah/unduh/preview/hapus dokumen privat, MIME & ukuran, pemeriksaan admin |
| `StatusTransitionTest` | Siklus penuh draft → ISBN, transisi tidak sah 403, catatan/alasan, pencatatan ISBN, notifikasi |
| `NotificationTest` | Daftar sendiri, filter belum dibaca, tandai baca/read-all, anti-enumeration |
| `AdminReportTest` | Ringkasan, filter, ekspor CSV (BOM, privasi kolom), audit ekspor |
| `AdminAuditLogTest` | Akses admin, filter aksi/aktor/tanggal, paginasi, metadata aman |
| `AdminUserManagementTest` | Daftar pemohon, CRUD akun super_admin, guard role sendiri & hapus |
| `AdminDocumentRequirementTest` | CRUD persyaratan, validasi, 409 saat masih dipakai |
| `Unit\SubmissionStatusTest` | Matriks transisi, `isEditable()`, label Bahasa Indonesia |

### Kasus kunci yang dikunci oleh test

- **Isolasi data**: pengajuan/dokumen milik pengguna lain selalu **404**
  (anti-enumeration), bukan 403.
- **Batas peran**: pemohon 403 pada seluruh rute `/admin/*`; admin biasa 403 pada
  manajemen akun (khusus `super_admin`).
- **Input sensitif**: `status`, `submission_number`, `isbn_number`, dan `role`
  tidak pernah diterima dari klien.
- **Nomor ISBN**: hanya dicatat manual dari status `approved_for_processing`,
  dinormalisasi ke digit murni, unik, dan tanggal penetapan tidak boleh jauh di
  masa depan.
- **Privasi dokumen**: berkas disimpan di disk privat; preview lintas pengguna
  404 dan isi berkas tidak pernah bocor.
- **CSV laporan**: memuat BOM UTF-8, hanya baris sesuai filter, tanpa email,
  alamat, sinopsis, catatan internal, atau lokasi berkas.

## 4. Hardening: temuan dan perbaikan

| # | Temuan | Dampak bila dibiarkan | Perbaikan |
|---|---|---|---|
| 1 | Renderer 429 terdaftar untuk `Symfony\...\ThrottleRequestsException`, padahal Laravel melempar `Illuminate\Http\Exceptions\ThrottleRequestsException` | Respons rate limit memakai pesan bawaan `"Too Many Attempts."`, melanggar kontrak pesan Bahasa Indonesia di `docs/API.md` | Impor kelas exception yang benar di `bootstrap/app.php` |
| 2 | `AuditLog::$fillable` tidak memuat `actor_user_id` | Baris audit kehilangan aktor secara diam-diam | Kolom dicantumkan pada `$fillable` (perbaikan Tahap 7, dikunci test) |
| 3 | Tidak ada header keamanan pada respons aplikasi | Rentan clickjacking pada formulir berisi data pribadi dan sniffing tipe berkas | `headers()` di `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` |
| 4 | Belum ada suite otomatis (hanya contoh PHPUnit) | Regresi otorisasi/validasi tidak terdeteksi | 155 feature/unit test baru + smoke terpadu |
| 5 | `globals.css` mendefinisikan `--font-sans: var(--font-sans)` (merujuk dirinya sendiri) | Variabel menjadi kosong sehingga teks judul/kartu jatuh ke font bawaan peramban (serif) | Variabel diarahkan ke `--font-geist-sans` dari `next/font` dengan fallback `ui-sans-serif, system-ui, ...`; `body` diberi `font-family: var(--font-sans)` sebagai jaring pengaman |

### Catatan hardening lain (diverifikasi, bukan diubah)

- `SubmissionStatusService::transition()` adalah satu-satunya jalur ubah status;
  test membuktikan tidak ada sampingan (histori/notifikasi) saat transisi ditolak.
- Nomor pengajuan (`LPTI-ISBN-<tahun>-<urut>`) dibuat sistem di dalam transaksi
  dan **bukan** nomor ISBN.
- Email tidak diaktifkan; notifikasi berjalan sepenuhnya lewat kanal database.

## 5. Interpretasi hasil

- **PHPUnit 155/155 lulus** — kontrak API, otorisasi, dan isolasi data terverifikasi.
- **Pint & ESLint bersih** — tidak ada pelanggaran gaya yang tersisa.
- **`next build` sukses (27 rute)** — seluruh halaman dinamis publik/pemohon/admin
  terkompilasi tanpa galat TypeScript.
- **Smoke integrasi 62/62 dan frontend 53/53 lulus** — jalur nyata (MySQL,
  Sanctum PAT, cookie httpOnly, BFF, CSV, header keamanan) berfungsi.

Setiap kali ada perubahan pada enum status, policy, middleware, atau kontrak API,
jalankan ulang `php artisan test --compact` untuk memastikan matriks otorisasi
tetap utuh.
