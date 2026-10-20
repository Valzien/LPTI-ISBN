# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — dependensi Composer (produk saja, tanpa dev)
###############################################################################
FROM composer:2 AS vendor

WORKDIR /app

# Berkas dependensi dulu agar lapisan cache-nya stabil antar-deploy
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

# Sumber aplikasi menyusul, lalu dump ulang autoloader agar kelas App ikut masuk.
# --no-scripts: package:discover dijalankan pada stage runtime (butuh source lengkap).
COPY . .
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

###############################################################################
# Stage 2 — runtime PHP 8.3 (PHP CLI server dibelakang $PORT dari Render)
###############################################################################
FROM php:8.3-cli

# Installer ekstensi resmi — menyelesaikan dependensi pustaka sistem otomatis.
# Yang sudah built-in akan dilewati. pgsql wajib (Neon/Postgres), mysqlopsional
# agar image tetap bisa dipakai ulang.
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
    pdo_pgsql pdo_mysql mbstring curl fileinfo tokenizer ctype \
    dom simplexml xml zip pcntl bcmath intl opcache

WORKDIR /app

# Konfigurasi PHP runtime (batas unggah selaras dengan batas dokumen 4 MB)
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

# Kode & dependensi. .env TIDAK ikut (lihat .dockerignore) — nilai environment
# datang dari Render (Render juga menerjemahkannya ke build-arg; jangan
# dipakai di Dockerfile ini karena bisa masuk ke layer image).
COPY --from=vendor /app/vendor ./vendor
COPY . .

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && mkdir -p \
      storage/framework/cache/data \
      storage/framework/sessions \
      storage/framework/views \
      storage/app/private \
      storage/logs \
      bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache \
 # Verifikasi build: bootstrap aplikasi + deteksi paket (gagal cepat bila ada
 # ekstensi PHP yang kurang)
 && php artisan package:discover --ansi

# Port sebenarnya mengikuti $PORT dari Render (default 8000 untuk lokal)
EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
