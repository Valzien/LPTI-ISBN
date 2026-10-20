/**
 * Kontrak tipe TypeScript untuk REST API LPTI-ISBN (/api/v1).
 *
 * Sumber kebenaran: backend Laravel (docs/API.md, API Resources, dan enum PHP).
 * Jika backend berubah, perbarui tipe ini terlebih dahulu.
 */

export type UserRole = "applicant" | "admin" | "super_admin";

export type ApplicantType = "author" | "publisher_rep";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "resubmitted"
  | "approved_for_processing"
  | "isbn_assigned"
  | "rejected";

export type DocumentReviewStatus = "pending" | "approved" | "rejected";

/** Bentuk standar respons API (docs/API.md §Respons). */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Bentuk objek user sesuai UserResource backend. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  role_label: string;
  phone: string | null;
  applicant_type: ApplicantType | null;
  applicant_type_label: string | null;
  publisher_name: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  /** Jumlah pengajuan — hanya diisi pada endpoint daftar/detail admin. */
  submissions_count?: number;
}

/** Bentuk objek pengajuan buku (kolom book_submissions + turunan resource). */
export interface BookSubmission {
  id: number;
  user_id: number;
  submission_number: string;
  status: SubmissionStatus;
  status_label: string;
  is_editable: boolean;
  title: string;
  subtitle: string | null;
  main_author: string;
  additional_authors: string | null;
  editor: string | null;
  translator: string | null;
  publisher_name: string | null;
  planned_publication_year: number | null;
  edition: string | null;
  language: string | null;
  publication_format: string | null;
  synopsis: string | null;
  page_count: number | null;
  book_size: string | null;
  notes: string | null;
  isbn_number: string | null;
  isbn_source_note: string | null;
  isbn_assigned_at: string | null;
  created_at: string;
  updated_at: string;
  /** Hanya ada pada respons detail (di-eager-load). */
  user?: User;
  documents?: SubmissionDocument[];
  status_histories?: SubmissionStatusHistory[];
}

/** Berkas dokumen persyaratan yang diunggah pemohon (privat). */
export interface SubmissionDocument {
  id: number;
  book_submission_id: number;
  document_requirement_id: number | null;
  requirement_name: string | null;
  original_filename: string;
  mime_type: string;
  file_size: number;
  review_status: DocumentReviewStatus;
  review_status_label: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/** Satu entri riwayat status (timeline) pengajuan. */
export interface SubmissionStatusHistory {
  id: number;
  previous_status: SubmissionStatus | null;
  previous_status_label: string | null;
  new_status: SubmissionStatus;
  new_status_label: string;
  note: string | null;
  actor_name: string | null;
  created_at: string;
}

/**
 * Persyaratan dokumen — dibuat/dikelola admin, dibaca pemohon
 * untuk form unggah (GET /document-requirements).
 */
export interface DocumentRequirement {
  id: number;
  name: string;
  description: string | null;
  allowed_mime_types: string[];
  max_file_size: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

/** Meta berpaginasi dari daftar (docs/API.md §1). */
export interface ApiMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  message?: string;
}

/** Satu baris jumlah pengajuan per status (GET /admin/dashboard). */
export interface StatusCount {
  status: SubmissionStatus;
  label: string;
  total: number;
}

/**
 * Bentuk data GET /api/v1/admin/dashboard (docs/API.md §3.4) —
 * seluruh angka dihitung dari database, bukan angka dummy.
 */
export interface AdminDashboardStats {
  total: number;
  /** Diajukan + Diajukan Ulang (menunggu mulai verifikasi). */
  needs_check: number;
  under_review: number;
  needs_revision: number;
  /** ISBN Ditetapkan + Ditolak (alur selesai). */
  finished: number;
  by_status: StatusCount[];
  /** Maksimal 10 pengajuan terbaru, urut terbaru. */
  recent: BookSubmission[];
}

/* ===========================================================================
 * Notifikasi, statistik pemohon, laporan & audit (Tahap 7)
 * ========================================================================== */

/**
 * Notifikasi dalam aplikasi milik pengguna (GET /api/v1/notifications).
 * Data berasal dari kanal database Laravel (docs/API.md §3.3).
 */
export interface AppNotification {
  id: string;
  title: string | null;
  message: string | null;
  submission_id: number | null;
  submission_number: string | null;
  status: SubmissionStatus | null;
  status_label: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
}

/** Ringkasan pengajuan milik pemohon (GET /api/v1/submissions/stats). */
export interface SubmissionStats {
  total: number;
  by_status: StatusCount[];
  unread_notifications: number;
}

/** Ringkasan laporan admin (GET /api/v1/admin/reports/submissions). */
export interface ReportSummary {
  generated_at: string;
  filters: {
    status: SubmissionStatus | null;
    date_from: string | null;
    date_to: string | null;
  };
  total: number;
  by_status: StatusCount[];
}

/** Satu baris log audit (GET /api/v1/admin/audit-log). */
export interface AuditLogEntry {
  id: number;
  action: string;
  actor: { id: number; name: string } | null;
  entity_type: string | null;
  entity_id: number | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}
