# LPTI-ISBN

**LPTI-ISBN** — Platform Pengajuan dan Pengelolaan ISBN.

Aplikasi web untuk pengajuan, verifikasi, dan pengelolaan permohonan ISBN buku
oleh penulis/penerbit (pemohon) dan administrator/verifikator. Dibangun dengan
Laravel 13 sebagai REST API dan Next.js 16 sebagai antarmuka web.

> ## ⚠️ Disclaimer penting
>
> LPTI-ISBN adalah **sistem pengelolaan pengajuan ISBN**, **bukan** portal resmi
> Perpustakaan Nasional Republik Indonesia (Perpusnas).
>
> - Aplikasi ini **tidak** terhubung ke sistem Perpusnas dan **tidak** memiliki
>   afiliasi resmi dengan instansi mana pun.
> - Aplikasi ini **tidak** menerbitkan atau men-generate nomor ISBN secara
>   otomatis. Nomor ISBN hanya **dicatat manual oleh admin** setelah nomor
>   tersebut sah ditetapkan oleh pihak berwenang.
> - Aplikasi ini **tidak** menampilkan logo instansi pemerintah.
> - Pemohon tetap wajib mengikuti ketentuan resmi yang berlaku untuk memperoleh
>   ISBN.

---

## Daftar Isi

- [Fitur](#fitur)
- [Komponen dan stack](#komponen-dan-stack)
- [Prasyarat](#prasyarat)
- [Struktur proyek](#struktur-proyek)
- [Setup lokal](#setup-lokal)
- [Akun demo](#akun-demo)
- [Peran pengguna](#peran-pengguna)
- [Alur status pengajuan](#alur-status-pengajuan)
- [Menjalankan pengujian](#menjalankan-pengujian)
- [Konfigurasi lingkungan](#konfigurasi-lingkungan)
- [Deployment](#deployment)
- [Dokumentasi](#dokumentasi)
- [Status pengerjaan](#status-pengerjaan)

---

## Fitur

**Publik**
- Halaman beranda dengan penjelasan alur pengajuan dan disclaimer.
- Halaman informasi persyaratan dokumen (dikelola admin, bukan hardcoded).
- Registrasi dan login.

**Pemohon (penulis/penerbit)**
- Dashboard ringkasan status pengajuan.
- Membuat, mengubah, dan menghapus pengajuan selama berstatus *draft* atau
  *perlu revisi*.
- Mengunggah dokumen persyaratan (privat, tidak dapat diakses publik).
- Mengajukan dan mengajukan ulang pengajuan.
- Melihat riwayat status dan catatan verifikator.
- Notifikasi in-app saat status berubah.
- Mengelola profil dan kata sandi.

**Admin / Verifikator**
- Dashboard statistik pengajuan.
- Daftar pengajuan dengan pencarian, filter status, dan paginasi.
- Memulai verifikasi, meminta revisi, menyetujui, atau menolak pengajuan.
- Memeriksa (review) dan mengunduh dokumen pemohon.
- Mencatat nomor ISBN secara **manual** setelah sah ditetapkan.
- Laporan pengajuan + ekspor CSV (tanpa kolom sensitif).
- Log audit seluruh aktivitas penting.
- Daftar pemohon.
- Kelola persyaratan dokumen (aktif/nonaktif, wajib/opsional, tipe & ukuran).

**Admin utama (`super_admin`)**
- Seluruh kemampuan admin, ditambah kelola akun pengguna (buat/ubah/hapus).

---

## Komponen dan stack

| Direktori | Isi | Stack |
|---|---|---|
| `frontend/` | Antarmuka web | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui |
| `backend/` | REST API `/api/v1` | Laravel 13 · Sanctum · Eloquent · PostgreSQL (Neon) — MySQL 8 tetap didukung |
| `docs/` | Dokumentasi desain, kontrak, deployment | Markdown · Mermaid |

Autentikasi memakai pola **BFF (Backend-for-Frontend)**: token Sanctum hanya
disimpan di cookie `httpOnly` pada server Next.js dan tidak pernah dikirim ke
browser. Semua panggilan ke API dilakukan dari sisi server (Server Actions dan
Route Handlers). Rincian: [`docs/OTENTIKASI.md`](docs/OTENTIKASI.md).

---

## Prasyarat

| Perangkat | Versi minimum | Cek |
|---|---|---|
| PHP | 8.3 | `php -v` |
| Composer | 2 | `composer -V` |
| Node.js | 20 (diuji v25) | `node -v` |
| MySQL | 8 (MariaDB 10.6+) — pengembangan lokal | `mysql --version` |
| PostgreSQL | 17 (Neon) — produksi | — |

Ekstensi PHP yang dibutuhkan: `pdo_mysql` atau `pdo_pgsql` (sesuai driver),
`mbstring`, `openssl`, `fileinfo`, `ctype`, `json`, `tokenizer`, `xml`, `curl`.

---

## Struktur proyek

```text
LPTI_ISBN/
├── frontend/                     # Next.js App Router
│   ├── app/                      # Route groups: (publik), (pemohon), (admin)
│   │   └── api/auth/             # Route Handler BFF (login, logout, sesi, proxy)
│   ├── components/               # UI, layout, komponen bersama
│   ├── features/                 # auth, submissions, documents, admin
│   ├── lib/                      # api.ts (BFF), auth.ts (guard), actions.ts (Server Actions)
│   ├── schemas/                  # Skema validasi Zod
│   ├── types/                    # Tipe TypeScript
│   ├── proxy.ts                  # Pemeriksaan cookie optimistis (proteksi route awal)
│   ├── next.config.ts            # Header keamanan
│   └── .env.example
├── backend/                      # Laravel 13 REST API
│   ├── app/
│   │   ├── Enums/                # SubmissionStatus, UserRole
│   │   ├── Http/Controllers/Api/V1/
│   │   ├── Policies/
│   │   └── Services/             # SubmissionStatusService (satu-satunya jalur ubah status)
│   ├── bootstrap/app.php         # Envelope JSON untuk 401/403/404/409/422/429/500
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/              # UserSeeder, BookSubmissionSeeder, DocumentRequirementSeeder
│   ├── routes/api.php            # 44 endpoint di bawah /api/v1
│   ├── storage/app/private/      # Dokumen pemohon (PRIVAT — jangan diekspos)
│   ├── tests/                    # 160 test (Feature + Unit)
│   └── .env.example
├── docs/
│   ├── ANALISIS.md               # Tahap 1: kebutuhan, asumsi, arsitektur, alur status
│   ├── DATABASE.md               # ERD & spesifikasi tabel
│   ├── API.md                    # Kontrak API /api/v1
│   ├── OTENTIKASI.md             # Arsitektur autentikasi BFF
│   ├── PENGUJIAN.md              # Tahap 8: strategi pengujian & hardening
│   └── DEPLOYMENT.md             # Tahap 9: panduan deployment & checklist keamanan
└── README.md
```

---

## Setup lokal

### 1. Backend (Laravel 13)

```powershell
cd D:\LPTI_ISBN\backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Siapkan database MySQL (atau langsung ke Neon Postgres — lihat catatan di bawah):

```powershell
# Laragon
C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS lpti_isbn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Sesuaikan koneksi di `backend/.env` bila perlu:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lpti_isbn
DB_USERNAME=root
DB_PASSWORD=
```

> **Catatan produksi.** `backend/.env` pada repo ini sudah di-*wire* ke **Neon
> PostgreSQL** (endpoint **direct**, bukan pooled) — blok MySQL lama tetap
> tersimpan sebagai komentar di bawahnya. Untuk kembali ke MySQL lokal, cukup
> tukar komentar kedua blok. Migrasi **wajib** lewat endpoint direct Neon;
> endpoint `-pooler` gagal (`SQLSTATE[25P02]`). Rincian: `docs/DEPLOYMENT.md` §9.3.

Jalankan migrasi, seeder, dan server:

```powershell
php artisan migrate
php artisan db:seed
php artisan serve                 # http://localhost:8000
```

Cek kesehatan backend: <http://localhost:8000/up> harus mengembalikan `200`.

### 2. Frontend (Next.js)

```powershell
cd D:\LPTI_ISBN\frontend
npm install
Copy-Item .env.example .env.local     # API_URL=http://localhost:8000
npm run dev                           # http://localhost:3000
```

### 3. Menjalankan backend + frontend bersamaan

```powershell
# Terminal 1
cd D:\LPTI_ISBN\backend; php artisan serve

# Terminal 2
cd D:\LPTI_ISBN\frontend; npm run dev
```

Buka <http://localhost:3000>.

---

## Akun demo

Dibuat oleh `php artisan db:seed`. Semua akun fiktif, **kata sandi: `password`**.

| Email | Nama | Peran |
|---|---|---|
| `admin.utama@example.com` | Admin Utama LPTI | `super_admin` |
| `verifikator1@example.com` | Verifikator Satu | `admin` |
| `verifikator2@example.com` | Verifikator Dua | `admin` |
| `pemohon1@example.com` | Budi Santoso | pemohon (individu) |
| `pemohon2@example.com` | Siti Rahayu | pemohon (perwakilan penerbit) |
| `pemohon3@example.com` | Andi Wijaya | pemohon (individu) |

> Jangan menggunakan data pribadi nyata pada seeder. Ganti atau hapus akun demo
> sebelum produksi (lihat [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

Seeder juga membuat empat persyaratan dokumen:

| # | Persyaratan | Wajib | Format | Maks |
|---|---|---|---|---|
| 1 | KTP Penulis / Surat Keterangan Penerbit | Ya | pdf, jpeg, png | 4 MB |
| 2 | Surat Pernyataan Keaslian Naskah | Ya | pdf, jpeg, png | 4 MB |
| 3 | Sinopsis Buku | Ya | pdf | 4 MB |
| 4 | Contoh Isi / Sampul Buku | Tidak | pdf, jpeg, png | 4 MB |

---

## Peran pengguna

| Peran | Akses utama |
|---|---|
| `applicant` | Hanya pengajuan dan dokumen miliknya sendiri; `/dashboard` |
| `admin` | Verifikasi seluruh pengajuan, laporan, audit, persyaratan; `/admin` |
| `super_admin` | Semua akses admin + kelola akun pengguna |

Batas peran ditegakkan di backend (middleware + policy) dan di frontend (guard
`requireAuth`, `requireApplicant`, `requireAdmin`).

Penting untuk diketahui saat menguji: mengakses pengajuan atau dokumen milik
pengguna lain mengembalikan **404** (bukan 403), agar keberadaan data tidak
dapat ditebak (anti-enumeration). Akses ke rute `/admin/*` oleh pemohon
mengembalikan **403**.

---

## Alur status pengajuan

```text
draft ──submit──▶ submitted ──start-review──▶ under_review
                    │                              │
                    │                              ├─request-revision─▶ needs_revision
                    │                              │                        │
                    │                              │                   resubmit
                    │                              │                        ▼
                    │                              │                   resubmitted
                    │                              │                        │
                    │                              │◀───start-review────────┘
                    │                              │
                    │                              ├─approve──▶ approved_for_processing
                    │                              │                     │
                    │                              │              record-isbn
                    │                              │                     ▼
                    │                              │              isbn_assigned (final)
                    │                              └─reject──▶ rejected (final)
```

- Pengajuan hanya dapat **diubah/dihapus** pada status `draft` dan
  `needs_revision`.
- `isbn_assigned` dan `rejected` bersifat **final** — tidak ada transisi keluar.
- Setiap transisi divalidasi di server (satu jalur:
  `SubmissionStatusService`), dicatat pada riwayat status, dan menghasilkan
  notifikasi.
- Nomor pengajuan (`LPTI-ISBN-<tahun>-<urut>`) dibuat sistem dan **berbeda** dari
  nomor ISBN.

---

## Menjalankan pengujian

### Backend

```powershell
cd D:\LPTI_ISBN\backend

# Seluruh suite (160 test, 816 assertion; SQLite in-memory)
php artisan test --compact

# Satu berkas atau satu test
php artisan test tests/Feature/StatusTransitionTest.php
php artisan test --filter=test_preview_of_another_users_document_returns_not_found

# Gaya kode
vendor\bin\pint --format agent
```

### Frontend

```powershell
cd D:\LPTI_ISBN\frontend
npx eslint .
npx next build          # build produksi; sekaligus verifikasi TypeScript
```

Cakupan pengujian, temuan hardening, dan cara membaca hasilnya ada di
[`docs/PENGUJIAN.md`](docs/PENGUJIAN.md).

---

## Konfigurasi lingkungan

### `backend/.env`

Variabel paling penting:

| Variabel | Pengembangan | Produksi |
|---|---|---|
| `APP_ENV` | `local` | `production` |
| `APP_DEBUG` | `true` | **`false`** |
| `APP_KEY` | hasil `key:generate` | unik per lingkungan |
| `APP_URL` | `http://localhost:8000` | `https://<service>.onrender.com` |
| `APP_LOCALE` | `id` | `id` |
| `DB_*` | MySQL lokal **atau** Neon (direct) | Neon Postgres, user khusus bukan `root` |
| `LOG_LEVEL` | `debug` | `warning` |
| `FILESYSTEM_DISK` | `local` | `local` (dokumen harus tetap privat) |
| `QUEUE_CONNECTION` | `database` | `database` |
| `MAIL_MAILER` | `log` | `log` (email sengaja belum diaktifkan) |

Jangan mengubah `FILESYSTEM_DISK` menjadi disk publik: dokumen pemohon harus
tetap tersimpan di `storage/app/private`.

### `frontend/.env.local`

| Variabel | Nilai | Catatan |
|---|---|---|
| `API_URL` | `http://localhost:8000` (dev) / `https://<service>.onrender.com` (prod) | Dibaca **hanya di sisi server** |

**Jangan** memberi prefix `NEXT_PUBLIC_` pada `API_URL` — prefix tersebut ikut
membundel nilai ke kode browser dan akan membocorkan alamat backend.

---

## Deployment

> **Jalur yang dipakai proyek ini:** monorepo satu repo → **Vercel** (frontend,
> Root Directory `frontend`) → **Render** (backend Laravel via Docker,
> Root Directory `backend`) → **Neon** (PostgreSQL gratis). Langkah lengkapnya
> ada di [`docs/DEPLOYMENT.md` bagian 9](docs/DEPLOYMENT.md).

Panduan lengkap ada di **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**, mencakup:

- Topologi yang diasumsikan dan konsekuensinya (mengapa CORS tidak diperlukan).
- Langkah deploy backend (Composer `--no-dev`, migrasi, cache, izin berkas,
  contoh blok Nginx, worker antrean).
- Build dan menjalankan frontend (`next build` + `next start`, PM2/systemd).
- Tabel variabel lingkungan produksi.
- Perintah migrasi dan seeder yang aman.
- **Checklist keamanan sebelum produksi.**
- Verifikasi pasca-deploy dan prosedur rollback.

Ringkasan cepat untuk produksi:

```bash
# Backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache

# Frontend
npm ci
npm run build
npm start
```

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/ANALISIS.md`](docs/ANALISIS.md) | Kebutuhan, asumsi, arsitektur, keputusan teknis, alur status, risiko |
| [`docs/DATABASE.md`](docs/DATABASE.md) | ERD (Mermaid) dan spesifikasi setiap tabel |
| [`docs/API.md`](docs/API.md) | Kontrak API `/api/v1`: format respons, otorisasi, kode error |
| [`docs/OTENTIKASI.md`](docs/OTENTIKASI.md) | Autentikasi BFF: Sanctum PAT, cookie httpOnly, proteksi route |
| [`docs/PENGUJIAN.md`](docs/PENGUJIAN.md) | Strategi pengujian Tahap 8 dan temuan hardening |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment produksi dan checklist keamanan |

Format respons API (semua endpoint):

```json
{ "success": true, "message": "...", "data": { } }
```

```json
{ "success": false, "message": "Data yang dikirim tidak valid.", "errors": { "field": ["..."] } }
```

Pesan error API menggunakan Bahasa Indonesia, termasuk respons 429
(`"Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi."`).
Batasan laju: login 5 permintaan/menit per email+IP, registrasi 3/menit per IP.

---

## Status pengerjaan

- [x] **Tahap 1** — Analisis dan fondasi
- [x] **Tahap 2** — Setup backend Laravel 13 (migration, model, Sanctum, format respons)
- [x] **Tahap 3** — Setup frontend Next.js (Tailwind, shadcn, routing, layout, navigasi responsif)
- [x] **Tahap 4** — Autentikasi dan profil (BFF cookie httpOnly, proteksi route per role, login/register/profil)
- [x] **Tahap 5** — Pengajuan dan dokumen
- [x] **Tahap 6** — Verifikasi admin
- [x] **Tahap 7** — Notifikasi, pencarian, dan laporan
- [x] **Tahap 8** — Pengujian dan hardening
- [x] **Tahap 9** — Dokumentasi dan deployment

### Status produksi (per 20 Oktober 2026)

| Komponen | Status | Keterangan |
|---|---|---|
| Repo | ✅ | `github.com/Valzien/LPTI-ISBN` (monorepo, branch `main`) |
| Backend | ✅ live | Render (Docker), health check `/up` → **200** |
| Frontend | ✅ live | Vercel, Root Directory `frontend`, `API_URL` → backend Render |
| Database | ✅ live | Neon Postgres, branch `production`, 10 tabel + 4 persyaratan ter-seed |

Verifikasi end-to-end yang sudah dijalankan: migrasi 10 tabel di Neon,
`register` → `login` → `GET /me` sukses (tulis + baca Neon), `GET
/api/v1/document-requirements` mengembalikan 4 baris, `php artisan test`
**160/160 lulus**, `next build` sukses (27 rute).

**Catatan lingkungan nyata:**

- **Jaringan kampus memblokir `*.vercel.app`** — link publik bisa gagal
  dibuka di WiFi kampus/instansi (bukan bug aplikasi). Pakai hotspot seluler,
  aktifkan Secure DNS (DoH), atau pasang domain sendiri.
- Akun di produksi dibuat dari environment Render: `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` (`super_admin`) via `AdminUserSeeder`. Verifikator (`admin`)
  dan pemohon tambahan dibuat lewat UI `/admin/pengguna/baru` (khusus
  `super_admin`) atau registrasi mandiri di `/register`.
- Dokumen terunggah di instance Render **gratis** bersifat *ephemeral*
  (hilang saat restart/redeploy) — lihat `docs/DEPLOYMENT.md` §9.5.

---

## Lisensi dan kepatuhan

Proyek ini dikembangkan sebagai sistem pengelolaan pengajuan ISBN internal.
Penggunaan nama atau atribut yang menyerupai instansi pemerintah tidak
dimaksudkan sebagai klaim afiliasi. Untuk penerbitan ISBN yang sah, ikuti
prosedur resmi yang berlaku di Indonesia.
