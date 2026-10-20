"use client";

import { Download } from "lucide-react";
import { useActionState } from "react";

import {
  reviewDocumentAction,
  type AdminFormState,
} from "@/lib/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUkuranFile, formatTanggalPendek } from "@/lib/format";
import type {
  DocumentReviewStatus,
  SubmissionDocument,
} from "@/lib/types";

/** Warna badge hasil pemeriksaan dokumen oleh verifikator. */
const WARNA_REVIEW: Record<DocumentReviewStatus, string> = {
  pending: "border-amber-300 text-amber-700 dark:text-amber-400",
  approved: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
  rejected: "border-red-300 text-red-700 dark:text-red-400",
};

const OPSI_REVIEW: { value: DocumentReviewStatus; label: string }[] = [
  { value: "pending", label: "Menunggu Pemeriksaan" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

const kosong: AdminFormState = { ok: false, message: "" };

interface DocumentReviewCardProps {
  document: SubmissionDocument;
  submissionId: number;
}

/**
 * Kartu satu dokumen untuk admin (Tahap 6): unduhan terotorisasi +
 * form hasil pemeriksaan (review_status + catatan admin) via PATCH
 * /admin/documents/{id}/review.
 */
export function DocumentReviewCard({
  document,
  submissionId,
}: DocumentReviewCardProps) {
  const [state, formAction, pending] = useActionState(
    reviewDocumentAction,
    kosong,
  );

  const catatanError =
    Array.isArray(state.fieldErrors?.admin_note) &&
    state.fieldErrors.admin_note.length > 0
      ? (state.fieldErrors.admin_note[0] as string)
      : null;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-sm" title={document.original_filename}>
              {document.original_filename}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {document.requirement_name ?? "Dokumen persyaratan"} —{" "}
              {formatUkuranFile(document.file_size)} —{" "}
              {formatTanggalPendek(document.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={WARNA_REVIEW[document.review_status]}
            >
              {document.review_status_label}
            </Badge>
            <Button
              render={
                <a
                  href={`/api/admin/documents/${document.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              variant="outline"
              size="sm"
            >
              <Download />
              Unduh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {state.message ? (
          <Alert variant={state.ok ? "default" : "destructive"} className="mb-3">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="submission_id" value={submissionId} />
          <input type="hidden" name="document_id" value={document.id} />

          <div className="space-y-1">
            <Label htmlFor={`review-${document.id}`}>Hasil Pemeriksaan</Label>
            <select
              id={`review-${document.id}`}
              name="review_status"
              defaultValue={document.review_status}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {OPSI_REVIEW.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`note-${document.id}`}>Catatan Admin</Label>
            <Textarea
              id={`note-${document.id}`}
              name="admin_note"
              rows={2}
              defaultValue={document.admin_note ?? ""}
              placeholder="Catatan untuk pemohon (opsional)."
              aria-invalid={catatanError ? true : undefined}
            />
            {catatanError ? (
              <p className="text-destructive text-xs">{catatanError}</p>
            ) : null}
          </div>

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan Hasil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
