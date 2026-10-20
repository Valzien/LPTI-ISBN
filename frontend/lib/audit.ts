/**
 * Label Bahasa Indonesia untuk aksi audit log backend
 * (`audit_logs.action`, docs/API.md §3.4).
 *
 * Aksi tak dikenal tetap ditampilkan apa adanya (fallback) agar log baru
 * dari backend tidak pernah "hilang" hanya karena belum dipetakan.
 */

const LABEL_AKSI: Record<string, string> = {
  "user.registered": "Registrasi akun",
  "user.login": "Masuk",
  "user.logout": "Keluar",
  "user.profile_updated": "Profil diperbarui",
  "user.created": "Akun dibuat admin",
  "user.updated": "Akun diperbarui",
  "user.deleted": "Akun dihapus",
  "submission.created": "Pengajuan dibuat",
  "submission.updated": "Pengajuan diperbarui",
  "submission.deleted": "Pengajuan dihapus",
  "submission.status_changed": "Status pengajuan berubah",
  "submission.isbn_recorded": "Nomor ISBN dicatat",
  "document.uploaded": "Dokumen diunggah",
  "document.deleted": "Dokumen dihapus",
  "document.reviewed": "Dokumen diperiksa",
  "document.downloaded": "Dokumen diunduh",
  "document_requirement.created": "Persyaratan dokumen dibuat",
  "document_requirement.updated": "Persyaratan dokumen diperbarui",
  "document_requirement.deleted": "Persyaratan dokumen dihapus",
  "report.exported": "Ekspor laporan CSV",
};

/** Label tampilan untuk satu aksi audit. */
export function labelAksi(action: string): string {
  return LABEL_AKSI[action] ?? action;
}

/** Daftar aksi yang dikenal — dipakai datalist filter log audit. */
export const DAFTAR_AKSI: string[] = Object.keys(LABEL_AKSI).sort();

/** Label singkat kelas entitas audit (nama kelas PHP → istilah UI). */
const LABEL_ENTITAS: Record<string, string> = {
  BookSubmission: "Pengajuan",
  SubmissionDocument: "Dokumen",
  User: "Akun",
  DocumentRequirement: "Persyaratan dokumen",
};

/** Nama entitas yang ramah dibaca dari `entity_type` backend. */
export function labelEntitas(entityType: string | null): string {
  if (!entityType) {
    return "—";
  }

  const namaKelas = entityType.split("\\").pop() ?? entityType;

  return LABEL_ENTITAS[namaKelas] ?? namaKelas;
}
