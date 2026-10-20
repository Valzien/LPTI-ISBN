/**
 * Konstanta lintas-modul yang AMAN dipakai di sisi mana pun
 * (Server Components, Route Handlers, dan proxy.ts) — sengaja tidak
 * mengimpor "server-only".
 */

/** Nama cookie httpOnly penyimpan token Sanctum (hanya dibaca/ditulis server). */
export const TOKEN_COOKIE = "lpti_isbn_token";
