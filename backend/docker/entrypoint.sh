#!/bin/sh
# Entry point container backend LPTI-ISBN (Render / Docker).
# Menyiapkan direktori runtime, cache, migrasi, lalu menjalankan PHP CLI server
# pada $PORT yang diberikan platform (default 8000 untuk lokal).
set -e

cd /app

# Direktori runtime Laravel. storage/app/private sengaja dibuat ulang: bila
# Render memakai persistent disk, path ini di-mount ulang sehingga isi image
# tertimpa — direktori kosong harus tetap ada dan writable.
mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/app/private \
    storage/logs \
    bootstrap/cache

# Cache konfigurasi/rute/tampilan memakai environment runtime (Render),
# bukan nilai yang ada saat build image.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Migrasi idempoten setiap kali container mulai (deploy/restart).
php artisan migrate --force

# Seeder idempoten (aman diulang tiap boot):
# - persyaratan dokumen — hanya diisi bila tabel masih kosong;
# - akun super_admin dari ADMIN_EMAIL/ADMIN_PASSWORD — tanpa akun demo.
php artisan db:seed --class=DocumentRequirementSeeder --force
php artisan db:seed --class=AdminUserSeeder --force

# Worker antrean ringan di latar belakang. Notifikasi in-app tersimpan langsung
# ke database; worker disiapkan agar tugas antrean tidak menumpuk bila fitur
# berbasis tugas ditambahkan kelak (lihat docs/DEPLOYMENT.md §2.5).
php artisan queue:work --tries=3 --timeout=90 &

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
