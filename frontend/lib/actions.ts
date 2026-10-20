"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch, TOKEN_COOKIE } from "./api";
import { requireAdmin, requireAuth } from "./auth";
import type { BookSubmission, User } from "./types";

/** State standar untuk form berbasis Server Actions. */
export interface FormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Alias: form autentikasi & profil (Tahap 4). */
export type AuthFormState = FormState;

/** Alias: form pengajuan & dokumen (Tahap 5). */
export type SubmissionFormState = FormState;

const EMPTY_STATE: AuthFormState = { ok: false, message: "" };

/** Simpan token sesi ke cookie httpOnly (hanya dari Server Action). */
async function simpanTokenSesi(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
}

/** Hapus cookie sesi (bila masih ada). */
async function hapusCookieSesi(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function tujuanBerdasarkanRole(user: User): string {
  return user.role === "admin" || user.role === "super_admin"
    ? "/admin"
    : "/dashboard";
}

/** Server Action: login, simpan token ke cookie httpOnly, lalu redirect. */
export async function loginAction(
  _prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return {
      ...EMPTY_STATE,
      message: "Email dan password wajib diisi.",
      fieldErrors: {
        email: !email ? ["Email wajib diisi."] : undefined,
        password: !password ? ["Password wajib diisi."] : undefined,
      },
    };
  }

  try {
    const data = await apiFetch<{ token: string; user: User }>(
      "/api/v1/login",
      {
        method: "POST",
        body: { email, password },
        auth: false,
      },
    );

    await simpanTokenSesi(data.token);

    // Hanya ikuti redirect internal yang valid (mencegah open redirect).
    const tujuan = formData.get("redirect")?.toString() ?? "";
    const aman =
      tujuan.startsWith("/") && !tujuan.startsWith("//") && !tujuan.includes(":");

    redirect(aman ? tujuan : tujuanBerdasarkanRole(data.user));
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      errors?: Record<string, string[]>;
    };

    // redirect() melempar error khusus — jangan tangkap sebagai kegagalan login.
    if (err.message === "NEXT_REDIRECT") {
      throw error;
    }

    if (err.status === 401) {
      return { ...EMPTY_STATE, message: "Email atau password salah." };
    }

    return {
      ...EMPTY_STATE,
      message: err.message || "Terjadi kesalahan saat login.",
      errors: err.errors,
      fieldErrors: err.errors,
    };
  }

  return EMPTY_STATE;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  applicant_type: "author" | "publisher_rep";
  publisher_name: string;
  address: string;
}

/** Server Action: registrasi pemohon, simpan sesi, lalu ke dashboard. */
export async function registerAction(
  _prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  const payload: RegisterPayload = {
    name: formData.get("name")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim() ?? "",
    password: formData.get("password")?.toString() ?? "",
    password_confirmation:
      formData.get("password_confirmation")?.toString() ?? "",
    phone: formData.get("phone")?.toString().trim() ?? "",
    applicant_type:
      formData.get("applicant_type")?.toString() === "publisher_rep"
        ? "publisher_rep"
        : "author",
    publisher_name: formData.get("publisher_name")?.toString().trim() ?? "",
    address: formData.get("address")?.toString().trim() ?? "",
  };

  if (!payload.name || !payload.email || !payload.password) {
    return {
      ...EMPTY_STATE,
      message: "Nama, email, dan password wajib diisi.",
      fieldErrors: {
        name: !payload.name ? ["Nama lengkap wajib diisi."] : undefined,
        email: !payload.email ? ["Email wajib diisi."] : undefined,
        password: !payload.password ? ["Password wajib diisi."] : undefined,
      },
    };
  }

  if (payload.applicant_type === "publisher_rep" && !payload.publisher_name) {
    return {
      ...EMPTY_STATE,
      message: "Nama penerbit wajib diisi untuk perwakilan penerbit.",
      fieldErrors: {
        publisher_name: ["Nama penerbit wajib diisi untuk perwakilan penerbit."],
      },
    };
  }

  try {
    const data = await apiFetch<{ token: string; user: User }>(
      "/api/v1/register",
      {
        method: "POST",
        body: payload,
        auth: false,
      },
    );

    await simpanTokenSesi(data.token);
    redirect("/dashboard");
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (err.message === "NEXT_REDIRECT") {
      throw error;
    }

    return {
      ...EMPTY_STATE,
      message: err.message || "Terjadi kesalahan saat registrasi.",
      errors: err.errors,
      fieldErrors: err.errors,
    };
  }

  return EMPTY_STATE;
}

interface UpdateProfilePayload {
  name: string;
  phone: string;
  applicant_type: "author" | "publisher_rep";
  publisher_name: string;
  address: string;
}

/** Server Action: perbarui profil milik sendiri (PUT /api/v1/me). */
export async function updateProfileAction(
  _prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  const payload: UpdateProfilePayload = {
    name: formData.get("name")?.toString().trim() ?? "",
    phone: formData.get("phone")?.toString().trim() ?? "",
    applicant_type:
      formData.get("applicant_type")?.toString() === "publisher_rep"
        ? "publisher_rep"
        : "author",
    publisher_name: formData.get("publisher_name")?.toString().trim() ?? "",
    address: formData.get("address")?.toString().trim() ?? "",
  };

  if (!payload.name) {
    return {
      ...EMPTY_STATE,
      message: "Nama lengkap wajib diisi.",
      fieldErrors: { name: ["Nama lengkap wajib diisi."] },
    };
  }

  if (payload.applicant_type === "publisher_rep" && !payload.publisher_name) {
    return {
      ...EMPTY_STATE,
      message: "Nama penerbit wajib diisi untuk perwakilan penerbit.",
      fieldErrors: {
        publisher_name: ["Nama penerbit wajib diisi untuk perwakilan penerbit."],
      },
    };
  }

  try {
    await apiFetch<User>("/api/v1/me", {
      method: "PUT",
      body: payload,
    });

    redirect("/profil?success=1");
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (err.message === "NEXT_REDIRECT") {
      throw error;
    }

    if (err.status === 401) {
      await hapusCookieSesi();
      redirect("/login");
    }

    return {
      ...EMPTY_STATE,
      message: err.message || "Gagal memperbarui profil.",
      errors: err.errors,
      fieldErrors: err.errors,
    };
  }

  return EMPTY_STATE;
}

/** Server Action: logout — revoke token di backend + hapus cookie sesi. */
export async function logoutAction(): Promise<void> {
  try {
    await apiFetch("/api/v1/logout", { method: "POST" });
  } catch {
    // Token mungkin sudah tidak valid — cookie tetap dibersihkan.
  } finally {
    await hapusCookieSesi();
  }

  redirect("/login");
}

/* ===========================================================================
 * Pengajuan & dokumen (Tahap 5)
 * ========================================================================== */

/**
 * Pemetaan error umum untuk aksi pengajuan: NEXT_REDIRECT diteruskan,
 * sesi kedaluwarsa (401) dibersihkan + ke halaman login, selebihnya
 * menjadi pesan state form (Bahasa Indonesia dari backend).
 */
async function stateDariError(
  error: unknown,
  pesanDefault: string,
): Promise<SubmissionFormState> {
  const err = error as {
    status?: number;
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (err.message === "NEXT_REDIRECT") {
    throw error;
  }

  if (err.status === 401) {
    await hapusCookieSesi();
    redirect("/login");
  }

  return {
    ok: false,
    message: err.message || pesanDefault,
    errors: err.errors,
    fieldErrors: err.errors,
  };
}

/**
 * Baca seluruh field formulir buku sebagai string — backend (Laravel)
 * mengubah string kosong menjadi null dan mem-validasi tipe angkanya.
 */
function bacaFieldBuku(formData: FormData): Record<string, string> {
  const fields = [
    "title",
    "subtitle",
    "main_author",
    "additional_authors",
    "editor",
    "translator",
    "publisher_name",
    "planned_publication_year",
    "edition",
    "language",
    "publication_format",
    "synopsis",
    "page_count",
    "book_size",
    "notes",
  ];

  const payload: Record<string, string> = {};

  for (const field of fields) {
    payload[field] = formData.get(field)?.toString().trim() ?? "";
  }

  return payload;
}

/** Validasi wajib isi minimum yang sama dengan backend — untuk umpan balik cepat. */
function fieldErrorsBukuWajib(payload: Record<string, string>): FormState | null {
  const wajib: Record<string, string> = {
    title: "Judul buku wajib diisi.",
    main_author: "Penulis utama wajib diisi.",
    publisher_name: "Nama penerbit wajib diisi.",
    language: "Bahasa buku wajib diisi.",
    publication_format: "Format terbitan wajib diisi.",
  };

  const fieldErrors: Record<string, string[] | undefined> = {};
  let adaKosong = false;

  for (const [field, pesan] of Object.entries(wajib)) {
    if (!payload[field]) {
      fieldErrors[field] = [pesan];
      adaKosong = true;
    }
  }

  if (!adaKosong) {
    return null;
  }

  return {
    ok: false,
    message: "Mohon lengkapi field yang bertanda wajib diisi.",
    fieldErrors,
  };
}

/** Server Action: buat pengajuan draft baru (POST /api/v1/submissions). */
export async function createSubmissionAction(
  _prevState: SubmissionFormState | null,
  formData: FormData,
): Promise<SubmissionFormState> {
  const payload = bacaFieldBuku(formData);

  const kosong = fieldErrorsBukuWajib(payload);

  if (kosong !== null) {
    return kosong;
  }

  try {
    const data = await apiFetch<BookSubmission>("/api/v1/submissions", {
      method: "POST",
      body: payload,
    });

    redirect(`/pengajuan/${data.id}?created=1`);
  } catch (error) {
    return await stateDariError(error, "Gagal membuat pengajuan.");
  }

  return { ok: false, message: "" };
}

/** Server Action: ubah data buku — PUT penuh (semua field wajib dikirim). */
export async function updateSubmissionAction(
  _prevState: SubmissionFormState | null,
  formData: FormData,
): Promise<SubmissionFormState> {
  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  const payload = bacaFieldBuku(formData);

  const kosong = fieldErrorsBukuWajib(payload);

  if (kosong !== null) {
    return kosong;
  }

  try {
    await apiFetch<BookSubmission>(`/api/v1/submissions/${id}`, {
      method: "PUT",
      body: payload,
    });

    redirect(`/pengajuan/${id}?updated=1`);
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal memperbarui pengajuan. Pengajuan hanya dapat diubah saat berstatus Draft atau Perlu Revisi.",
    );
  }

  return { ok: false, message: "" };
}

/** Server Action: hapus pengajuan draft (DELETE → redirect ke daftar). */
export async function deleteSubmissionAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return;
  }

  try {
    await apiFetch(`/api/v1/submissions/${id}`, { method: "DELETE" });
  } catch {
    // Hanya draft yang boleh dihapus; biarkan pesan muncul di halaman berikutnya.
  }

  redirect("/pengajuan?deleted=1");
}

/** Server Action: ajukan draft → submitted (422 bila dokumen wajib kurang). */
export async function submitSubmissionAction(
  _prevState: SubmissionFormState | null,
  formData: FormData,
): Promise<SubmissionFormState> {
  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/submissions/${id}/submit`, { method: "POST" });

    redirect(`/pengajuan/${id}`);
  } catch (error) {
    return await stateDariError(error, "Gagal mengajukan pengajuan.");
  }

  return { ok: false, message: "" };
}

/** Server Action: ajukan ulang needs_revision → resubmitted. */
export async function resubmitSubmissionAction(
  _prevState: SubmissionFormState | null,
  formData: FormData,
): Promise<SubmissionFormState> {
  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/submissions/${id}/resubmit`, { method: "POST" });

    redirect(`/pengajuan/${id}`);
  } catch (error) {
    return await stateDariError(error, "Gagal mengajukan ulang pengajuan.");
  }

  return { ok: false, message: "" };
}

/** Server Action: unggah satu dokumen persyaratan (multipart privat). */
export async function uploadDocumentAction(
  _prevState: SubmissionFormState | null,
  formData: FormData,
): Promise<SubmissionFormState> {
  const submissionId = formData.get("submission_id")?.toString() ?? "";
  const requirementId = formData.get("document_requirement_id")?.toString() ?? "";
  const file = formData.get("file");

  if (!/^\d+$/.test(submissionId) || !/^\d+$/.test(requirementId)) {
    return { ok: false, message: "Data unggahan tidak valid." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      message: "Pilih berkas dokumen terlebih dahulu.",
      fieldErrors: { file: ["Berkas dokumen wajib dipilih."] },
    };
  }

  const multipart = new FormData();

  multipart.set("file", file);
  multipart.set("document_requirement_id", requirementId);

  try {
    await apiFetch(`/api/v1/submissions/${submissionId}/documents`, {
      method: "POST",
      formData: multipart,
    });

    revalidatePath(`/pengajuan/${submissionId}`);

    return { ok: true, message: "Dokumen berhasil diunggah." };
  } catch (error) {
    return await stateDariError(error, "Gagal mengunggah dokumen.");
  }
}

/** Server Action: hapus satu dokumen milik pengajuan sendiri. */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const submissionId = formData.get("submission_id")?.toString() ?? "";
  const documentId = formData.get("document_id")?.toString() ?? "";

  if (!/^\d+$/.test(submissionId) || !/^\d+$/.test(documentId)) {
    return;
  }

  try {
    await apiFetch(
      `/api/v1/submissions/${submissionId}/documents/${documentId}`,
      { method: "DELETE" },
    );

    revalidatePath(`/pengajuan/${submissionId}`);
  } catch {
    // Gagal menghapus (mis. status sudah terkunci) — abaikan; daftar dokumen
    // tetap menampilkan kondisi terkini dari server.
  }
}

/* ===========================================================================
 * Verifikasi admin (Tahap 6)
 * ========================================================================== */

/** Alias: form verifikasi admin (Tahap 6). */
export type AdminFormState = FormState;

/**
 * Baca & validasi id pengajuan dari form (angka saja);
 * null bila tidak valid.
 */
function bacaIdPengajuan(formData: FormData): string | null {
  const id = formData.get("id")?.toString() ?? "";

  return /^\d+$/.test(id) ? id : null;
}

/** Validasi catatan/alasan singkat — mencerminkan aturan backend (5–2000). */
function validasiCatatan(nilai: string, label: string): string | null {
  if (!nilai) {
    return `${label} wajib diisi.`;
  }

  if (nilai.length < 5) {
    return `${label} minimal 5 karakter.`;
  }

  if (nilai.length > 2000) {
    return `${label} maksimal 2000 karakter.`;
  }

  return null;
}

/** Validasi format ISBN-10/ISBN-13 — mencerminkan aturan backend. */
function validasiIsbn(nilai: string): string | null {
  if (!nilai) {
    return "Nomor ISBN wajib diisi.";
  }

  const digits = nilai.replace(/[-\s]/g, "");

  if (!/^(\d{9}[\dXx]|\d{13})$/.test(digits)) {
    return "Format nomor ISBN tidak valid. Gunakan ISBN-10 atau ISBN-13 (contoh: 978-602-1234-56-7).";
  }

  return null;
}

/**
 * Server Action admin: mulai verifikasi (submitted/resubmitted → under_review).
 * Otorisasi dijaga ganda: guard requireAdmin + role check di backend.
 */
export async function startReviewAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = bacaIdPengajuan(formData);

  if (id === null) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/admin/submissions/${id}/start-review`, {
      method: "POST",
    });

    redirect(`/admin/pengajuan/${id}?review=1`);
  } catch (error) {
    return await stateDariError(error, "Gagal memulai verifikasi.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin: minta revisi — catatan wajib (under_review → needs_revision). */
export async function requestRevisionAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = bacaIdPengajuan(formData);
  const note = formData.get("note")?.toString().trim() ?? "";

  if (id === null) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  const salah = validasiCatatan(note, "Catatan revisi");

  if (salah !== null) {
    return {
      ok: false,
      message: salah,
      fieldErrors: { note: [salah] },
    };
  }

  try {
    await apiFetch(`/api/v1/admin/submissions/${id}/request-revision`, {
      method: "POST",
      body: { note },
    });

    redirect(`/admin/pengajuan/${id}?revisi=1`);
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal mengirim permintaan revisi. Catatan revisi wajib diisi.",
    );
  }

  return { ok: false, message: "" };
}

/** Server Action admin: setujui (under_review → approved_for_processing). */
export async function approveAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = bacaIdPengajuan(formData);

  if (id === null) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/admin/submissions/${id}/approve`, {
      method: "POST",
    });

    redirect(`/admin/pengajuan/${id}?disetujui=1`);
  } catch (error) {
    return await stateDariError(error, "Gagal menyetujui pengajuan.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin: tolak — alasan wajib (under_review → rejected). */
export async function rejectAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = bacaIdPengajuan(formData);
  const reason = formData.get("reason")?.toString().trim() ?? "";

  if (id === null) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  const salah = validasiCatatan(reason, "Alasan penolakan");

  if (salah !== null) {
    return {
      ok: false,
      message: salah,
      fieldErrors: { reason: [salah] },
    };
  }

  try {
    await apiFetch(`/api/v1/admin/submissions/${id}/reject`, {
      method: "POST",
      body: { reason },
    });

    redirect(`/admin/pengajuan/${id}?ditolak=1`);
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal menolak pengajuan. Alasan penolakan wajib diisi.",
    );
  }

  return { ok: false, message: "" };
}

/**
 * Server Action admin: catat nomor ISBN yang sudah sah ditetapkan pihak
 * berwenang (approved_for_processing → isbn_assigned). Sistem TIDAK PERNAH
 * menghasilkan nomor ISBN — hanya mencatat nomor yang ada (master prompt §2).
 */
export async function recordIsbnAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = bacaIdPengajuan(formData);
  const isbnNumber = formData.get("isbn_number")?.toString().trim() ?? "";
  const isbnAssignedAt =
    formData.get("isbn_assigned_at")?.toString().trim() ?? "";
  const isbnSourceNote =
    formData.get("isbn_source_note")?.toString().trim() ?? "";

  if (id === null) {
    return { ok: false, message: "ID pengajuan tidak valid." };
  }

  const fieldErrors: Record<string, string[] | undefined> = {};
  const salahIsbn = validasiIsbn(isbnNumber);

  if (salahIsbn !== null) {
    fieldErrors.isbn_number = [salahIsbn];
  }

  if (!isbnAssignedAt) {
    fieldErrors.isbn_assigned_at = ["Tanggal penetapan ISBN wajib diisi."];
  }

  if (!isbnSourceNote) {
    fieldErrors.isbn_source_note = ["Sumber/keterangan penerbitan wajib diisi."];
  } else if (isbnSourceNote.length > 1000) {
    fieldErrors.isbn_source_note = [
      "Sumber/keterangan penerbitan maksimal 1000 karakter.",
    ];
  }

  if (Object.values(fieldErrors).some((v) => v !== undefined)) {
    return {
      ok: false,
      message: "Mohon lengkapi data pencatatan ISBN dengan benar.",
      fieldErrors,
    };
  }

  try {
    await apiFetch(`/api/v1/admin/submissions/${id}/record-isbn`, {
      method: "POST",
      body: {
        isbn_number: isbnNumber,
        isbn_assigned_at: isbnAssignedAt,
        isbn_source_note: isbnSourceNote,
      },
    });

    redirect(`/admin/pengajuan/${id}?isbn=1`);
  } catch (error) {
    return await stateDariError(error, "Gagal mencatat nomor ISBN.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin: simpan hasil pemeriksaan satu dokumen (PATCH). */
export async function reviewDocumentAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const submissionId = formData.get("submission_id")?.toString() ?? "";
  const documentId = formData.get("document_id")?.toString() ?? "";
  const reviewStatus = formData.get("review_status")?.toString() ?? "";
  const adminNote = formData.get("admin_note")?.toString().trim() ?? "";

  if (!/^\d+$/.test(submissionId) || !/^\d+$/.test(documentId)) {
    return { ok: false, message: "Data dokumen tidak valid." };
  }

  if (!["pending", "approved", "rejected"].includes(reviewStatus)) {
    return {
      ok: false,
      message: "Hasil pemeriksaan dokumen tidak valid.",
      fieldErrors: { review_status: ["Hasil pemeriksaan tidak valid."] },
    };
  }

  if (adminNote.length > 1000) {
    return {
      ok: false,
      message: "Catatan admin maksimal 1000 karakter.",
      fieldErrors: { admin_note: ["Catatan admin maksimal 1000 karakter."] },
    };
  }

  try {
    await apiFetch(`/api/v1/admin/documents/${documentId}/review`, {
      method: "PATCH",
      body: {
        review_status: reviewStatus,
        admin_note: adminNote ? adminNote : null,
      },
    });

    revalidatePath(`/admin/pengajuan/${submissionId}`);

    return { ok: true, message: "Hasil pemeriksaan dokumen disimpan." };
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal menyimpan hasil pemeriksaan dokumen.",
    );
  }
}

/* ===========================================================================
 * Notifikasi (Tahap 7)
 * ========================================================================== */

/** Server Action: tandai satu notifikasi milik sendiri sudah dibaca. */
export async function markNotificationReadAction(
  formData: FormData,
): Promise<void> {
  await requireAuth();

  const id = formData.get("id")?.toString() ?? "";

  if (!id) {
    return;
  }

  try {
    await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    });
  } catch (error) {
    await stateDariError(error, "Gagal menandai notifikasi sudah dibaca.");

    return;
  }

  revalidatePath("/notifikasi");
  revalidatePath("/admin/notifikasi");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

/** Server Action: tandai seluruh notifikasi milik sendiri sudah dibaca. */
export async function markAllNotificationsReadAction(): Promise<void> {
  await requireAuth();

  try {
    await apiFetch("/api/v1/notifications/read-all", { method: "PATCH" });
  } catch (error) {
    await stateDariError(error, "Gagal menandai semua notifikasi.");

    return;
  }

  revalidatePath("/notifikasi");
  revalidatePath("/admin/notifikasi");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

/* ===========================================================================
 * Manajemen akun pengguna (Tahap 7 — khusus super_admin)
 * ========================================================================== */

/** Guard tambahan di action: hanya admin utama yang boleh mengelola akun. */
async function pastikanAdminUtama(): Promise<FormState | null> {
  const user = await requireAdmin();

  return user.role === "super_admin"
    ? null
    : {
        ok: false,
        message:
          "Hanya admin utama yang dapat mengelola akun pengguna.",
      };
}

interface UserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  applicant_type: string;
  publisher_name: string;
  address: string;
}

function bacaPayloadPengguna(formData: FormData): UserPayload {
  return {
    name: formData.get("name")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim() ?? "",
    password: formData.get("password")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
    phone: formData.get("phone")?.toString().trim() ?? "",
    applicant_type: formData.get("applicant_type")?.toString() ?? "",
    publisher_name: formData.get("publisher_name")?.toString().trim() ?? "",
    address: formData.get("address")?.toString().trim() ?? "",
  };
}

/** Validasi akun — mencerminkan aturan backend (Store/UpdateUserRequest). */
function validasiPayloadPengguna(
  payload: UserPayload,
  mode: "create" | "edit",
): FormState | null {
  const fieldErrors: Record<string, string[] | undefined> = {};

  if (payload.name.length < 3) {
    fieldErrors.name = ["Nama minimal 3 karakter."];
  }

  if (!payload.email) {
    fieldErrors.email = ["Email wajib diisi."];
  }

  if (!["applicant", "admin", "super_admin"].includes(payload.role)) {
    fieldErrors.role = ["Role tidak valid."];
  }

  if (mode === "create" && !payload.password) {
    fieldErrors.password = ["Kata sandi wajib diisi."];
  } else if (payload.password && payload.password.length < 8) {
    fieldErrors.password = ["Kata sandi minimal 8 karakter."];
  }

  if (payload.applicant_type && !["author", "publisher_rep"].includes(payload.applicant_type)) {
    fieldErrors.applicant_type = ["Jenis pemohon tidak valid."];
  }

  if (Object.values(fieldErrors).some((v) => v !== undefined)) {
    return {
      ok: false,
      message: "Mohon lengkapi data akun dengan benar.",
      fieldErrors,
    };
  }

  return null;
}

/** Body API: kosongkan applicant_type bila role bukan pemohon. */
function bodyPengguna(payload: UserPayload): Record<string, string | null> {
  return {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: payload.role,
    phone: payload.phone || null,
    applicant_type:
      payload.role === "applicant" ? payload.applicant_type || null : null,
    publisher_name: payload.publisher_name || null,
    address: payload.address || null,
  };
}

/** Server Action admin utama: buat akun baru (POST /api/v1/admin/users). */
export async function createUserAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const ditolak = await pastikanAdminUtama();

  if (ditolak !== null) {
    return ditolak;
  }

  const payload = bacaPayloadPengguna(formData);
  const salah = validasiPayloadPengguna(payload, "create");

  if (salah !== null) {
    return salah;
  }

  try {
    await apiFetch("/api/v1/admin/users", {
      method: "POST",
      body: bodyPengguna(payload),
    });

    redirect("/admin/pengguna?created=1");
  } catch (error) {
    return await stateDariError(error, "Gagal membuat akun pengguna.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin utama: perbarui akun (PUT — kata sandi opsional). */
export async function updateUserAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const ditolak = await pastikanAdminUtama();

  if (ditolak !== null) {
    return ditolak;
  }

  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID akun tidak valid." };
  }

  const payload = bacaPayloadPengguna(formData);
  const salah = validasiPayloadPengguna(payload, "edit");

  if (salah !== null) {
    return salah;
  }

  try {
    await apiFetch(`/api/v1/admin/users/${id}`, {
      method: "PUT",
      body: bodyPengguna(payload),
    });

    redirect("/admin/pengguna?updated=1");
  } catch (error) {
    return await stateDariError(error, "Gagal memperbarui akun pengguna.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin utama: hapus akun (409 bila masih punya pengajuan). */
export async function deleteUserAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const ditolak = await pastikanAdminUtama();

  if (ditolak !== null) {
    return ditolak;
  }

  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID akun tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });

    redirect("/admin/pengguna?deleted=1");
  } catch (error) {
    return await stateDariError(error, "Gagal menghapus akun pengguna.");
  }

  return { ok: false, message: "" };
}

/* ===========================================================================
 * CRUD persyaratan dokumen (Tahap 7)
 * ========================================================================== */

interface RequirementPayload {
  name: string;
  description: string;
  allowed_mime_types: string[];
  max_file_size: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

/** Validasi MIME sederhana — sama dengan pola backend (tipe/tipe). */
const POLA_MIME = /^[a-z0-9]+\/[a-z0-9.+-]+$/;

function bacaPayloadPersyaratan(
  formData: FormData,
): { payload: RequirementPayload | null; state: FormState | null } {
  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";
  const mimeMentah = formData.get("allowed_mime_types")?.toString() ?? "";
  const ukuranMb = Number.parseFloat(
    formData.get("max_file_size_mb")?.toString() ?? "",
  );
  const sortMentah = Number.parseInt(
    formData.get("sort_order")?.toString() ?? "0",
    10,
  );

  const mime = mimeMentah
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const fieldErrors: Record<string, string[] | undefined> = {};

  if (name.length < 3) {
    fieldErrors.name = ["Nama persyaratan minimal 3 karakter."];
  }

  if (mime.length === 0) {
    fieldErrors.allowed_mime_types = [
      "Daftar tipe berkas yang diizinkan wajib diisi.",
    ];
  } else if (mime.some((item) => !POLA_MIME.test(item))) {
    fieldErrors.allowed_mime_types = [
      "Format tipe berkas tidak valid (contoh: application/pdf).",
    ];
  }

  if (!Number.isFinite(ukuranMb) || ukuranMb <= 0 || ukuranMb > 4) {
    fieldErrors.max_file_size_mb = [
      "Ukuran maksimum berkas harus antara 0,01 dan 4 MB.",
    ];
  }

  if (!Number.isFinite(sortMentah) || sortMentah < 0 || sortMentah > 999) {
    fieldErrors.sort_order = ["Urutan harus antara 0 dan 999."];
  }

  if (Object.values(fieldErrors).some((v) => v !== undefined)) {
    return {
      payload: null,
      state: {
        ok: false,
        message: "Mohon lengkapi data persyaratan dengan benar.",
        fieldErrors,
      },
    };
  }

  return {
    payload: {
      name,
      description,
      allowed_mime_types: mime,
      max_file_size: Math.round(ukuranMb * 1024 * 1024),
      is_required: formData.get("is_required") === "1",
      is_active: formData.get("is_active") === "1",
      sort_order: sortMentah,
    },
    state: null,
  };
}

/** Server Action admin: buat persyaratan dokumen baru. */
export async function createRequirementAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const { payload, state } = bacaPayloadPersyaratan(formData);

  if (payload === null || state !== null) {
    return state ?? { ok: false, message: "Data persyaratan tidak valid." };
  }

  try {
    await apiFetch("/api/v1/admin/document-requirements", {
      method: "POST",
      body: payload,
    });

    redirect("/admin/persyaratan?created=1");
  } catch (error) {
    return await stateDariError(error, "Gagal membuat persyaratan dokumen.");
  }

  return { ok: false, message: "" };
}

/** Server Action admin: perbarui persyaratan dokumen (PUT penuh). */
export async function updateRequirementAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID persyaratan tidak valid." };
  }

  const { payload, state } = bacaPayloadPersyaratan(formData);

  if (payload === null || state !== null) {
    return state ?? { ok: false, message: "Data persyaratan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/admin/document-requirements/${id}`, {
      method: "PUT",
      body: payload,
    });

    redirect("/admin/persyaratan?updated=1");
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal memperbarui persyaratan dokumen.",
    );
  }

  return { ok: false, message: "" };
}

/** Server Action admin: hapus persyaratan (409 bila sudah dipakai dokumen). */
export async function deleteRequirementAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const id = formData.get("id")?.toString() ?? "";

  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "ID persyaratan tidak valid." };
  }

  try {
    await apiFetch(`/api/v1/admin/document-requirements/${id}`, {
      method: "DELETE",
    });

    redirect("/admin/persyaratan?deleted=1");
  } catch (error) {
    return await stateDariError(
      error,
      "Gagal menghapus persyaratan dokumen.",
    );
  }

  return { ok: false, message: "" };
}
