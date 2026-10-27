# Alur Aplikasi (Peta Flowchart)

Dokumen ini memetakan **seluruh alur** LPTI-ISBN dalam bentuk diagram
[Mermaid](https://mermaid.js.org/) yang bisa langsung dirender (GitHub/GitLab/VS Code)
atau dipakai sebagai acuan menggambar ulang di draw.io / Figma / Miro.

Sumber kebenaran tetap kode:

| Aspek | Lokasi kode |
|---|---|
| Status & transisi sah | `backend/app/Enums/SubmissionStatus.php` |
| Satu-satunya jalur ubah status | `backend/app/Services/SubmissionStatusService.php` |
| Rute API | `backend/routes/api.php` |
| Guard frontend | `frontend/proxy.ts`, `frontend/lib/auth.ts` |
| Cookie sesi (BFF) | `frontend/app/api/auth/login/route.ts` |

> **Catatan status implementasi:** `/` saat ini masih halaman landing publik.
> Rencana redirect `/` → `/login` (belum login) atau `/dashboard` (sudah login)
> baru berupa backlog — lihat `docs/DEPLOYMENT.md` §9.8. Diagram di bawah
> menggambarkan perilaku **yang sudah jalan**.

---

## 0. Aktor dan halaman

| Aktor | Label | Halaman utama | Halaman admin |
|---|---|---|---|
| `applicant` | Pemohon | `/dashboard`, `/pengajuan`, `/pengajuan/baru`, `/pengajuan/[id]`, `/pengajuan/[id]/ubah`, `/profil`, `/notifikasi` | ❌ (403 / redirect) |
| `admin` | Admin / Verifikator | — | `/admin`, `/admin/pengajuan`, `/admin/pengajuan/[id]`, `/admin/pemohon`, `/admin/laporan`, `/admin/audit`, `/admin/persyaratan`, `/admin/notifikasi` |
| `super_admin` | Admin Utama | — | Semua halaman admin **+ `/admin/pengguna`** (kelola akun) |

Halaman publik: `/` (landing), `/login`, `/register`.

---

## 1. Alur besar end-to-end

```mermaid
flowchart TD
    subgraph MASUK["Masuk"]
        REG["Registrasi /register"]
        LOGIN["Login /login"]
        COOKIE["Cookie httpOnly lpti_isbn_token<br/>berlaku 7 hari"]
        ROLE{"Role pengguna?"}
        REG --> COOKIE
        LOGIN --> COOKIE
        COOKIE --> ROLE
        ROLE -- "pemohon" --> DASH["Dashboard /dashboard"]
        ROLE -- "admin / super_admin" --> ADM["Dashboard admin /admin"]
    end

    subgraph PEMOHON["Pemohon"]
        NEW["Buat pengajuan<br/>status: Draft"]
        FILL["Isi data buku"]
        UPLOAD["Unggah dokumen persyaratan<br/>privat, maks 4 MB"]
        SUBMIT["Ajukan pengajuan<br/>status: Diajukan"]
        FIX["Perbaiki data & dokumen"]
        RESUB["Ajukan ulang<br/>status: Diajukan Ulang"]
    end

    subgraph SISTEM["Sistem"]
        CEK{"Semua dokumen wajib<br/>sudah diunggah?"}
        HISTORY["Catat riwayat status + audit log"]
        NOTIF["Kirim notifikasi in-app"]
    end

    subgraph ADMIN["Admin / Verifikator"]
        LIST["Daftar pengajuan<br/>/admin/pengajuan"]
        START["Mulai verifikasi<br/>status: Dalam Verifikasi"]
        REVIEW["Periksa data + review dokumen<br/>approved / rejected"]
        PUTUS{"Keputusan verifikasi"}
        ISBN["Catat nomor ISBN manual<br/>10/13 digit, unik"]
    end

    DASH --> NEW --> FILL --> UPLOAD --> CEK
    CEK -- "belum lengkap" --> UPLOAD
    CEK -- "lengkap" --> SUBMIT --> NOTIF
    NOTIF --> LIST --> START --> REVIEW --> PUTUS

    PUTUS -- "setujui" --> SETUJU["Status: Disetujui untuk Diproses"]
    SETUJU --> ISBN --> FINAL["Status: ISBN Ditetapkan<br/>(final)"]

    PUTUS -- "minta revisi<br/>wajib catatan" --> REV["Status: Perlu Revisi"]
    REV --> FIX --> RESUB --> NOTIF

    PUTUS -- "tolak<br/>wajib alasan" --> TOLAK["Status: Ditolak<br/>(final)"]

    SUBMIT -. "setiap transisi" .-> HISTORY
    SETUJU -. "setiap transisi" .-> HISTORY
    REV -. "setiap transisi" .-> HISTORY
    TOLAK -. "setiap transisi" .-> HISTORY
    FINAL -. "setiap transisi" .-> HISTORY
    HISTORY -. "keputusan admin" .-> NOTIF
    FINAL --> P["Pemohon melihat hasil<br/>+ riwayat + notifikasi"]
    TOLAK --> P
    REV --> P
```

---

## 2. Registrasi, login, logout (pola BFF)

```mermaid
flowchart LR
    B["Browser"] -- "form /register atau /login" --> BFF["Next.js Route Handler<br/>/api/auth/register · /api/auth/login"]
    BFF -- "POST /api/v1/register atau /login" --> API["Laravel API"]
    API -- "200 + token Sanctum" --> BFF
    BFF -- "Set-Cookie: lpti_isbn_token<br/>httpOnly · sameSite=lax · secure di produksi · 7 hari" --> B["Browser<br/>(JavaScript tidak bisa membaca cookie)"]
    BFF -- "redirect sesuai role" --> R{"Role"}
    R -- "pemohon" --> D["/dashboard"]
    R -- "admin / super_admin" --> A["/admin"]
```

Aturan:

- Token **tidak pernah** sampai ke browser; semua panggilan API dari server Next.js.
- Login dibatasi **5 permintaan/menit per email+IP**, registrasi **3 permintaan/menit per IP** → kelebihan → **429** berbahasa Indonesia.
- Logout: `POST /api/v1/logout` (token dicabut) + cookie dihapus.
- Cek sesi: `/api/auth/session`, `/api/auth/me`.

---

## 3. Alur pemohon: membuat sampai mengajukan

```mermaid
flowchart TD
    S["Pemohon login"] --> D["/dashboard"]
    D --> N["/pengajuan/baru"]
    N --> SAVE["POST /api/v1/submissions<br/>status Draft + nomor otomatis<br/>LPTI-ISBN-TAHUN-URUT"]
    SAVE --> ISIDATA["Isi: judul, penulis utama, penerbit,<br/>bahasa, format terbitan (wajib)"]
    ISIDATA --> UP["POST /api/v1/submissions/{id}/documents"]
    UP --> VAL{"Validasi berkas"}
    VAL -- "gagal (format/ukuran)" --> UP
    VAL -- "lolos" --> SIMPAN["Tersimpan di storage/app/private<br/>(tidak dapat diakses publik)"]
    SIMPAN --> LAGI{"Masih ada dokumen<br/>yang ingin diunggah?"}
    LAGI -- "ya" --> UP
    LAGI -- "tidak" --> AJUKAN["POST /api/v1/submissions/{id}/submit"]
    AJUKAN --> CEK{"Dokumen wajib lengkap?"}
    CEK -- "tidak → 422 + daftar yang kurang" --> UP
    CEK -- "ya" --> OK["Status: Diajukan"]
    OK --> WAIT["Menunggu verifikasi admin<br/>(admin menerima notifikasi)"]
```

Aturan pengeditan:

- Data pengajuan hanya bisa diubah/dihapus saat **Draft** atau **Perlu Revisi**
  (`ubah`), sedangkan **hapus hanya saat Draft**.
- Unggah/hapus dokumen hanya saat **Draft** / **Perlu Revisi** → selain itu **409**.
- `submissions/{id}` milik orang lain → **404** (bukan 403), anti-enumeration.

---

## 4. State machine status pengajuan

```mermaid
stateDiagram-v2
    [*] --> Draft : buat pengajuan (pemohon)
    Draft --> Submitted : submit (pemohon)
    Submitted --> UnderReview : start-review (admin)
    UnderReview --> NeedsRevision : request-revision (admin, wajib catatan)
    NeedsRevision --> Resubmitted : resubmit (pemohon)
    Resubmitted --> UnderReview : start-review (admin)
    UnderReview --> ApprovedForProcessing : approve (admin)
    UnderReview --> Rejected : reject (admin, wajib alasan)
    ApprovedForProcessing --> IsbnAssigned : record-isbn (admin, manual)
    IsbnAssigned --> [*]
    Rejected --> [*]
```

| Dari | Aksi | Endpoint | Aktor | Ke | Efek |
|---|---|---|---|---|---|
| — | buat | `POST /api/v1/submissions` | pemohon | `draft` | riwayat awal + audit log |
| `draft` | submit | `POST /submissions/{id}/submit` | pemohon | `submitted` | notifikasi ke semua admin |
| `submitted` | mulai verifikasi | `POST /admin/submissions/{id}/start-review` | admin / super_admin | `under_review` | notifikasi ke pemohon |
| `under_review` | minta revisi | `POST /admin/submissions/{id}/request-revision` | admin / super_admin | `needs_revision` | catatan wajib (5–2000 karakter) |
| `under_review` | setujui | `POST /admin/submissions/{id}/approve` | admin / super_admin | `approved_for_processing` | notifikasi ke pemohon |
| `under_review` | tolak | `POST /admin/submissions/{id}/reject` | admin / super_admin | `rejected` | alasan wajib (5–2000 karakter) |
| `needs_revision` | ajukan ulang | `POST /submissions/{id}/resubmit` | pemohon | `resubmitted` | notifikasi ke semua admin |
| `resubmitted` | mulai verifikasi | `POST /admin/submissions/{id}/start-review` | admin / super_admin | `under_review` | notifikasi ke pemohon |
| `approved_for_processing` | catat ISBN | `POST /admin/submissions/{id}/record-isbn` | admin / super_admin | `isbn_assigned` | ISBN + tanggal + sumber dicatat |
| `isbn_assigned`, `rejected` | — | — | — | final | tidak ada transisi keluar |

Setiap transisi divalidasi di `SubmissionStatus::canTransitionTo()` (status asal +
peran pelaku). Transisi tidak sah → **403**.

---

## 5. Alur verifikasi (admin)

```mermaid
flowchart TD
    A["Admin login /admin"] --> L["/admin/pengajuan<br/>cari + filter status + paginasi"]
    L --> DETAIL["/admin/pengajuan/{id}<br/>data buku + dokumen + riwayat"]
    DETAIL --> MULAI["Mulai verifikasi<br/>status: Dalam Verifikasi"]
    MULAI --> PERIKSA["Buka / unduh dokumen<br/>GET /admin/documents/{id}/download"]
    PERIKSA --> REV1["PATCH /admin/documents/{id}/review<br/>review_status: approved / rejected<br/>catatan admin opsional"]
    REV1 --> LAGI{"Masih ada dokumen<br/>yang diperiksa?"}
    LAGI -- "ya" --> PERIKSA
    LAGI -- "tidak" --> KEPUTUSAN{"Keputusan"}
    KEPUTUSAN -- "data/dokumen kurang<br/>→ minta revisi" --> R1["Status: Perlu Revisi"]
    KEPUTUSAN -- "tidak memenuhi syarat<br/>→ tolak" --> R2["Status: Ditolak"]
    KEPUTUSAN -- "memenuhi syarat<br/>→ setujui" --> R3["Status: Disetujui untuk Diproses"]
    R3 --> ISBN["Catat nomor ISBN (manual)<br/>9 digit + X atau 13 digit · unik ·<br/>tanggal ≤ hari ini+1 · sumber wajib"]
    ISBN --> DONE["Status: ISBN Ditetapkan"]
```

Catatan:

- **Review dokumen per berkas** (`pending` / `approved` / `rejected` + catatan)
  terpisah dari status pengajuan; tidak memicu notifikasi, hanya audit log.
- **Nomor ISBN tidak pernah digenerate sistem** — admin mencatat angka yang
  sudah sah ditetapkan pihak berwenang (kepatuhan: lihat README).
- Laporan: `/admin/laporan` + CSV (`GET /admin/reports/submissions.csv`, tanpa kolom sensitif).
- Audit: `/admin/audit` (`GET /admin/audit-log`).

---

## 6. Notifikasi

```mermaid
flowchart LR
    T1["Pemohon submit / resubmit"] --> N1["Notifikasi ke SEMUA<br/>admin + super_admin"]
    T2["Admin: start-review,<br/>minta revisi, setujui, tolak,<br/>catat ISBN"] --> N2["Notifikasi ke PEMILIK<br/>pengajuan"]
    N2 --> READ["/notifikasi atau /admin/notifikasi<br/>PATCH /notifications/{id}/read<br/>PATCH /notifications/read-all"]
```

| Pemicu | Penerima |
|---|---|
| `submitted`, `resubmitted` | semua pengguna ber-role `admin` dan `super_admin` |
| `under_review`, `needs_revision`, `approved_for_processing`, `rejected`, `isbn_assigned` | pemohon pemilik pengajuan |

Notifikasi disimpan di tabel `notifications` (in-app); email sengaja belum aktif
(`MAIL_MAILER=log`).

---

## 7. Guard akses (frontend + backend)

```mermaid
flowchart TD
    BUKA["Buka halaman terproteksi<br/>/dashboard · /pengajuan · /profil · /admin"] --> C{"Cookie sesi ada?<br/>(proxy.ts)"}
    C -- "tidak" --> L1["redirect /login?redirect=<halaman asal>"]
    C -- "ya" --> G{"Role sesuai area?<br/>(lib/auth.ts: requireAuth /<br/>requireApplicant / requireAdmin)"}
    G -- "tidak" --> FB["redirect ke beranda per role<br/>/dashboard atau /admin"]
    G -- "ya" --> HAL["Halaman dirender"]
    HAL --> APICALL["Panggilan server ke API"]
    APICALL --> API{"Backend: token valid? role cukup?"}
    API -- "token tidak valid → 401" --> L1
    API -- "role kurang → 403" --> DENY["Akses ditolak"]
    API -- "data milik user lain → 404" --> NF["Tidak ditemukan<br/>(anti-enumeration)"]
    API -- "status terkunci → 409" --> LOCK["Konflik status pengajuan"]
    API -- "validasi gagal → 422" --> INVALID["Pesan validasi berbahasa Indonesia"]
    API -- "rate limit → 429" --> LIMIT["Terlalu banyak permintaan"]
```

Mapping middleware backend:

| Middleware | Role yang lolos | Dipakai di |
|---|---|---|
| `auth:sanctum` | semua user login | seluruh `/api/v1` kecuali `register`, `login`, `/up` |
| `admin` | `admin`, `super_admin` | prefix `/api/v1/admin/*` |
| `super_admin` | `super_admin` saja | resource `/api/v1/admin/users` |

---

## 8. Alur admin utama (super_admin) & persyaratan dokumen

```mermaid
flowchart TD
    SA["super_admin"] --> U["/admin/pengguna"]
    U --> NEW["/admin/pengguna/baru<br/>POST /admin/users<br/>role: applicant / admin / super_admin"]
    NEW --> AKUN["Akun baru bisa login<br/>(password di-hash)"]
    U --> EDIT["/admin/pengguna/{id}<br/>ubah data / reset password / hapus<br/>(tidak bisa mengubah role sendiri)"]

    A2["admin atau super_admin"] --> REQ["/admin/persyaratan"]
    REQ --> REQNEW["Tambah persyaratan<br/>nama, wajib/opsional, format, maks MB, aktif"]
    REQ --> REQEDIT["Ubah / hapus persyaratan"]
    REQNEW --> FORM["Form unggah pemohon<br/>langsung mengikuti konfigurasi ini"]
```

Catatan penting:

- Kelola **persyaratan dokumen** boleh `admin` **dan** `super_admin`
  (`hasAdminPrivileges()`); hanya halaman **kelola akun** yang eksklusif `super_admin`.
- Akun yang dibuat lewat UI langsung aktif dan bisa login.
- Pemohon juga bisa mendaftar sendiri di `/register` (role selalu `applicant`).

---

## 9. Aturan validasi & batas

| Aturan | Nilai | Efek bila dilanggar |
|---|---|---|
| Ukuran berkas dokumen | mengikuti `document_requirements.max_file_size` (default **4 MB** / 4096 KB) | 422 |
| Format berkas | mengikuti `allowed_mime_types` (pdf, jpeg, png), dicek dari **isi berkas** | 422 |
| Ubah data pengajuan | hanya status `draft`, `needs_revision` | 409 |
| Hapus pengajuan | hanya status `draft` | 409 |
| Upload dokumen | hanya status `draft`, `needs_revision` | 409 |
| Submit | semua persyaratan **wajib** harus sudah ada | 422 + daftar nama persyaratan |
| Minta revisi | catatan 5–2000 karakter | 422 |
| Tolak | alasan 5–2000 karakter | 422 |
| Catat ISBN | `9 digit + (X/x)` atau **13 digit**, unik, tanggal ≤ hari ini+1, sumber 3–1000 karakter | 422 |
| Review dokumen | `pending` / `approved` / `rejected`, catatan ≤ 1000 karakter | 422 |
| Login / registrasi | 5/menit per email+IP · 3/menit per IP | 429 |
| Akses data pengguna lain | — | 404 (bukan 403) |

---

## 10. Peta halaman ↔ endpoint (untuk node diagram)

| Langkah | Halaman frontend | Endpoint backend |
|---|---|---|
| Registrasi | `/register` | `POST /api/v1/register` |
| Login / logout | `/login` | `POST /api/v1/login` · `POST /api/v1/logout` |
| Profil | `/profil` | `GET/PUT /api/v1/me` |
| Dashboard pemohon | `/dashboard` | `GET /api/v1/submissions/stats` |
| Daftar pengajuan | `/pengajuan` | `GET /api/v1/submissions` |
| Buat / detail / ubah | `/pengajuan/baru`, `/pengajuan/[id]` | `POST /api/v1/submissions`, `GET/PUT/DELETE /submissions/{id}` |
| Unggah / hapus dokumen | di halaman detail | `POST /submissions/{id}/documents`, `DELETE /submissions/{id}/documents/{doc}` |
| Ajukan / ajukan ulang | di halaman detail | `POST /submissions/{id}/submit` · `POST /submissions/{id}/resubmit` |
| Riwayat status | di halaman detail | `GET /submissions/{id}/history` |
| Dashboard admin | `/admin` | `GET /api/v1/admin/dashboard` |
| Daftar pengajuan admin | `/admin/pengajuan` | `GET /api/v1/admin/submissions` |
| Verifikasi | `/admin/pengajuan/[id]` | `POST /admin/submissions/{id}/start-review` · `.../approve` · `.../request-revision` · `.../reject` · `.../record-isbn` |
| Review dokumen | di halaman detail | `PATCH /admin/documents/{id}/review`, `GET /admin/documents/{id}/download` |
| Persyaratan | `/admin/persyaratan` | `GET/POST/PUT/DELETE /api/v1/admin/document-requirements` |
| Akun pengguna (super_admin) | `/admin/pengguna` | `GET/POST/PUT/DELETE /api/v1/admin/users` |
| Laporan & audit | `/admin/laporan`, `/admin/audit` | `GET /admin/reports/submissions(.csv)`, `GET /admin/audit-log` |
| Notifikasi | `/notifikasi`, `/admin/notifikasi` | `GET /api/v1/notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all` |
| Persyaratan publik (di form unggah) | — | `GET /api/v1/document-requirements` |

---

## 11. Checklist menggambar ulang (manual)

Kalau mau digambar sendiri (draw.io dsb.), urutan simpul alur utama:

1. **Mulai** → Registrasi / Login (cookie httpOnly) → cek role
2. Pemohon → Dashboard → **Buat pengajuan** (Draft)
3. Isi data buku → Unggah dokumen → **Dokumen wajib lengkap?** (belum → ulangi unggah)
4. **Ajukan** → Diajukan → notifikasi ke admin
5. Admin → Daftar pengajuan → Mulai verifikasi → Dalam Verifikasi
6. Periksa & review dokumen (approved / rejected per berkas)
7. **Keputusan**: setujui → Disetujui untuk Diproses → **Catat ISBN** → ISBN Ditetapkan (selesai)
8. Keputusan: minta revisi → Perlu Revisi → Pemohon perbaiki → **Ajukan ulang** → Diajukan Ulang → kembali ke langkah 5
9. Keputusan: tolak → Ditolak (selesai)
10. Setiap panah status = catat riwayat + audit log + notifikasi
