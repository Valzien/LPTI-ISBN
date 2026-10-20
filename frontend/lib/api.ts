import "server-only";

import { cookies } from "next/headers";

import { TOKEN_COOKIE } from "./constants";
import type { ApiResponse, ApiMeta } from "./types";

/**
 * Klien API sisi server (BFF) untuk REST API Laravel /api/v1.
 *
 * Token Sanctum disimpan HANYA di cookie httpOnly yang dikelola oleh Next.js;
 * browser tidak pernah melihat token ini (keputusan arsitektur Tahap 1 §3.2).
 * Semua pemanggilan ke Laravel dari Server Components / Server Functions /
 * Route Handlers dilakukan lewat apiFetch().
 */

// Re-export agar import lama dari "@/lib/api" tetap berfungsi.
export { TOKEN_COOKIE };

/** URL dasar backend Laravel dari .env.local (API_URL). */
const API_URL = process.env.API_URL ?? "http://localhost:8000";

/** Batas waktu tunggu respons API (ms) agar halaman tidak menggantung. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Error yang membawa kode status HTTP dan pesan dari backend. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Body JSON — otomatis di-stringify. Jangan isi bersamaan dengan formData. */
  body?: unknown;
  /** Body multipart untuk upload file (header Content-Type diatur fetch). */
  formData?: FormData;
  /** Sertakan token Bearer dari cookie. Default: true. */
  auth?: boolean;
}

/** Membaca token sesi dari cookie httpOnly (sisi server saja). */
export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

/**
 * Memanggil API Laravel dan mengembalikan isi `data` dari envelope standar
 * `{ success, data }` (docs/API.md §Respons).
 *
 * Melempar ApiError berisi pesan Bahasa Indonesia dari backend bila gagal.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { data } = await apiFetchEnvelope<T>(path, options);

  return data;
}

/**
 * Varian untuk daftar berpaginasi: mengembalikan `data` + `meta`
 * (current_page, last_page, total — docs/API.md §Respons).
 */
export async function apiFetchWithMeta<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T; meta: ApiMeta }> {
  const { data, meta } = await apiFetchEnvelope<T>(path, options);

  return {
    data,
    meta: meta ?? { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  };
}

async function apiFetchEnvelope<T>(
  path: string,
  options: ApiFetchOptions,
): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = "GET", body, formData, auth = true } = options;

  const headers: Record<string, string> = { Accept: "application/json" };

  if (auth) {
    const token = await getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (formData === undefined && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(
      0,
      "Tidak dapat terhubung ke server API. Pastikan backend berjalan (php artisan serve).",
    );
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Respons bukan JSON (mis. halaman error) — biarkan null.
  }

  if (payload === null || payload.success !== true) {
    const message =
      payload !== null && payload.success === false
        ? payload.message
        : `Terjadi kesalahan pada server (HTTP ${response.status}).`;

    const errors =
      payload !== null && payload.success === false
        ? payload.errors
        : undefined;

    throw new ApiError(response.status, message, errors);
  }

  return { data: payload.data, meta: payload.meta as ApiMeta | undefined };
}
