import "server-only";

import { apiFetch, getToken } from "./api";
import type { User } from "./types";

/**
 * Mengambil user yang sedang login berdasarkan cookie sesi httpOnly.
 *
 * Mengembalikan null bila: belum login, token kedaluwarsa/dicabut,
 * atau backend tidak terjangkau (perlakukan sebagai tamu agar halaman
 * tetap dapat dirender; guard halaman dilakukan terpisah).
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getToken();

  if (!token) {
    return null;
  }

  try {
    return await apiFetch<User>("/api/v1/me");
  } catch {
    return null;
  }
}
