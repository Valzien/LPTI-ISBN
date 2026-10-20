import { NextResponse, type NextRequest } from "next/server";

import { TOKEN_COOKIE } from "@/lib/constants";

/**
 * Optimistic guard Next.js 16 (proxy.ts).
 *
 * Hanya mengecek KEBERADAAN cookie sesi untuk area terproteksi:
 * tamu diarahkan ke /login?redirect=<path-asal>.
 * Validasi token (ke backend) dan role tetap dilakukan oleh guard di
 * layout & halaman (lib/auth.ts) — sesuai panduan Next bahwa proxy
 * bukan pengganti manajemen sesi/otorisasi penuh.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pengajuan/:path*",
    "/profil/:path*",
    "/admin/:path*",
  ],
};
