import type { SubmissionStatus } from "./types";

/**
 * Metadata tampilan untuk setiap status pengajuan.
 *
 * Label, sifat editable, dan terminal WAJIB selaras dengan
 * backend/app/Enums/SubmissionStatus.php — ubah keduanya bersamaan.
 */

interface StatusMeta {
  /** Label tampilan Bahasa Indonesia. */
  label: string;
  /** Varian Badge shadcn. */
  variant: "default" | "secondary" | "destructive" | "outline";
  /**
   * Kelas tambahan untuk warna khusus. Akhiran `!` (important Tailwind v4)
   * dipakai agar menimpa warna dari varian badge secara pasti.
   */
  className: string;
  /** Apakah pemohon boleh mengedit pengajuan pada status ini. */
  editable: boolean;
  /** Apakah status akhir (tidak bisa berubah lagi). */
  terminal: boolean;
}

export const STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    className: "",
    editable: true,
    terminal: false,
  },
  submitted: {
    label: "Diajukan",
    variant: "outline",
    className: "",
    editable: false,
    terminal: false,
  },
  under_review: {
    label: "Dalam Verifikasi",
    variant: "default",
    className: "bg-blue-600! text-white!",
    editable: false,
    terminal: false,
  },
  needs_revision: {
    label: "Perlu Revisi",
    variant: "default",
    className: "bg-amber-500! text-zinc-950!",
    editable: true,
    terminal: false,
  },
  resubmitted: {
    label: "Diajukan Ulang",
    variant: "default",
    className: "bg-indigo-600! text-white!",
    editable: false,
    terminal: false,
  },
  approved_for_processing: {
    label: "Disetujui untuk Diproses",
    variant: "default",
    className: "bg-emerald-600! text-white!",
    editable: false,
    terminal: false,
  },
  isbn_assigned: {
    label: "ISBN Ditetapkan",
    variant: "default",
    className: "",
    editable: false,
    terminal: true,
  },
  rejected: {
    label: "Ditolak",
    variant: "destructive",
    className: "",
    editable: false,
    terminal: true,
  },
};

/** Urutan status untuk tampilan daftar/legenda. */
export const STATUS_ORDER: SubmissionStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "needs_revision",
  "resubmitted",
  "approved_for_processing",
  "isbn_assigned",
  "rejected",
];

export function getStatusMeta(status: SubmissionStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.draft;
}
