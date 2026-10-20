# Autentikasi LPTI-ISBN — Sanctum, Cookie, CSRF, CORS, dan Domain

Dokumen ini menjelaskan konfigurasi autentikasi LPTI-ISBN (Tahap 4) dari sisi
backend Laravel maupun frontend Next.js, beserta alasan keputusan arsitektur
yang diambil pada Tahap 1 §3.2 (BFF — *Backend for Frontend*).

## 1. Arsitektur Ringkas

```
Browser ──► Next.js (Server Component / Server Action / Route Handler)
                │  cookie httpOnly: lpti_isbn_token (token tidak pernah
                │  dikirim ke browser / tidak bisa dibaca JavaScript)
                ▼
         Laravel /api/v1  ◄── Authorization: Bearer <Sanctum PAT>
```

- Browser **hanya** berbicara dengan origin Next.js (localhost:3000).
- Panggilan ke Laravel dilakukan **server-to-server** oleh Next.js, membawa
  token Sanctum dari cookie httpOnly.
- Konsekuensi: token tidak pernah ada di payload RSC, tidak tersimpan di
  `localStorage`, dan tidak dapat dicuri skrip lintas-site (XSS).

## 2. Laravel Sanctum — Personal Access Token (PAT)

Backend memakai **Sanctum Personal Access Token**, bukan *stateful SPA
cookie*:

| Aspek | PAT (dipakai) | Stateful SPA cookie |
| --- | --- | --- |
| Kredensial | `Authorization: Bearer <token>` | Cookie sesi web + `XSRF-TOKEN` |
| Pihak yang memanggil Laravel | Server Next.js saja | Browser langsung (lintas origin) |
| Butuh CORS stateful & CSRF cookie | Tidak | Ya |
| Logout | `currentAccessToken()->delete()` (token dicabut) | Hapus sesi server |

Alasan pemilihan PAT: konsisten dengan arsitektur BFF (browser tidak
pernah menyentuh Laravel), sederhana, dan logout benar-benar mencabut token
(telah diuji: token lama setelah logout → 401).

Endpoint autentikasi (`routes/api.php`, prefix `/api/v1`):

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/api/v1/register` | Registrasi pemohon — role `applicant` di-set eksplisit, bukan mass-assignment |
| POST | `/api/v1/login` | Login — rate limit **5/menit per email+IP** |
| POST | `/api/v1/logout` | Revoke token aktif |
| GET | `/api/v1/me` | Ambil user dari token |
| PUT | `/api/v1/me` | Perbarui profil (name, phone, applicant_type, publisher_name, address) |

Registrasi memiliki rate limit **3/menit per IP** (AppServiceProvider).

## 3. Cookie Sesi Frontend

| Atribut | Nilai | Alasan |
| --- | --- | --- |
| Nama | `lpti_isbn_token` | Konstan di `lib/constants.ts` |
| `httpOnly` | `true` | Tidak dapat dibaca JavaScript (anti-XSS) |
| `sameSite` | `lax` | Tetap dikirim pada navigasi top-level, blokir CSRF cross-site |
| `secure` | `true` hanya saat `NODE_ENV=production` | Development tetap jalan tanpa HTTPS |
| `path` | `/` | Berlaku untuk seluruh aplikasi |
| `maxAge` | 7 hari | Sesi otomatis kedaluwarsa |

Kode terkait:

- `lib/constants.ts` — definisi nama cookie (aman dipakai `proxy.ts`).
- `lib/api.ts` — `getToken()` membaca cookie via `next/headers`, `apiFetch()`
  menyematkannya sebagai `Authorization: Bearer` (server-only).
- `lib/actions.ts` (`"use server"`) — `loginAction`, `registerAction`
  menulis cookie; `logoutAction` menghapusnya. Hanya Server Action/Route
  Handler yang boleh menulis cookie (keterbatasan platform Next.js).
- `app/api/auth/{login,register,logout,me,session}/route.ts` — endpoint JSON
  BFF (kebutuhan klien di Tahap 5+, mis. pengecekan sesi dari Client
  Component).
- `lib/session.ts` — `getCurrentUser()`; `null` bila tidak ada token,
  token kedaluwarsa/dicabut, atau backend bermasalah.
- `lib/auth.ts` — guard: `requireAuth()`, `requireRoles()`,
  `requireApplicant()`, `requireAdmin()` (menggunakan `redirect()`).

## 4. CSRF

- Route `/api/v1` memakai guard token (`auth:sanctum` via Bearer) sehingga
  **stateless dan tidak memerlukan token CSRF** — permintaan dibuat oleh
  server Next.js, bukan browser, sehingga tidak ada ambiguitas asal.
- Browser hanya memanggil origin Next.js (situs sendiri, SameSite=Lax);
  Server Action Next.js sendiri dilindungi *Action ID* + validasi `Origin`
  bawaan framework.
- `ValidateCsrfToken` / `sanctum/csrf-cookie` **tidak** dipakai pada alur ini.
  Bila kelak beralih ke Sanctum stateful cookie, keduanya menjadi wajib —
  tetapi itu berarti browser memanggil Laravel langsung dan mengubah
  arsitektur BFF (di luar scope proyek).

## 5. CORS

Konfigurasi default framework (`vendor/laravel/framework/config/cors.php`,
file `config/cors.php` belum dipublish):

```php
'paths'              => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins'    => ['*'],
'supports_credentials' => false,
```

- Dengan arsitektur BFF, permintaan lintas-origin hanya terjadi **di dalam
  server** (fetch Node.js ↔ Laravel) dan tidak tunduk pada CORS, sehingga
  konfigurasi di atas tidak menjadi risiko keamanan.
- `allowed_origins => ['*']` diperbolehkan karena API memverifikasi token
  (tanpa kredensial cookie). **Jangan** mengaktifkan
  `supports_credentials => true` bersama `origins => '*'`.
- Bila suatu saat ada klien browser lain yang perlu mengakses API langsung:
  publish `config/cors.php` (`php artisan config:publish cors`), batasi
  `allowed_origins` ke domain resmi, dan pertahankan verifikasi token.

## 6. Domain & Environment

| Variabel | Nilai dev | Keterangan |
| --- | --- | --- |
| `API_URL` (frontend/.env.local) | `http://localhost:8000` | Hanya dibaca server; di production pakai URL internal (jangan diekspos ke publik bila memungkinkan) |
| `SANCTUM_STATEFUL_DOMAINS` (backend) | default: `localhost,localhost:3000,...` | Hanya relevan untuk mode stateful (tidak dipakai alur PAT) |
| Frontend | `http://localhost:3000` | Origin tunggal yang diakses browser |
| Backend | `http://127.0.0.1:8000` | `php artisan serve` |

Production (Tahap 9): wajib HTTPS agar cookie `Secure` berlaku; `APP_DEBUG=false`
di backend agar error 500 tidak membocorkan detail internal.

## 7. Proteksi Route (Next.js 16)

Dua lapis, sesuai panduan Next bahwa proxy hanya untuk *optimistic check*:

1. **`proxy.ts`** — hanya mengecek **keberadaan** cookie `lpti_isbn_token`
   untuk `/dashboard`, `/pengajuan`, `/profil`, `/admin`. Tamu diarahkan ke
   `/login?redirect=<path-asal>`.
2. **Guard server** (validasi token ke backend + role):
   - Layout `(pemohon)` → `requireAuth()`
   - Halaman `/dashboard`, `/pengajuan` → `requireApplicant()`
   - Layout `(admin)` → `requireAdmin()` (admin + super_admin)
   - Halaman `/admin` (verifikasi) → `requireAdmin()` (defense in depth)
   - `/profil` → `requireAuth()` (role apa pun)
   - `/login`, `/register` → bila sesi ada, redirect sesuai role
   - Redirect ditujukan: `?redirect=` divalidasi hanya path internal
     (awalan `/`, bukan `//`, tanpa `:`) — mencegah open redirect.
   - Tujuan bawaan berdasar role: `applicant → /dashboard`,
     `admin`/`super_admin → /admin`.

## 8. Hasil Uji Hak Akses Setiap Role

Smoke test otomatis (`smoke_tahap4.py`) — **28/28 PASS**, ditambah pengujian
role `admin`:

| Role (akun demo) | /login | /dashboard | /profil | /admin |
| --- | --- | --- | --- | --- |
| Tamu (tanpa sesi) | 200 | 307 → `/login?redirect=%2Fdashboard` | 307 → `/login?redirect=%2Fprofil` | 307 → `/login?redirect=%2Fadmin` |
| `applicant` (pemohon1) | 307 → `/dashboard` | 200 | 200 | 307 → `/dashboard` |
| `admin` (verifikator1) | 307 → `/admin` | 307 → `/admin` | 200 | 200 |
| `super_admin` (admin.utama) | 307 → `/admin` | 307 → `/admin` | — | 200 |

Poin uji lain yang lulus: login salah → 401 + pesan Bahasa Indonesia; cookie
`HttpOnly + SameSite=Lax` terpasang; registrasi baru 201 + sesi langsung;
email duplikat → 422 `errors`; logout 200 + token lama → 401; rate limit
login percobaan ke-6 → 429.
