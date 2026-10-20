import "server-only";

import { redirect } from "next/navigation";

import type { User } from "./types";
import { getCurrentUser } from "./session";

/** Nama cookie token httpOnly. */
export const TOKEN_COOKIE = "lpti_isbn_token";

/**
 * Mengecek apakah user memiliki salah satu role yang diizinkan.
 *
 * Mengembalikan true jika user memiliki role yang cocok, false jika tidak.
 */
export function hasAnyRole(user: User | null, roles: User["role"][]): boolean {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}

/**
 * Guard sisi server: hanya user yang sudah login yang boleh mengakses.
 * Bila belum login, redirect ke /login (dengan redirect param opsional).
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    const target = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/login";

    redirect(target);
  }

  return user;
}

/**
 * Guard sisi server: hanya user dengan role tertentu yang boleh mengakses.
 * Bila belum login → redirect /login; bila role tidak sesuai → redirect /dashboard
 * (pemohon) atau /admin sesuai prioritas, atau lempar 403 melalui redirect tidak ideal —
 * tapi untuk navigation guard, redirect ke halaman default per role lebih ramah.
 */
export async function requireRoles(
  roles: User["role"][],
  opts: {
    /** Path redirect jika tidak terotorisasi (fallback berdasarkan role). */
    unauthorizedTo?: string;
    /** Path asal untuk redirect login. */
    redirectTo?: string;
  } = {},
): Promise<User> {
  const user = await requireAuth(opts.redirectTo);

  if (!hasAnyRole(user, roles)) {
    const fallback =
      opts.unauthorizedTo ??
      (user.role === "admin" || user.role === "super_admin"
        ? "/admin"
        : "/dashboard");

    redirect(fallback);
  }

  return user;
}

/** Helper cepat: user wajib role pemohon (applicant). */
export async function requireApplicant(redirectTo?: string): Promise<User> {
  return requireRoles(["applicant"], { redirectTo });
}

/** Helper cepat: user wajib admin atau super_admin. */
export async function requireAdmin(redirectTo?: string): Promise<User> {
  return requireRoles(["admin", "super_admin"], { redirectTo });
}
