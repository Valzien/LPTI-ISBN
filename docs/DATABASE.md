# LPTI-ISBN — Database (ERD & Spesifikasi Tabel)

Sumber data utama: **MySQL 8** (`lpti_isbn`, `utf8mb4` / `utf8mb4_unicode_ci`).
Migration & seeder dibuat pada **Tahap 2**. Desain mengikuti master prompt §7
dengan catatan keputusan yang dijelaskan di bagian "Catatan Desain".

---

## 1. ERD

```mermaid
erDiagram
    users ||--o{ book_submissions : "membuat pengajuan"
    users ||--o{ submission_status_histories : "menjadi aktor"
    users ||--o{ notifications : "menerima"
    users ||--o{ audit_logs : "melakukan aksi"
    book_submissions ||--o{ submission_documents : "memiliki dokumen"
    book_submissions ||--o{ submission_status_histories : "memiliki riwayat"
    document_requirements ||--o{ submission_documents : "dirujuk (nullable)"

    users {
        bigint id PK
        string name
        string email UK
        string password
        string role "applicant | admin | super_admin"
        string phone "nullable"
        string applicant_type "nullable: author | publisher_rep"
        string publisher_name "nullable"
        text address "nullable"
        timestamp email_verified_at "nullable"
        timestamps
    }

    book_submissions {
        bigint id PK
        string submission_number UK "LPTI-ISBN-YYYY-XXXXX (bukan ISBN)"
        bigint user_id FK "pemohon"
        string title
        string subtitle "nullable"
        string main_author
        text additional_authors "nullable (JSON-ish teks, MVP)"
        string editor "nullable"
        string translator "nullable"
        string publisher_name
        smallint planned_publication_year "nullable"
        string edition "nullable"
        string language
        string publication_format
        text synopsis "nullable"
        integer page_count "nullable"
        string book_size "nullable"
        text notes "nullable"
        string status "enum, lihat ANALISIS.md 4"
        string isbn_number UK "nullable — hanya nomor yang sah ditetapkan"
        timestamp isbn_assigned_at "nullable"
        text isbn_source_note "nullable — sumber/rujukan penetapan"
        timestamps
    }

    document_requirements {
        bigint id PK
        string name
        text description "nullable"
        json allowed_mime_types "mis. [application/pdf, image/jpeg]"
        integer max_file_size "dalam byte"
        boolean is_required
        boolean is_active
        integer sort_order
        timestamps
    }

    submission_documents {
        bigint id PK
        bigint book_submission_id FK
        bigint document_requirement_id FK "nullable — jaga histori bila requirement dihapus"
        bigint uploaded_by FK "users.id"
        string original_filename
        string stored_path "path privat, nama UUID"
        string mime_type
        bigint file_size "byte"
        string review_status "pending | approved | rejected"
        text admin_note "nullable"
        timestamps
    }

    submission_status_histories {
        bigint id PK
        bigint book_submission_id FK
        bigint actor_user_id FK "users.id"
        string previous_status "nullable (saat pembuatan)"
        string new_status
        text note "nullable"
        timestamp created_at
    }

    notifications {
        uuid id PK "Laravel database notifications"
        string type
        string notifiable_type
        bigint notifiable_id "users.id"
        text data "JSON payload aman"
        timestamp read_at "nullable"
        timestamps
    }

    audit_logs {
        bigint id PK
        bigint actor_user_id FK "nullable — sistem/unsauthenticated"
        string action
        string entity_type
        bigint entity_id
        json metadata "aman — tanpa password/token/isi dokumen"
        string ip_address "nullable"
        timestamp created_at
    }
```

---

## 2. Spesifikasi Tabel

### `users`
Per master prompt §7. Index: `email` unique.
- `role`: `applicant` (default), `admin`, `super_admin` — dikendalikan PHP Enum `UserRole` (bukan CHECK DB, agar portabel).
- `applicant_type`: `author` | `publisher_rep`.
- Relasi: `hasMany(BookSubmission)`, `hasMany(DatabaseNotification)`.

### `book_submissions`
- `submission_number`: format `LPTI-ISBN-<tahun>-<urut 5 digit>`, dibuat sistem saat record dibuat (counter per tahun, aman terhadap race pakai transaksi/lock). **Bukan ISBN.**
- `status`: default `draft`; Enum `SubmissionStatus` — nilai:
  `draft`, `submitted`, `under_review`, `needs_revision`, `resubmitted`,
  `approved_for_processing`, `isbn_assigned`, `rejected`.
- `isbn_number`: `nullable` + `unique`. MySQL unique mengizinkan banyak `NULL`.
- Index: `user_id`, `status`, `submission_number` (unique), `isbn_number` (unique), `(created_at)`.
- Relasi: `belongsTo(User)`, `hasMany(SubmissionDocument)`, `hasMany(SubmissionStatusHistory)`.

### `document_requirements`
- `allowed_mime_types`: JSON array string MIME.
- `max_file_size`: byte (default 4 MB = 4194304 — batas aman unggah lewat Vercel; maksimal 4 MB).
- `is_required` & `is_active`: pengajuan hanya bisa dikirim bila semua requirement **aktif + wajib** punya dokumen terunggah.
- Disaring admin lewat CRUD (Tahap 6); nilai awal dari seeder.

### `submission_documents`
- `stored_path`: path relatif di **private** storage, contoh
  `documents/550e8400-e29b-41d4-a716-446655440000.pdf` (nama UUID, tanpa nama asli).
- `original_filename` disimpan terpisah untuk ditampilkan & diunduh.
- `review_status`: `pending` (default), `approved`, `rejected` — diperbarui admin saat verifikasi.
- Index: `book_submission_id`, `document_requirement_id`.
- Relasi: `belongsTo(BookSubmission)`, `belongsTo(DocumentRequirement)`, `belongsTo(User, 'uploaded_by')`.

### `submission_status_histories`
- `created_at` saja (tanpa `updated_at`).
- Index: `(book_submission_id, created_at)`.
- Diisi **otomatis** oleh service transisi status — tidak bisa diubah langsung dari luar service.

### `notifications`
- Struktur **bawaan Laravel** (`database` channel) — kolom standar Laravel
  (`id` UUID, `type`, `notifiable_type`, `notifiable_id`, `data`, `read_at`).
- Wajib `belongsToMany`-safe: pembacaan selalu difilter `notifiable_id = user aktif`.

### `audit_logs`
- `action`: string domain, contoh `submission.status_changed`, `document.downloaded`, `user.login`, `isbn.recorded`.
- `entity_type`: string FQCN singkat, mis. `book_submission`.
- `metadata` JSON: hanya data aman (status lama/baru, id dokumen) — **tanpa**
  password, token, kredensial, atau isi dokumen.
- Index: `actor_user_id`, `(entity_type, entity_id)`, `created_at`.

---

## 3. Catatan Desain

1. **Tabel relasi penulis tambahan tidak dibuat di MVP.** `additional_authors`
   disimpan sebagai teks terstruktur (satu nama per baris). Bila kebutuhan
   query per penulis muncul, tambahkan tabel `submission_authors` pada versi
   berikutnya tanpa merusak skema (migrasi additive).
2. **`document_requirement_id` nullable di `submission_documents`** agar
   histori pengajuan lama tetap utuh ketika admin menghapus/menonaktifkan
   sebuah jenis dokumen.
3. **Soft delete tidak dipakai** untuk MVP; penghapusan hanya berlaku pengajuan
   berstatus `draft` (hard delete + file dokumen ikut dihapus dari storage).
4. **`isbn_source_note`** ditambahkan di luar daftar minimum master prompt
   untuk memenuhi syarat "catatan sumber/rujukan internal" saat status
   `isbn_assigned`.
5. **Tidak ada kolom sensitif** yang tidak perlu (master prompt §5.2: jangan
   meminta data pribadi yang tidak dibutuhkan).
6. Semua FK dibuat dengan `constrained()` + `cascadeOnDelete` untuk relasi
   milik pengajuan, dan `nullOnDelete` untuk `document_requirement_id`.

## 4. Seeder Rencana (Tahap 2)

| Seeder | Isi |
|---|---|
| `DocumentRequirementSeeder` | Contoh fiktif: KTP/Surat keterangan penulis, Surat pernyataan keaslian naskah, Sinopsis, Contoh/sampul — semua PDF gambar (pdf/jpg/png), 4 MB |
| `UserSeeder` | 1 super_admin, 2 admin, 3 pemohon (data dummy faker, password `password`) |
| `BookSubmissionSeeder` | Contoh pengajuan per status untuk pratinjau dashboard (data fiktif) |
