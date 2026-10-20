# MASTER PROMPT --- Website Pendaftaran dan Pengelolaan Pengajuan ISBN

> **Instruksi untuk AI Coding Assistant:** Bangun aplikasi web
> berdasarkan spesifikasi di bawah ini secara bertahap. Jangan membuat
> seluruh aplikasi sekaligus dalam satu respons. Mulai dari analisis dan
> fondasi proyek, lalu lanjutkan per tahap dengan kode yang benar-benar
> bisa dijalankan.

---

## 1. Gambaran Proyek

**Nama proyek:** LPTI-ISBN --- Platform Pengajuan dan Pengelolaan ISBN\
**Jenis aplikasi:** Web application untuk pengajuan dan pengelolaan
permohonan ISBN buku\
**Bahasa antarmuka:** Bahasa Indonesia\
**Target pengguna:** Penulis, penerbit/pengelola penerbit, dan
administrator/verifikator\
**Tujuan:** Membantu pengguna mengisi data buku, mengunggah dokumen
persyaratan, mengirim pengajuan, memantau status, serta menerima catatan
revisi dari admin melalui satu dashboard.

### Batasan penting

- Aplikasi ini adalah **sistem pengelolaan pengajuan ISBN**, bukan
  otomatis portal resmi Perpustakaan Nasional Republik Indonesia.
- Jangan mengklaim aplikasi sudah terhubung ke sistem Perpusnas atau
  dapat menerbitkan nomor ISBN secara otomatis tanpa API/integrasi
  resmi yang benar-benar tersedia.
- Nomor ISBN hanya boleh dicatat sebagai nomor yang sudah
  diberikan/ditetapkan oleh pihak berwenang atau dimasukkan oleh admin
  berdasarkan proses yang sah. Jangan membuat nomor ISBN palsu secara
  otomatis.
- Persyaratan dan alur pengajuan dapat berubah. Buat daftar dokumen
  persyaratan yang bisa dikelola admin, dan tampilkan keterangan bahwa
  pemohon tetap perlu mengikuti ketentuan resmi yang berlaku.
- Jangan gunakan logo pemerintah atau identitas resmi Perpusnas tanpa
  izin.

---

## 2. Stack Teknologi

Gunakan stack berikut:

### Frontend

- Next.js dengan App Router.
- React dan TypeScript.
- Tailwind CSS.
- shadcn/ui untuk komponen antarmuka.
- React Hook Form + Zod untuk formulir dan validasi sisi frontend.
- Lucide React untuk ikon.
- Recharts hanya jika dashboard benar-benar membutuhkan grafik.
- Gunakan Server Components secara default; gunakan Client Components
  hanya ketika diperlukan untuk interaksi browser.
- Gunakan Route Groups dan layout Next.js untuk memisahkan halaman
  publik, pemohon, dan admin.
- Jangan menambahkan Axios atau state manager global tanpa kebutuhan
  yang jelas; gunakan `fetch` atau solusi bawaan Next.js jika sudah
  memadai.

### Backend

- Laravel 13 sebagai REST API.
- Laravel Sanctum untuk autentikasi API.
- Eloquent ORM.
- MySQL.
- Laravel Form Request untuk validasi.
- Policies/Gates untuk otorisasi.
- Laravel Storage untuk berkas.
- Queue dan notification boleh ditambahkan jika diperlukan, tetapi
  harus tetap mudah dijalankan secara lokal.

### Arsitektur aplikasi

- Pisahkan aplikasi menjadi dua direktori utama: `frontend/` untuk
  Next.js dan `backend/` untuk Laravel 13 API.
- Next.js menangani antarmuka, rendering halaman, dan interaksi
  pengguna.
- Laravel 13 menangani autentikasi API, logika bisnis, validasi
  otoritatif, otorisasi, database, upload dokumen, notifikasi, dan
  audit log.
- MySQL menjadi sumber data utama.
- Konfigurasikan URL API melalui environment variable, misalnya
  `NEXT_PUBLIC_API_URL` bila memang endpoint tersebut aman diekspos ke
  browser. Untuk request server-side yang tidak perlu diketahui
  browser, gunakan variabel server-only seperti `API_URL`.
- Pilih pola autentikasi Sanctum yang sesuai dengan deployment. Jika
  Next.js dan Laravel berada pada domain/subdomain yang dapat
  dikonfigurasi sebagai stateful domain, jelaskan konfigurasi cookie,
  CORS, CSRF, dan domain secara lengkap. Jangan menyimpan token
  sensitif di `localStorage`.
- Jangan membuat backend Laravel kedua di dalam Next.js API Routes
  kecuali ada alasan arsitektural yang jelas. Logika bisnis utama
  tetap berada di Laravel.
- Gunakan `.env` untuk konfigurasi rahasia.
- Sertakan migration, model, controller, request validation, seeder,
  dan route yang diperlukan.
- Hindari membuat arsitektur terlalu rumit untuk MVP.
- Gunakan versi dependency yang kompatibel dengan Laravel 13 dan versi
  stabil Next.js saat implementasi. Jangan mengunci versi package yang
  tidak kompatibel.

---

## 3. Role dan Hak Akses

### A. Pengunjung

- Melihat landing page.
- Melihat panduan alur pengajuan.
- Melihat informasi dokumen yang dibutuhkan.
- Membuat akun dan login.

### B. Pemohon

Pemohon dapat berperan sebagai penulis atau perwakilan penerbit.

- Mengelola profil dan informasi kontak.
- Mengisi data buku.
- Menyimpan pengajuan sebagai draft.
- Mengunggah dokumen persyaratan.
- Mengirim pengajuan untuk diverifikasi.
- Melihat status dan riwayat perubahan status.
- Melihat catatan revisi dari admin.
- Memperbaiki data atau dokumen yang dikembalikan.
- Mengirim ulang pengajuan setelah revisi.
- Melihat hasil akhir dan nomor ISBN jika nomor tersebut sudah sah
  ditetapkan dan dicatat admin.
- Mengunduh atau mencetak ringkasan pengajuan.

### C. Admin/Verifikator

- Melihat seluruh pengajuan.
- Memfilter pengajuan berdasarkan status, tanggal, pemohon, dan judul
  buku.
- Membuka detail data dan dokumen pengajuan.
- Memverifikasi kelengkapan data.
- Menyetujui pengajuan untuk diproses ke tahap berikutnya.
- Mengembalikan pengajuan untuk revisi disertai catatan yang jelas.
- Menolak pengajuan dengan alasan yang wajib diisi.
- Mengubah status sesuai alur yang diizinkan.
- Mencatat nomor ISBN yang telah diterbitkan/ditetapkan oleh pihak
  berwenang.
- Melihat riwayat aktivitas dan status pengajuan.
- Mengelola daftar persyaratan dokumen dan informasi panduan.
- Mengelola akun pemohon bila diperlukan.

### D. Admin utama (opsional)

- Mengelola akun admin/verifikator.
- Mengatur konfigurasi aplikasi.
- Melihat audit log.
- Hak akses admin utama harus dibatasi dan tidak diberikan ke akun
  pemohon.

---

## 4. Alur Pengajuan

Gunakan alur status yang konsisten:

1.  **Draft** --- pengajuan masih disusun dan belum dikirim.
2.  **Diajukan** --- pemohon sudah mengirim pengajuan.
3.  **Dalam Verifikasi** --- admin sedang memeriksa data dan dokumen.
4.  **Perlu Revisi** --- admin mengembalikan pengajuan dengan catatan.
5.  **Diajukan Ulang** --- pemohon sudah mengirim perbaikan.
6.  **Disetujui untuk Diproses** --- verifikasi internal selesai; status
    ini tidak berarti ISBN resmi sudah terbit.
7.  **ISBN Ditetapkan** --- nomor ISBN yang sah sudah diterima dan
    dicatat.
8.  **Ditolak** --- pengajuan tidak dapat dilanjutkan, disertai alasan.

Ketentuan: - Pemohon hanya dapat mengedit pengajuan berstatus Draft atau
Perlu Revisi. - Setelah dikirim, data pengajuan dikunci dari perubahan
langsung sampai admin mengembalikannya untuk revisi. - Setiap perubahan
status harus menyimpan waktu, pelaku, status sebelumnya, status baru,
dan catatan. - Status ISBN Ditetapkan wajib memiliki nomor ISBN, tanggal
penetapan, dan catatan sumber/rujukan internal. - Jangan menganggap
status Disetujui untuk Diproses sama dengan ISBN resmi sudah
diterbitkan. - Admin tidak boleh mengubah status secara sembarangan;
validasi transisi status di backend.

---

## 5. Fitur Utama

### 5.1 Autentikasi

- Registrasi pemohon.
- Login dan logout.
- Lupa/reset password.
- Validasi email jika fitur email sudah dikonfigurasi.
- Proteksi route berdasarkan role.
- Password disimpan menggunakan hashing Laravel.
- Pesan kesalahan login tidak membocorkan apakah email tertentu
  terdaftar.
- Rate limiting untuk login dan endpoint sensitif.

### 5.2 Profil Pemohon

Data minimum: - Nama lengkap. - Email. - Nomor telepon. - Jenis pemohon:
Penulis atau Perwakilan Penerbit. - Nama penerbit, jika relevan. -
Alamat, jika diperlukan. - Waktu pembuatan dan pembaruan akun.

Jangan meminta data pribadi yang tidak dibutuhkan oleh proses pengajuan.

### 5.3 Formulir Data Buku

Field yang disarankan: - Judul buku. - Subjudul, opsional. - Nama
penulis utama. - Penulis tambahan, opsional. - Editor, opsional. -
Penerjemah, opsional. - Nama penerbit. - Tahun terbit yang
direncanakan. - Edisi, jika relevan. - Bahasa buku. - Jenis publikasi
atau format buku. - Deskripsi/sinopsis. - Jumlah halaman, jika sudah
tersedia. - Ukuran buku, jika sudah tersedia. - Catatan tambahan.

Validasi field wajib dan format data di frontend serta backend. Jadikan
field yang bergantung pada ketentuan resmi dapat dikonfigurasi, jangan
mengunci semua aturan sebagai asumsi permanen.

### 5.4 Upload Dokumen

- Pemohon dapat mengunggah dokumen yang dipersyaratkan.
- Admin dapat mengelola daftar jenis dokumen yang dibutuhkan.
- Tampilkan nama file, ukuran, jenis dokumen, waktu unggah, dan status
  pemeriksaan.
- Sediakan aksi lihat/unduh hanya untuk pengguna yang berhak.
- Validasi tipe MIME, ekstensi, dan ukuran file di backend.
- Gunakan nama file acak/UUID untuk penyimpanan.
- Simpan dokumen di private storage, bukan folder publik tanpa
  proteksi.
- Gunakan endpoint terotorisasi untuk melihat atau mengunduh dokumen.
- Jangan percaya pada validasi frontend saja.
- Daftar jenis dan format dokumen awal harus dapat diubah admin sesuai
  aturan resmi terbaru.

### 5.5 Dashboard Pemohon

Tampilkan: - Sapaan dan ringkasan akun. - Jumlah pengajuan berdasarkan
status. - Tombol "Buat Pengajuan". - Daftar pengajuan terbaru. - Judul
buku, tanggal pengajuan, status, dan aksi. - Notifikasi/catatan revisi
yang belum dibaca. - Timeline proses pengajuan.

### 5.6 Dashboard Admin

Tampilkan: - Total pengajuan. - Pengajuan baru yang perlu diperiksa. -
Pengajuan dalam verifikasi. - Pengajuan yang perlu revisi. - Pengajuan
yang sudah selesai. - Tabel pengajuan terbaru. - Filter dan pencarian. -
Ringkasan statistik sederhana.

Angka dashboard wajib dihitung dari database, bukan angka dummy setelah
backend terhubung.

### 5.7 Detail dan Verifikasi Pengajuan

Admin dapat: - Melihat seluruh data buku dan profil pemohon yang
relevan. - Melihat dokumen secara aman. - Memberi catatan pada dokumen
atau pengajuan. - Mengembalikan pengajuan untuk revisi. - Menyetujui
untuk diproses atau menolak dengan alasan. - Mencatat nomor ISBN yang
telah sah diterbitkan/ditetapkan. - Melihat timeline aktivitas.

Pemohon dapat melihat catatan admin dan memperbaiki bagian yang diminta.

### 5.8 Notifikasi

- Notifikasi di dalam aplikasi untuk perubahan status.
- Tandai notifikasi sebagai sudah dibaca.
- Email bersifat opsional dan harus memakai konfigurasi SMTP dari
  `.env`.
- Jika email belum dikonfigurasi, fitur inti aplikasi tetap dapat
  digunakan melalui notifikasi dashboard.

### 5.9 Pencarian dan Laporan

- Cari berdasarkan judul buku, nama pemohon, dan nomor pengajuan.
- Filter status dan rentang tanggal.
- Admin dapat mengekspor laporan CSV.
- Jangan memasukkan URL dokumen privat atau data sensitif yang tidak
  diperlukan ke dalam ekspor.
- Gunakan pagination untuk daftar data.

---

## 6. Daftar Halaman

### Halaman Publik

1.  Landing page.
2.  Tentang layanan.
3.  Panduan pengajuan.
4.  Daftar persyaratan dokumen.
5.  FAQ.
6.  Login.
7.  Registrasi.
8.  Lupa password.

### Halaman Pemohon

1.  Dashboard pemohon.
2.  Profil.
3.  Daftar pengajuan.
4.  Buat pengajuan.
5.  Edit draft/revisi.
6.  Detail pengajuan.
7.  Riwayat status.
8.  Notifikasi.
9.  Pengaturan akun.

### Halaman Admin

1.  Dashboard admin.
2.  Daftar semua pengajuan.
3.  Detail/verifikasi pengajuan.
4.  Daftar pemohon.
5.  Manajemen persyaratan dokumen.
6.  Manajemen panduan/FAQ.
7.  Laporan.
8.  Audit log.
9.  Manajemen admin (khusus admin utama, jika diimplementasikan).

Semua halaman harus memiliki loading state, empty state, error state,
dan tampilan responsif.

---

## 7. Database

Rancang skema database yang ternormalisasi dan sertakan relasi, foreign
key, index, migration, serta seeder.

Tabel minimum yang disarankan:

### `users`

- id
- name
- email (unique)
- password
- role (`applicant`, `admin`, `super_admin`)
- phone (nullable)
- applicant_type (nullable)
- publisher_name (nullable)
- address (nullable)
- email_verified_at (nullable)
- timestamps

### `book_submissions`

- id
- submission_number (unique, dibuat oleh sistem dan bukan nomor ISBN)
- user_id
- title
- subtitle (nullable)
- main_author
- additional_authors (nullable, atau gunakan tabel relasi jika
  dibutuhkan)
- editor (nullable)
- translator (nullable)
- publisher_name
- planned_publication_year (nullable)
- edition (nullable)
- language
- publication_format
- synopsis (nullable)
- page_count (nullable)
- book_size (nullable)
- notes (nullable)
- status
- isbn_number (nullable, unique bila terisi)
- isbn_assigned_at (nullable)
- created_at
- updated_at

### `submission_documents`

- id
- book_submission_id
- document_requirement_id (nullable jika dibutuhkan untuk menjaga
  histori)
- uploaded_by
- original_filename
- stored_path
- mime_type
- file_size
- review_status
- admin_note (nullable)
- timestamps

### `document_requirements`

- id
- name
- description (nullable)
- allowed_mime_types
- max_file_size
- is_required
- is_active
- sort_order
- timestamps

### `submission_status_histories`

- id
- book_submission_id
- actor_user_id
- previous_status (nullable)
- new_status
- note (nullable)
- created_at

### `notifications`

- gunakan Laravel Notifications atau tabel notifikasi yang sesuai.
- Notifikasi harus terkait dengan penerima yang benar dan tidak dapat
  dibaca pengguna lain.

### `audit_logs`

- id
- actor_user_id (nullable)
- action
- entity_type
- entity_id
- metadata yang aman (JSON, opsional)
- ip_address (opsional, sesuai kebutuhan privasi)
- created_at

Tambahkan tabel relasi untuk penulis tambahan atau metadata buku jika
desain membutuhkannya. Jangan menyimpan data yang sama berulang kali
tanpa alasan. Jelaskan keputusan desain sebelum membuat migration.

---

## 8. Desain UI/UX

Buat desain yang modern, profesional, bersih, dan mudah digunakan oleh
penulis/penerbit yang belum tentu terbiasa dengan sistem administrasi
digital.

### Arah visual

- Gaya: modern SaaS dashboard, rapi, ringan, profesional.
- Warna utama: navy atau biru tua.
- Warna aksen: biru sedang.
- Latar: putih dan abu-abu sangat muda.
- Status menggunakan warna yang konsisten dan tetap memiliki label
  teks.
- Tipografi jelas dan hierarki heading teratur.
- Gunakan whitespace secukupnya; jangan membuat tampilan terlalu
  padat.
- Hindari gradien berlebihan, efek kaca berlebihan, dan animasi yang
  mengganggu.
- Gunakan ikon Lucide secara konsisten.
- Gunakan sidebar pada dashboard desktop dan navigasi yang nyaman di
  perangkat mobile.

### Landing page

- Navbar dengan nama aplikasi dan menu.
- Hero section dengan headline yang jelas.
- CTA "Mulai Pengajuan" dan "Lihat Panduan".
- Penjelasan alur dalam beberapa langkah.
- Ringkasan manfaat.
- Daftar persyaratan awal yang dapat diperbarui admin.
- FAQ.
- Footer berisi informasi kontak dan disclaimer bahwa aplikasi bukan
  portal resmi jika belum memiliki hubungan/integrasi resmi.

### Dashboard

- Sidebar navigasi.
- Header dengan profil pengguna dan notifikasi.
- Kartu ringkasan.
- Tabel yang responsif.
- Badge status.
- Formulir bertahap atau section yang jelas.
- Konfirmasi sebelum tindakan penting.
- Toast untuk hasil aksi.
- Dialog konfirmasi untuk penolakan, penghapusan draft, atau perubahan
  status penting.

### Responsivitas dan aksesibilitas

- Mobile-first.
- Form dapat digunakan pada layar kecil.
- Kontras warna memadai.
- Label form jelas.
- Semua aksi penting dapat diakses dengan keyboard.
- Jangan mengandalkan warna saja untuk membedakan status.
- Hormati preferensi reduced motion.

---

## 9. Keamanan dan Privasi

Keamanan wajib diterapkan dari awal, bukan ditambahkan belakangan.

- Gunakan Laravel Sanctum sesuai arsitektur autentikasi yang dipilih.
- Terapkan validasi backend untuk semua input.
- Gunakan authorization policy untuk memastikan pemohon hanya
  mengakses pengajuan miliknya sendiri.
- Proteksi endpoint admin dengan middleware dan policy.
- Terapkan rate limiting pada login, reset password, dan endpoint
  sensitif.
- Lindungi upload file dari file berbahaya dan tipe file palsu.
- Simpan dokumen secara privat.
- Jangan mengekspos stack trace, kredensial, token, atau detail
  internal pada error production.
- Gunakan CSRF protection sesuai pola autentikasi Sanctum.
- Terapkan CORS secara terbatas sesuai domain frontend.
- Catat aktivitas sensitif dalam audit log tanpa menyimpan password,
  token, atau isi dokumen.
- Terapkan prinsip least privilege.
- Gunakan HTTPS saat deployment.
- Sediakan `.env.example`, tetapi jangan pernah menyertakan `.env`
  asli.
- Jangan menggunakan data pribadi nyata pada seeder atau demo.
- Terapkan kebijakan retensi dan penghapusan data yang sesuai
  kebutuhan organisasi.

---

## 10. API yang Diharapkan

Gunakan prefix `/api/v1` agar API lebih terstruktur.

Contoh endpoint:

### Auth

- `POST /api/v1/register`
- `POST /api/v1/login`
- `POST /api/v1/logout`
- `GET /api/v1/me`
- Endpoint reset password sesuai implementasi Laravel.

### Pemohon

- `GET /api/v1/submissions`
- `POST /api/v1/submissions`
- `GET /api/v1/submissions/{id}`
- `PUT /api/v1/submissions/{id}`
- `POST /api/v1/submissions/{id}/submit`
- `POST /api/v1/submissions/{id}/resubmit`
- `GET /api/v1/submissions/{id}/history`
- `POST /api/v1/submissions/{id}/documents`
- `DELETE /api/v1/submissions/{id}/documents/{documentId}` hanya jika
  status dan aturan mengizinkan.
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`

### Admin

- `GET /api/v1/admin/submissions`
- `GET /api/v1/admin/submissions/{id}`
- `POST /api/v1/admin/submissions/{id}/start-review`
- `POST /api/v1/admin/submissions/{id}/request-revision`
- `POST /api/v1/admin/submissions/{id}/approve`
- `POST /api/v1/admin/submissions/{id}/reject`
- `POST /api/v1/admin/submissions/{id}/record-isbn`
- `GET /api/v1/admin/reports/submissions`
- CRUD persyaratan dokumen sesuai otorisasi.

Endpoint di atas adalah rancangan awal. Sesuaikan nama dan metode HTTP
jika ada alasan teknis yang kuat, tetapi dokumentasikan perubahan. Semua
endpoint harus memiliki validasi, autentikasi, otorisasi, dan format
respons yang konsisten.

---

## 11. Standar Kualitas Kode

- Gunakan penamaan file, class, function, dan variabel yang konsisten.
- Pisahkan komponen UI, halaman, service API, schema validasi, dan
  tipe TypeScript.
- Jangan menaruh semua logika di satu komponen besar.
- Hindari duplikasi kode.
- Gunakan reusable components untuk input, tombol, dialog, badge
  status, dan tabel jika masuk akal.
- Tangani error API dengan pesan yang bisa dipahami pengguna.
- Jangan menggunakan `any` tanpa alasan yang jelas pada TypeScript.
- Jangan menggunakan mock data sebagai pengganti integrasi backend
  setelah fitur backend dikerjakan.
- Jika mock data digunakan saat membuat UI awal, beri label yang jelas
  dan ganti pada tahap integrasi.
- Jangan mengubah konfigurasi atau file yang tidak relevan tanpa
  alasan.
- Jangan menghapus fitur yang sudah berjalan ketika mengerjakan fitur
  baru.
- Jangan menulis pseudocode untuk bagian yang diminta siap jalan.
- Pastikan import, route, migration, dan dependensi benar-benar
  konsisten.
- Jalankan lint/build/test yang tersedia dan perbaiki error sebelum
  menyatakan tahap selesai.

---

## 12. Struktur Folder yang Disarankan

```text
isbn-hub/
├── frontend/                 # Next.js App Router
│   ├── public/
│   ├── src/
│   │   ├── app/              # Route, layouts, loading/error pages
│   │   ├── components/       # UI, layout, shared components
│   │   ├── features/         # auth, submissions, documents, admin
│   │   ├── lib/              # API helpers, utilities
│   │   ├── schemas/          # Zod schemas
│   │   ├── types/            # TypeScript types
│   │   └── hooks/
│   ├── .env.example
│   └── package.json
├── backend/                  # Laravel 13 REST API
│   ├── app/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   ├── storage/
│   ├── tests/
│   ├── .env.example
│   └── composer.json
├── docs/
│   ├── API.md
│   └── DATABASE.md
└── README.md
```

Struktur boleh disesuaikan dengan konvensi resmi Next.js dan Laravel 13,
tetapi pemisahan frontend-backend harus jelas.

---

## 13. Tahapan Pengerjaan

**WAJIB dikerjakan bertahap.** Pada setiap tahap, tampilkan file yang
dibuat/diubah dan isi kode lengkap untuk file tersebut. Jangan mengulang
semua file yang tidak berubah.

### Tahap 1 --- Analisis dan fondasi

- Ringkas kebutuhan dan asumsi.
- Identifikasi risiko teknis dan pertanyaan yang benar-benar
  menghalangi pengerjaan.
- Tentukan arsitektur Next.js + Laravel 13 API.
- Rancang ERD dalam Mermaid.
- Rancang alur status pengajuan.
- Buat struktur folder dan panduan setup awal.
- Jangan mulai menulis seluruh fitur sebelum fondasi disetujui.

### Tahap 2 --- Setup backend Laravel 13

- Inisialisasi Laravel 13.
- Konfigurasi database.
- Buat migration, model, seeder, dan relasi.
- Buat autentikasi Sanctum dan role/authorization.
- Siapkan format respons API dan error handling.

### Tahap 3 --- Setup frontend Next.js

- Inisialisasi Next.js dengan App Router dan TypeScript.
- Konfigurasi Tailwind CSS dan shadcn/ui.
- Buat routing, layout publik, layout dashboard, komponen umum, dan
  responsive navigation.
- Gunakan Server Components secara default dan Client Components hanya
  jika dibutuhkan.
- Buat tampilan awal dengan data sementara hanya untuk preview UI.

### Tahap 4 --- Autentikasi dan profil

- Registrasi, login, logout, sesi autentikasi, proteksi route, dan
  profil.
- Integrasikan Next.js ke Laravel API.
- Dokumentasikan konfigurasi Sanctum, cookie, CSRF, CORS, dan domain.
- Uji hak akses setiap role.

### Tahap 5 --- Pengajuan dan dokumen

- Formulir buku.
- Draft dan edit.
- Upload dokumen privat.
- Validasi backend.
- Daftar dan detail pengajuan pemohon.

### Tahap 6 --- Verifikasi admin

- Dashboard admin.
- Daftar dan detail pengajuan.
- Catatan revisi.
- Persetujuan, penolakan, dan pencatatan ISBN yang sudah sah
  ditetapkan.
- Validasi transisi status dan histori.

### Tahap 7 --- Notifikasi, pencarian, dan laporan

- Notifikasi aplikasi.
- Filter, pencarian, pagination, dan ekspor CSV.
- Audit log aktivitas sensitif.

### Tahap 8 --- Pengujian dan hardening

- Feature test API.
- Pengujian validasi dan otorisasi.
- Pengujian akses dokumen antar pengguna.
- Pengujian transisi status.
- Pengujian frontend dan build production.
- Perbaiki semua error yang ditemukan.

### Tahap 9 --- Dokumentasi dan deployment

- README lengkap.
- `.env.example`.
- Instruksi setup lokal.
- Instruksi migration dan seeder.
- Instruksi development dan build production Next.js.
- Panduan deployment frontend/backend/database.
- Checklist keamanan sebelum production.

### Aturan tiap tahap

1.  Jelaskan tujuan tahap secara singkat.
2.  Sebutkan file yang dibuat atau diubah.
3.  Berikan kode lengkap untuk setiap file baru atau file yang diubah.
4.  Berikan perintah terminal yang harus dijalankan.
5.  Jelaskan cara menguji hasil tahap tersebut.
6.  Sebutkan hasil yang seharusnya terlihat.
7.  Jangan lanjut ke tahap berikutnya sebelum tahap saat ini bisa
    dijalankan atau sebelum pengguna meminta lanjut.
8.  Jika mengubah file yang sudah ada, periksa konteks dan pertahankan
    kode yang masih diperlukan.
9.  Jika menemukan error, bantu diagnosis berdasarkan pesan error
    aktual, bukan menebak-nebak.

---

## 14. Format Jawaban AI Coding Assistant

Setiap respons pengerjaan wajib mengikuti format:

### Tahap

Nama dan tujuan tahap saat ini.

### Penjelasan

Ringkasan keputusan teknis dan alasan singkatnya.

### Struktur

Daftar folder/file yang dibuat atau diubah.

### Kode

Isi kode lengkap untuk file yang dibuat/diubah, disertai path file yang
jelas.

### Cara Menjalankan

Perintah terminal secara berurutan, termasuk direktori tempat perintah
dijalankan.

### Cara Menguji

Langkah konkret untuk memastikan fitur bekerja.

### Hasil yang Diharapkan

Apa yang seharusnya muncul atau terjadi.

### Next Step

Tahap berikutnya, tetapi jangan langsung mengerjakannya sebelum diminta.

---

## 15. Kriteria Selesai

Aplikasi dapat dianggap memenuhi MVP apabila:

- Pemohon dapat mendaftar dan login.
- Pemohon dapat membuat, menyimpan, dan mengirim pengajuan.
- Pemohon dapat mengunggah dokumen dengan aman.
- Pemohon hanya dapat melihat dan mengubah pengajuan miliknya sesuai
  status.
- Admin dapat memeriksa data dan dokumen.
- Admin dapat meminta revisi, menyetujui untuk diproses, atau menolak
  dengan alasan.
- Setiap perubahan status tercatat.
- Nomor ISBN hanya dapat dicatat ketika benar-benar sudah sah
  ditetapkan.
- Dashboard menampilkan data nyata dari database.
- Validasi backend dan kontrol akses berjalan.
- UI responsif di desktop dan mobile.
- Tidak ada error build yang belum diselesaikan.
- README cukup jelas agar developer lain dapat menjalankan proyek dari
  awal.

---

## 16. Instruksi Mulai

Mulai dari **Tahap 1 --- Analisis dan fondasi** saja.

Jangan langsung membuat semua fitur atau menumpahkan ribuan baris kode
dalam satu jawaban. Periksa spesifikasi, sebutkan asumsi yang digunakan,
buat rancangan arsitektur, ERD, alur status, dan rencana implementasi.
Jika tidak ada pertanyaan kritis yang menghalangi pengerjaan, gunakan
asumsi paling sederhana yang aman dan lanjutkan analisis tanpa menunda
dengan terlalu banyak pertanyaan.
