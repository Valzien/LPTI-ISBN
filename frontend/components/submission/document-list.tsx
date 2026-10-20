import { Eye, Trash2 } from "lucide-react";

import { deleteDocumentAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUkuranFile, formatTanggalPendek } from "@/lib/format";
import type { DocumentReviewStatus, SubmissionDocument } from "@/lib/types";

/** Warna badge hasil pemeriksaan dokumen oleh verifikator. */
const WARNA_REVIEW: Record<DocumentReviewStatus, string> = {
  pending: "border-amber-300 text-amber-700 dark:text-amber-400",
  approved: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
  rejected: "border-red-300 text-red-700 dark:text-red-400",
};

interface DocumentListProps {
  documents: SubmissionDocument[];
  editable: boolean;
}

/**
 * Daftar dokumen yang sudah diunggah — tautan "Lihat" menuju proxy BFF
 * /api/documents/{id}/preview (berkas privat, tidak pernah publik).
 */
export function DocumentList({ documents, editable }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Belum ada dokumen yang diunggah.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{doc.original_filename}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {doc.requirement_name ?? "Dokumen persyaratan"} —{" "}
              {formatUkuranFile(doc.file_size)} —{" "}
              {formatTanggalPendek(doc.created_at)}
            </p>
            {doc.admin_note ? (
              <p className="mt-1 text-amber-700 text-xs dark:text-amber-400">
                Catatan verifikator: {doc.admin_note}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={WARNA_REVIEW[doc.review_status]}
            >
              {doc.review_status_label}
            </Badge>
            <Button
              render={
                <a
                  href={`/api/documents/${doc.id}/preview`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              variant="outline"
              size="sm"
            >
              <Eye />
              Lihat
            </Button>
            {editable ? (
              <form action={deleteDocumentAction}>
                <input type="hidden" name="submission_id" value={doc.book_submission_id} />
                <input type="hidden" name="document_id" value={doc.id} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash2 />
                  Hapus
                </Button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
