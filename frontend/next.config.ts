import type { NextConfig } from "next";

/**
 * Header keamanan dasar untuk seluruh respons aplikasi.
 *
 * `X-Frame-Options` & `frame-ancestors` mencegah clickjacking pada formulir
 * pengajuan yang berisi data pribadi, `nosniff` mencegah dokumen privat
 * ditafsirkan sebagai tipe lain, dan `Referrer-Policy` membatasi kebocoran
 * URL antar-situs. CSP sengaja belum diaktifkan agar tidak mematahkan
 * komponen klien yang ada — lihat docs/DEPLOYMENT.md (Tahap 9).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    serverActions: {
      // Unggah dokumen lewat Server Action. Default Next.js hanya 1 MB —
      // naikkan ke 4,2 MB agar aman untuk file 4 MB + overhead multipart
      // (10–20 KB), dan tetap di bawah limit body 4.5 MB Vercel Hobby.
      bodySizeLimit: "4.2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // cacheComponents sengaja TIDAK diaktifkan: aplikasi ini auth-driven
  // (cookies() dibaca di layout untuk guard & role) — model Cache Components
  // mengharuskan Suspense di semua akses tersebut dan tidak cocok untuk
  // halaman yang selalu dinamis. partialPrefetching ikut dilepas karena
  // mensyaratkan cacheComponents (lihat error next build).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
