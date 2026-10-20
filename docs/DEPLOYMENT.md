# Deployment (Produksi)

Dokumen ini menjelaskan cara men-deploy **LPTI-ISBN** ke lingkungan produksi:
backend Laravel 13 + MySQL 8 di satu host/domain, frontend Next.js 16 di
host/domain lain, dengan seluruh komunikasi browser melalui BFF (Server Actions
dan Route Handlers) sehingga token API tidak pernah menyentuh browser.

> **Pengingat kepatuhan.** LPTI-ISBN adalah sistem pengelolaan pengajuan ISBN,
> **bukan** portal resmi Perpustakaan Nasional RI. Jangan menampilkan logo
> instansi pemerintah, jangan mengklaim integrasi resmi, dan jangan
> men-generate nomor ISBN secara otomatis. Nomor ISBN hanya dicatat manual oleh
> admin setelah sah ditetapkan pihak berwenang.

## 1. Topologi yang diasumsikan

```text
                       HTTPS
  Peramban  ─────────────────────────▶  Frontend (Next.js :3000)
     │                                        │
     │  hanya cookie httpOnly                 │  server-side fetch (API_URL)
     │  lpti_isbn_token                       ▼
     └──────────────────────────▶  Backend (Laravel :8000, /api/v1)
                                              │
                                              ▼
                                        MySQL 8
                                        storage/app/private  ← dokumen PRIVAT
```

Konsekuensi penting dari topologi ini:

- **Browser tidak pernah memanggil API langsung.** Karena itu tidak ada
  preflight CORS dan `config/cors.php` memang tidak dipakai; jangan menambahkan
  header CORS longgar hanya karena "terlihat perlu".
- **Cookie sesi bersifat same-site terhadap domain frontend**, bukan terhadap
  domain backend. Karena itu `SANCTUM_STATEFUL_DOMAINS` hanya relevan bila Anda
  mengaktifkan mode SPA stateful — pada arsitektur BFF di proyek ini autentikasi
  memakai **Personal Access Token** yang disimpan di cookie httpOnly, dan token
  dikirim sebagai `Authorization: Bearer` dari sisi server.
- **Dokumen pemohon tetap privat** karena hanya backend yang membacanya dari
  `storage/app/private`, bukan web server.

## 2. Deployment backend (Laravel 13)

### 2.1 Prasyarat server

- PHP >= 8.3 dengan ekstensi `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`,
  `ctype`, `json`, `tokenizer`, `xml`, `curl`.
- Composer 2.
- MySQL 8 (atau MariaDB 10.6+) dengan kolom `utf8mb4`.
- Web server (Nginx/Apache) dengan document root diarahkan ke
  `backend/public` — **bukan** ke root `backend/`.

### 2.2 Langkah deploy

```bash
cd /var/www/lpti-isbn/backend

# 1. Dependensi produksi saja, tanpa dev
composer install --no-dev --optimize-autoloader

# 2. Konfigurasi
cp .env.example .env
php artisan key:generate

# 3. Isi .env produksi (lihat bagian 4), lalu:
php artisan migrate --force
php artisan db:seed --force          # opsional: hanya untuk akun demo
php artisan storage:link             # hanya bila perlu akses publik lain

# 4. Cache konfigurasi & rute (wajib di produksi)
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 2.3 Izin berkas

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod 775 {} \;
sudo find storage bootstrap/cache -type f -exec chmod 664 {} \;
```

Direktori `storage/app/private` menyimpan dokumen pemohon. **Jangan** pernah
mengarahkan web server langsung ke direktori ini, dan jangan memindahkannya ke
`storage/app/public`.

### 2.4 Contoh blok Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.lpti-isbn.example.id;

    root /var/www/lpti-isbn/backend/public;
    index index.php;

    client_max_body_size 8M;    # selaras dengan batas unggah dokumen (4 MB + ruang multipart)

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
```

### 2.5 Antrean & penjadwalan

Notifikasi in-app disimpan langsung di database, tetapi antrean tetap
dikonfigurasi (`QUEUE_CONNECTION=database`) agar aman bila fitur antrean
ditambahkan kelak.

```bash
sudo -u www-data php artisan queue:work --tries=3 --timeout=90
# supervisor: restart otomatis, jalankan minimal satu worker
```

## 3. Deployment frontend (Next.js 16)

### 3.1 Build produksi

```bash
cd /var/www/lpti-isbn/frontend
npm ci
npm run build            # next build (Turbopack)
```

### 3.2 Menjalankan

```bash
# PM2
pm2 start npm --name lpti-isbn-frontend -- start
pm2 save

# atau systemd unit sederhana
```

```ini
[Unit]
Description=LPTI-ISBN Frontend (Next.js)
After=network.target

[Service]
WorkingDirectory=/var/www/lpti-isbn/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

`npm start` menjalankan `next start` pada port 3000. Arahkan reverse proxy
(Nginx) domain publik ke port ini, jangan ekspos langsung.

### 3.3 Variabel lingkungan frontend

Frontend hanya memerlukan satu variabel di produksi (lihat `.env.example`):

```env
API_URL=https://api.lpti-isbn.example.id
```

Karena `API_URL` dibaca di sisi server, **jangan** memberi prefix `NEXT_PUBLIC_`
— prefix itu akan membocorkan alamat internal ke bundle browser.

## 4. Variabel lingkungan produksi (.env backend)

Nilai wajib diubah dari default pengembangan:

| Variabel | Nilai produksi | Alasan |
|---|---|---|
| `APP_ENV` | `production` | Menonaktifkan perilaku debug |
| `APP_DEBUG` | `false` | **Wajib** — mencegah stack trace & isi `.env` bocor ke respons API |
| `APP_KEY` | hasil `php artisan key:generate` | Enkripsi sesi/cookie |
| `APP_URL` | `https://api.lpti-isbn.example.id` | Basis URL & tautan |
| `LOG_LEVEL` | `warning` | Hindari log berisi data pribadi |
| `DB_*` | kredensial MySQL produksi | Jangan pakai `root` tanpa password |
| `SESSION_SECURE_COOKIE` | `true` (via HTTPS) | Cookie hanya lewat HTTPS |
| `SANCTUM_STATEFUL_DOMAINS` | domain frontend, mis. `lpti-isbn.example.id` | Hanya bila memakai mode SPA stateful |
| `MAIL_MAILER` | `log` (default) atau SMTP bila diaktifkan | Email sengaja tidak diaktifkan pada versi ini |
| `QUEUE_CONNECTION` | `database` | Konsisten dengan worker |

> **Catatan** — `backend/.env.example` sengaja memakai placeholder
> (`APP_KEY=` kosong, `DB_PASSWORD=` kosong) dan **tidak** memuat
> `SANCTUM_STATEFUL_DOMAINS`. Pada arsitektur BFF proyek ini token dikirim
> sebagai Bearer dari sisi server, sehingga autentikasi tidak bergantung pada
> daftar domain stateful.

## 5. Migrasi dan seeder

```bash
# Produksi: jalankan tanpa interaksi
php artisan migrate --force

# Melihat status tanpa mengubah apa pun
php artisan migrate:status

# Seeder demo (akun contoh, password 'password') — HANYA untuk staging/demo
php artisan db:seed --force
```

Seeder membuat enam akun fiktif (`admin.utama@example.com` sebagai
`super_admin`, dua verifikator `admin`, dan tiga pemohon) beserta empat
persyaratan dokumen. **Jangan** menjalankan seeder akun demo di produksi nyata:
ganti password atau hapus akun tersebut sebelum go-live.

Perintah yang aman diulang: `DocumentRequirementSeeder` **dilewati** bila tabel
`sudah terisi` (tidak menggandakan baris dan tidak menimpa konfigurasi yang
sudah diedit admin), dan `AdminUserSeeder` membuat akun `super_admin` dari
`ADMIN_EMAIL`/`ADMIN_PASSWORD` tanpa pernah menimpa akun yang sudah ada.
Keduanya dijalankan otomatis oleh `backend/docker/entrypoint.sh` pada setiap
container start (lihat bagian 9).

## 6. Checklist keamanan sebelum produksi

- [ ] `APP_DEBUG=false` dan `APP_ENV=production` (uji: respons 500 tidak memuat
      stack trace maupun isi `.env`).
- [ ] `APP_KEY` unik dan tidak dibagikan antar lingkungan.
- [ ] HTTPS aktif di kedua domain; HTTP dialihkan (301) ke HTTPS.
- [ ] Cookie `lpti_isbn_token` dikirim dengan flag `Secure` + `HttpOnly`
      (otomatis karena `NODE_ENV=production`).
- [ ] Header keamanan frontend aktif (`X-Content-Type-Options: nosniff`,
      `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`) — sudah
      dikonfigurasi di `frontend/next.config.ts`.
- [ ] `storage/app/private` **tidak** dapat diakses langsung via URL (uji dengan
      mengakses path berkasnya — harus 404/403).
- [ ] Kredensial MySQL produksi bukan `root` tanpa password; user DB hanya punya
      hak pada database `lpti_isbn`.
- [ ] Akun demo dihapus atau passwordnya diganti.
- [ ] `config:cache`, `route:cache`, `view:cache` dijalankan setelah `.env` final.
- [ ] Rate limit aktif: login 5/menit per email+IP, registrasi 3/menit per IP
      (uji: permintaan berulang mengembalikan 429 berbahasa Indonesia).
- [ ] Worker antrean berjalan dengan supervisor.
- [ ] Backup harian database + `storage/app/private` dan uji restore.
- [ ] Teks disclaimer "bukan portal resmi Perpusnas" masih tampil di halaman
      publik.
- [ ] Nomor ISBN hanya dapat dicatat manual oleh admin dari status
      `approved_for_processing` (uji cepat di staging).
- [ ] `npm run build` sukses dan `npm run start` berjalan tanpa galat runtime.
- [ ] `php artisan test --compact` lulus di lingkungan CI/staging.

## 7. Setelah deploy: verifikasi cepat

```bash
# Backend hidup & sehat
curl -s -o /dev/null -w "%{http_code}\n" https://api.lpti-isbn.example.id/up

# Endpoint terlindungi tanpa token harus 401 berbahasa Indonesia
curl -s -H "Accept: application/json" https://api.lpti-isbn.example.id/api/v1/submissions

# Frontend
curl -s -o /dev/null -w "%{http_code}\n" https://lpti-isbn.example.id/
curl -s -o /dev/null -w "%{http_code}\n" https://lpti-isbn.example.id/dashboard   # harus redirect ke /login

# Header keamanan
curl -sI https://lpti-isbn.example.id/login | grep -i "x-frame-options\|x-content-type-options"
```

Uji manual paling penting: login sebagai pemohon → buat draft → unggah dokumen →
ajukan; lalu login sebagai verifikator → ubah status → catat nomor ISBN. Setelah
itu coba akses dokumen pemohon lain dengan pemohon berbeda: harus **404**.

## 8. Rollback

```bash
# Backend
php artisan down --secret="token-rahasia"   # maintenance mode
git -C /var/www/lpti-isbn checkout <tag-sebelumnya>
composer install --no-dev --optimize-autoloader
php artisan migrate:rollback --step=1       # hanya bila migrasi terakhir aman dibalik
php artisan config:cache && php artisan route:cache
php artisan up

# Frontend
git -C /var/www/lpti-isbn checkout <tag-sebelumnya>
npm ci && npm run build
pm2 restart lpti-isbn-frontend
```

Selalu cadangkan database sebelum `migrate:rollback`, terutama pada migrasi yang
menghapus kolom.

## 9. Jalur deployment proyek ini: Vercel + Render (Docker) + Neon

Bagian 1–8 mengasumsikan VPS mandiri. Implementasi nyata Tahap 9 memakai
jalur terkelola gratis/berbayar ringan: **satu repo monorepo**, frontend di
**Vercel**, backend Laravel ber-**Docker** di **Render**, dan PostgreSQL
gratis dari **Neon**. Checklist keamanan bagian 6 dan verifikasi bagian 7 tetap
berlaku.

### 9.1 Topologi

```text
                   HTTPS                     HTTPS (server-side fetch)
 Peramban ──────────────────▶ Vercel ─────────────────────▶ Render
              hanya cookie        │  Next.js BFF             │  Laravel (Docker,
              httpOnly            │  Server Actions          │  PHP CLI server di $PORT)
                                  │  (token tak pernah       │
                                  │   sampai ke browser)     ▼
                                                   Neon Postgres (pgsql, sslmode=require)
                                                   + storage/app/private (lihat 9.4)
```

### 9.2 Repo GitHub (monorepo)

- Satu repo berisi `frontend/`, `backend/`, dan `docs/`.
- `.gitignore` di root serta di tiap aplikasi menjaga `.env`, `vendor/`,
  `node_modules/`, dan `.next/` tidak ikut ter-commit.
- `backend/storage/app/private/.gitignore` berisi `*` — dokumen pemohon
  **tidak pernah** masuk repo.
- `backend/.dockerignore` menjaga `.env` lokal tidak masuk ke image.

### 9.3 Database Neon (Postgres, gratis)

Proyek ini sudah terhubung ke Neon lewat **Neon CLI** (butuh Node.js ≥ 20):

```bash
npm i -g neon
neon login            # autentikasi via browser (sekali)
neon env pull         # tarik nilai koneksi ke root .env.local
neon config plan      # pratinjau perubahan policy pada neon.ts
neon deploy           # terapkan policy + refresh .env.local
```

1. `neon env pull` mengisi root **`.env.local`** (di-gitignore) dengan
   `DATABASE_URL` (endpoint **pooled**, host `-pooler`) dan
   `DATABASE_URL_UNPOOLED` (**direct**). Nilai itu di-*wire* ke
   `backend/.env` (blok `DB_*`) memakai **endpoint direct** —
   konfigurasi di sana sudah terisi sebagai contoh.
2. **Wajib direct, bukan pooled.** Percobaan nyata membuktikan
   `php artisan migrate` lewat endpoint `-pooler` gagal di tengah transaksi
   (`SQLSTATE[25P02]: In failed sql transaction ...`). Karena itu `DB_HOST`
   diarahkan ke endpoint direct, dan `backend/docker/entrypoint.sh` tetap
   memaksa koneksi direct (`DATABASE_URL_UNPOOLED`) bila variabel itu
   tersedia di environment container.
3. Proyek sudah portabel ke Postgres: migrasi tidak memakai SQL khusus MySQL,
   pencarian memakai `LOWER(...) LIKE LOWER(?)` (bukan `LIKE` polos yang
   case-sensitive di Postgres), dan driver `pgsql` sudah ada di `config/database.php`
   lengkap dengan `DB_SSLMODE` (set `DB_SSLMODE=require` di Render).
4. Migrasi dijalankan otomatis entrypoint container
   (`php artisan migrate --force`) — tidak perlu menjalankan apa pun secara
   manual di Neon. Skill agen `neon-postgres` (terpasang di
   `.agents/skills/`, lihat `skills-lock.json`) menyimpan panduan praktik
   terbaiknya.

### 9.4 Backend di Render (Docker)

1. Dashboard Render → **New → Web Service** → sambungkan repo GitHub.
2. Pengaturan service:
   - **Runtime**: Docker
   - **Root Directory**: `backend` (Render memakai folder ini sebagai konteks
     build Docker — lihat <https://render.com/docs/monorepo-support>)
   - **Dockerfile Path**: `Dockerfile` (default; relatif terhadap Root Directory)
   - **Health Check Path**: `/up`
   - **Instance Type**: `Free` untuk demo (putus 15 menit setelah idle, start
     ulang ±1 menit) atau `Starter` bila butuh persistent disk.
3. Environment variables:

   | Kunci | Nilai |
   |---|---|
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | `php artisan key:generate --show` (sekali, jangan commit) |
   | `APP_URL` | `https://<nama-service>.onrender.com` |
   | `APP_LOCALE` | `id` |
   | `LOG_LEVEL` | `warning` |
   | `SESSION_DRIVER` | `database` |
   | `SESSION_SECURE_COOKIE` | `true` |
   | `QUEUE_CONNECTION` | `database` |
   | `CACHE_STORE` | `database` |
   | `FILESYSTEM_DISK` | `local` |
   | `MAIL_MAILER` | `log` |
   | `DB_CONNECTION` | `pgsql` |
   | `DB_HOST` | host Neon (`ep-xxx.aws.neon.tech`) |
   | `DB_PORT` | `5432` |
   | `DB_DATABASE` | `neondb` |
   | `DB_USERNAME` | user Neon |
   | `DB_PASSWORD` | password Neon |
   | `DB_SSLMODE` | `require` |
   | `ADMIN_EMAIL` | email super_admin produksi |
   | `ADMIN_PASSWORD` | password kuat (bukan demo!) |
   | `ADMIN_NAME` | opsional, default `Admin Utama LPTI` |
   | `TRUSTED_PROXIES` | opsional — lihat catatan 9.6 |

   > `DB_HOST` harus **endpoint direct** Neon (`ep-xxx.aws.neon.tech` tanpa
   > `-pooler`), diambil dari `DATABASE_URL_UNPOOLED` hasil `neon env pull`
   > (lihat 9.3). Endpoint pooled untuk DDL justru gagal.

4. Deploy pertama: entrypoint (`backend/docker/entrypoint.sh`) otomatis:
   direktori runtime → `config:cache`/`route:cache`/`view:cache` →
   `migrate --force` → seed persyaratan (hanya bila tabel kosong) + akun admin
   (idempoten) → `php artisan serve` di `$PORT`.
5. **Catatan penyimpanan**: container Render bersifat **ephemeral** —
   dokumen terunggah di `storage/app/private` **hilang** saat redeploy/restart
   pada instance gratis. Untuk persistensi: instance berbayar + **Persistent
   Disk** dengan mount path `/app/storage/app/private` (entrypoint membuat
   ulang direktori bila mount mengosongkan path tersebut).

### 9.5 Frontend di Vercel

1. <https://vercel.com> → **Add New → Project** → import repo GitHub yang sama.
2. **Settings → General → Root Directory**: isi `frontend` (wajib — repo
   bersifat monorepo).
3. **Settings → Environment Variables**: `API_URL=https://<nama-service>.onrender.com`
   (tanpa prefix `NEXT_PUBLIC_` — hanya dibaca server/BFF).
4. Deploy. `next build` terdeteksi otomatis; hasil build 27 rute.
5. Karena pola BFF (`docs/OTENTIKASI.md`), browser hanya bicara dengan origin
   Vercel → **tidak perlu CORS** antar domain. Cookie `lpti_isbn_token` otomatis
   `Secure` di produksi (`NODE_ENV=production`).

### 9.6 Catatan perilaku di balik proxy (IP & rate limit)

Render berada di balik proxy/edge, sehingga `Request::ip()` menunjukkan IP
proxy kecuali diberi tahu sebaliknya. `backend/bootstrap/app.php` mendukung
`TRUSTED_PROXIES` (default: **tidak mempercayai** proxy apa pun, agar klien
tidak dapat memalsukan IP lewat header `X-Forwarded-For`):

- Bila kolom IP pada audit log menunjukkan IP yang sama untuk semua user
  **dan** rate limit registrasi (3/menit per IP) terasa menghalangi user
  sah, set `TRUSTED_PROXIES='*'` lalu redeploy. Trade-off: header
  `X-Forwarded-For` pertama bisa dipalsukan klien yang jahil.
- Untuk produksi sungguhan, lebih baik isi daftar IP proxy yang spesifik
  (pisahkan dengan koma).

### 9.7 Verifikasi pasca-deploy

Ikuti checklist bagian 6–7, ditambah poin spesifik:

1. `GET https://<backend>/up` → **200**.
2. `GET https://<backend>/api/v1/submissions` tanpa token → **401** berbahasa Indonesia.
3. `https://<frontend>/` → 200; `/dashboard` → redirect `/login`.
4. Login `ADMIN_EMAIL` → `/admin` terbuka; **tidak** ada akun demo di produksi.
5. Registrasi pemohon → draft → unggah PDF ±3,9 MB → sukses; file >4 MB →
   422 berbahasa Indonesia (batas `document_requirements`, server action
   4,2 MB di `next.config.ts`, dan limit platform Vercel 4,5 MB saling selaras).
6. Ulangi registrasi 4× dalam 1 menit → percobaan ke-4 → **429** berbahasa Indonesia.
7. Dengan `APP_DEBUG=false`, picu error 500 → respons tanpa stack trace.

### 9.8 Status implementasi (per 20 Oktober 2026)

| Item | Status |
|---|---|
| Neon project/branch | ✅ `production` (endpoint **direct**) — 10 tabel + 4 persyaratan |
| Render backend (Docker) | ✅ live, `/up` → 200 |
| Vercel frontend | ✅ live, `API_URL` → Render |
| Kredensial produksi | ada di root `.env.render-vercel` (ter-*gitignore*) |
| Skill agen Neon | ✅ `.agents/skills/neon-postgres/` + `skills-lock.json` |

**Kendala nyata yang ditemukan:**

1. Migrasi via endpoint `-pooler` gagal (`SQLSTATE[25P02]`) → semua koneksi
   dialihkan ke endpoint **direct**.
2. `APP_URL` berisi placeholder bertanda kurung siku (`https://[GANTI].onrender.com`)
   membuat **seluruh** perintah artisan gagal dengan `Invalid URI: Host is malformed`
   (kurung siku = sintaks host IPv6 di Symfony). Selalu pakai domain polos.
3. Firewall WiFi kampus memblokir `*.vercel.app` — link publik gagal dibuka di
   jaringan tersebut (bukan masalah deployment).

**Rencana berikutnya (belum dikerjakan):**

- [ ] `/` otomatis redirect: belum login → `/login`, sudah login → `/dashboard`
      (keputusan lokasi landing page publik masih menggantung).
- [ ] Tambah akun 1 per role di produksi (verifikator via `/admin/pengguna/baru`).
- [ ] Opsional: domain sendiri untuk menghindari blokir `*.vercel.app`.
- [ ] Opsional: Persistent Disk Render agar dokumen unggahan tidak hilang.
- [ ] Opsional: upgrade ESLint (sisa peringatan *deprecated* saat build Vercel).

## 10. Rollback di Render & Vercel

- **Render**: Dashboard service → Deploys → pilih deploy sehat → **Rollback**
  (atau **Redeploy previous commit**). Migrasi balik tetap manual
  (`migrate:rollback`) dan hanya bila aman.
- **Vercel**: Dashboard project → Deployments → pilih yang sehat →
  **Promote to Production**.
