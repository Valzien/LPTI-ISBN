# LPTI-ISBN — Kontrak API (v1)

Base URL: `http://localhost:8000/api/v1` (development).
Prefix: `/api/v1`. Seluruh endpoint memakai JSON (kecuali unggah multipart
dan unduhan dokumen). Dokumen lain: [`ANALISIS.md`](ANALISIS.md),
[`DATABASE.md`](DATABASE.md).

---

## 1. Format Respons (standar)

### Sukses
```json
{
  "success": true,
  "data": { ... },
  "meta": { "message": "optional human-readable info" }
}
```
`meta` opsional; untuk daftar berpaginasi:
```json
{
  "success": true,
  "data": [ ...items ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 73
  }
}
```

### Gagal
```json
{
  "success": false,
  "message": "Ringkasan error yang aman ditampilkan ke user.",
  "errors": { "field": ["Pesan per-field dari validasi."] }
}
```
- `errors` hanya ada untuk error validasi (422).
- `message` **tidak pernah** memuat stack trace, token, kredensial, atau detail internal (production).

### Kode HTTP
| Kode | Makna |
|---|---|
| 200 | Sukses (GET/PUT/PATCH/aksi ringan) |
| 201 | Resource dibuat |
| 204 | Sukses tanpa konten (DELETE) |
| 400 | Request tidak valid secara semantik |
| 401 | Belum login / token kedaluwarsa |
| 403 | Berlogin tetapi tidak berhak / aksi transisi tidak diizinkan |
| 404 | Resource tidak ada atau bukan milik pemohon (anti-enumeration) |
| 409 | Konflik state (mis. unggah saat status terkunci) |
| 422 | Validasi gagal |
| 429 | Rate limit terlampaui |
| 500 | Kesalahan server (pesan generik di production) |

---

## 2. Otorisasi

| Kelompok | Cara |
|---|---|
| Publik | Tanpa token |
| Pemohon | `Authorization: Bearer <token>` (Sanctum) — role `applicant` |
| Admin | `Authorization: Bearer <token>` — role `admin` atau `super_admin` |

Catatan frontend: token **hanya** disimpan & dibaca oleh server Next.js dalam
cookie httpOnly (pola BFF, [`ANALISIS.md` §3.2](ANALISIS.md)); browser tidak
pernah menerima token.

Rate limiting: `login`, `register`, `forgot-password` memakai limiter ketat
(5–10 menit / percobaan per IP+email). Endpoint lain memakai limiter default.

---

## 3. Endpoint

### 3.1 Autentikasi — publik/terautentikasi
| Method & Path | Akses | Keterangan |
|---|---|---|
| `POST /register` | publik | Registrasi pemohon. Body: `name, email, password, password_confirmation, phone?, applicant_type, publisher_name?, address?` |
| `POST /login` | publik | Body: `email, password`. Rate limited. Return `data.token` (Sanctum) + `data.user` |
| `POST /logout` | auth | Cabut token aktif |
| `GET /me` | auth | Profil user aktif |
| `PUT /me` | auth | Update profil (nama, telepon, alamat, dsb.; role tidak bisa diubah sendiri) |
| `POST /forgot-password` | publik | Kirim reset link (opsional, butuh SMTP); rate limited |
| `POST /reset-password` | publik | Body: `token, email, password, password_confirmation` |

### 3.2 Pengajuan — pemohon (role `applicant`)
| Method & Path | Keterangan |
|---|---|
| `GET /submissions` | Daftar milik sendiri; filter `status`, `q` (judul/nomor/penulis), `date_from`, `date_to` (ISO); param `page` (default 10/halaman); respons `data` + `meta` (`current_page, last_page, per_page, total`) |
| `GET /submissions/stats` | Ringkasan milik sendiri: `total`, `by_status` (8 status), `unread_notifications` — dipakai dashboard pemohon |
| `POST /submissions` | Buat pengajuan baru → status `draft`; `submission_number` digenerate sistem; 403 bila role `admin`/`super_admin` |
| `GET /submissions/{id}` | Detail milik sendiri + relasi `documents`, `status_histories`, `status_label`, `is_editable` (404 bila bukan milik — anti-enumerasi, bukan 403) |
| `PUT /submissions/{id}` | **Update penuh (full replacement)** — seluruh field wajib dikirim seperti `POST` (422 bila ada field wajib hilang); hanya saat `draft`/`needs_revision` (409 bila terkunci) |
| `DELETE /submissions/{id}` | Hapus — hanya `draft` (hard delete + file); respons `204` |
| `POST /submissions/{id}/submit` | `draft` → `submitted`; 422 bila dokumen wajib belum lengkap (`errors.documents` = daftar nama dokumen) |
| `POST /submissions/{id}/resubmit` | `needs_revision` → `resubmitted` |
| `GET /submissions/{id}/history` | Riwayat status (timeline) milik sendiri |
| `POST /submissions/{id}/documents` | Unggah multipart: `file`, `document_requirement_id` — hanya `draft`/`needs_revision` |
| `DELETE /submissions/{id}/documents/{documentId}` | Hapus dokumen milik pengajuan — hanya `draft`/`needs_revision`; respons `204` |
| `GET /documents/{documentId}/preview` | Stream dokumen milik sendiri (di-stream ulang oleh proxy Next.js) |
| `GET /document-requirements` | Daftar **persyaratan dokumen aktif** (`name, description, is_required, allowed_mime_types, max_file_size`) — dipakai UI unggah pemohon |

> **Semantik error pengajuan:** 404 = bukan milik/tidak ada (seluruh endpoint
> milik pemohon anti-enumerasi); 403 = transisi status tidak sah atau role
> salah; 409 = status terkunci (bukan `draft`/`needs_revision`);
> 422 = validasi body atau dokumen belum lengkap; 204 = hapus sukses.
> Setiap transisi status dicatat ke histori + audit log.

### 3.3 Notifikasi — auth
| Method & Path | Keterangan |
|---|---|
| `GET /notifications` | Notifikasi milik sendiri, 15/halaman; filter `unread=1`. Item: `id, title, message, submission_id, submission_number, status, status_label, is_read, read_at, created_at` |
| `PATCH /notifications/{id}/read` | Tandai satu notifikasi sudah dibaca; **404** bila bukan milik sendiri/tidak ada (anti-enumerasi) |
| `PATCH /notifications/read-all` | Tandai semua notifikasi milik sendiri; respons `data.marked` = jumlah baris diperbarui |

> **Pembuatan otomatis:** setiap transisi status pengajuan membuat notifikasi
> database — `submitted`/`resubmitted` dikirim ke **seluruh admin**, transisi
> lain dikirim ke **pemilik pengajuan** (termasuk catatan revisi/alasan
> penolakan dan nomor ISBN yang dicatat). Kanal email tidak diaktifkan secara
> default; notifikasi dasbor adalah fitur inti.

### 3.4 Admin — role `admin`/`super_admin`
| Method & Path | Keterangan |
|---|---|
| `GET /admin/submissions` | Seluruh pengajuan; filter `status`, `q` (judul / nomor pengajuan / penulis / **nama pemohon** via relasi `user`), tanggal, `user_id` (422 bila tidak valid); berpaginasi — tiap item memuat `user` + `status_label` |
| `GET /admin/submissions/{id}` | Detail lengkap: data buku, profil pemohon, dokumen, histori |
| `POST /admin/submissions/{id}/start-review` | `submitted`/`resubmitted` → `under_review` |
| `POST /admin/submissions/{id}/request-revision` | `under_review` → `needs_revision`; body wajib `note` |
| `POST /admin/submissions/{id}/approve` | `under_review` → `approved_for_processing` |
| `POST /admin/submissions/{id}/reject` | `under_review` → `rejected`; body wajib `reason` |
| `POST /admin/submissions/{id}/record-isbn` | `approved_for_processing` → `isbn_assigned`; body wajib `isbn_number` (dinormalkan ke **digit-only** sebelum validasi format ISBN-10/13 & pengecekan unik — varian `978-602-…` dan `978602…` dianggap nomor sama), `isbn_assigned_at`, `isbn_source_note` |
| `PATCH /admin/documents/{documentId}/review` | Set `review_status` (`pending|approved|rejected`) + `admin_note` (`nullable`, maks 1000 karakter) |
| `GET /admin/documents/{documentId}/download` | Stream dokumen (terotorisasi) |
| `GET /admin/pemohon` | Daftar akun pemohon; filter `q` (nama/email), 15/halaman; tiap item memuat `submissions_count` |
| `GET /admin/reports/submissions` | Ringkasan laporan: `generated_at`, `filters`, `total`, `by_status` (8 status); filter `status`, `date_from`, `date_to` (422 bila status tidak dikenal atau rentang terbalik) |
| `GET /admin/reports/submissions.csv` | Ekspor CSV streaming (BOM UTF-8; attachment `laporan-pengajuan-YYYY-MM-DD.csv`) dengan filter yang sama. Kolom: nomor, judul, subjudul, penulis utama, penerbit, pemohon, status, ISBN, tanggal dibuat, diperbarui — **tanpa email, catatan internal, atau URL dokumen privat**; setiap ekspor dicatat sebagai `report.exported` |
| `GET /admin/audit-log` | Log audit 20/halaman; filter `action`, `actor_user_id`, `date_from`, `date_to`; item: `action`, `actor{id,name}`, `entity_type`, `entity_id`, `metadata`, `ip_address`, `created_at`; 422 bila aktor tidak ada/rentang terbalik |
| `GET /admin/document-requirements` | Seluruh persyaratan (aktif & nonaktif), urut `sort_order` |
| `POST /admin/document-requirements` | Body: `name` (unik), `description?`, `allowed_mime_types[]` (1–10, regex MIME), `max_file_size` (1024–4194304 byte), `is_required`, `is_active`, `sort_order` (0–999) |
| `PUT /admin/document-requirements/{id}` | Penggantian penuh dengan aturan yang sama |
| `DELETE /admin/document-requirements/{id}` | `204` sukses; **409** bila persyaratan sudah dipakai dokumen — nonaktifkan (`is_active=false`) alih-alih menghapus agar riwayat unggahan tetap utuh |
| `GET /admin/dashboard` | Statistik terhitung dari DB: `total`, `needs_check` (submitted + resubmitted), `under_review`, `needs_revision`, `finished` (isbn_assigned + rejected), `by_status` (8 status), `recent` (10 terbaru, tiap baris menyertakan `user`) |
| `GET/POST /admin/users`, `GET/PUT/DELETE /admin/users/{id}` | Manajemen akun — **hanya `super_admin`** (middleware + pemeriksaan di FormRequest/controller). `role` tidak pernah mass-assignable. `password` opsional saat `PUT` (kosong = tidak diubah). **403** mengubah role atau menghapus akun sendiri; **409** menghapus akun yang masih memiliki pengajuan atau menghapus admin utama terakhir |

> **Notifikasi transisi** (lihat §3.3) dipancarkan oleh service transisi
> tunggal yang sama dengan pencatatan audit, sehingga tidak ada jalur
> perubahan status yang melewatkan notifikasi.

> **Aturan transisi** semua endpoint `…/submit|resubmit|start-review|
> request-revision|approve|reject|record-isbn` divalidasi oleh peta transisi
> tunggal di backend (lihat [`ANALISIS.md` §4](ANALISIS.md)); pelanggaran
> menghasilkan **409/403**, bukan perubahan diam-diam.
>
> **Semantik error admin:** 401 = tanpa token; 403 = role bukan
> `admin`/`super_admin`, transisi tidak sah (pesan memuat `status saat ini: X`),
> atau panggilan lintas-peran (pemohon memanggil endpoint admin); 404 =
> pengajuan/dokumen tidak ada; 422 = validasi body (`note`/`reason` wajib,
> ISBN format tidak valid/terduplikasi). Peran admin seluruh endpoint di bawah
> prefix `admin` + middleware `admin` (dicek dua lapis: middleware & policy).

---

## 4. Unggah Dokumen (multipart)

- `Content-Type: multipart/form-data`, field `file` + `document_requirement_id`.
- Validasi **di backend**: MIME nyata (guesser), ekstensi whitelist dari
  requirement, ukuran <= `max_file_size` requirement (juga <= batas global
  4 MB).
- Nama file disimpan sebagai UUID; nama asli hanya di metadata.
- Respons sukses `201` berisi metadata dokumen (`id, original_filename,
  mime_type, file_size, review_status, uploaded_at`).

---

## 5. Catatan Konfigurasi Sanctum (untuk Tahap 4)

Pola BFF yang dipilih (lihat [`ANALISIS.md` §3.2](ANALISIS.md)) memakai
**personal access token**, sehingga tidak ada kebutuhan stateful-domain/CORS
lintas origin di development — browser hanya bicara ke Next.js. Bila kelak
dipilih pola stateful cookie (satu root domain), konfigurasi yang perlu
disetel: `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, CORS
`supports_credentials=true`, dan cookie CSRF — didokumentasikan di Tahap 4.
