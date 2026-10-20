"use client";

import { useActionState } from "react";

import {
  uploadDocumentAction,
  type SubmissionFormState,
} from "@/lib/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUkuranFile } from "@/lib/format";
import type { DocumentRequirement } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialState: SubmissionFormState = { ok: false, message: "" };

/** Label singkat untuk MIME type yang umum dipakai persyaratan dokumen. */
const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

function labelMime(mime: string): string {
  return MIME_LABEL[mime] ?? mime;
}

interface DocumentUploaderProps {
  submissionId: number;
  requirement: DocumentRequirement;
}

/**
 * Formulir unggah satu dokumen persyaratan — multipart ke
 * POST /api/v1/submissions/{id}/documents; batas ukuran & tipe berkas
 * mengikuti konfigurasi persyaratan dari backend.
 */
export function DocumentUploader({
  submissionId,
  requirement,
}: DocumentUploaderProps) {
  const [state, formAction, pending] = useActionState(
    uploadDocumentAction,
    initialState,
  );

  const accept = requirement.allowed_mime_types.join(",");
  const tipeLabel = requirement.allowed_mime_types.map(labelMime).join(", ");

  return (
    <form
      action={formAction}
      className="rounded-lg border p-4"
      aria-describedby={`aturan-${requirement.id}`}
    >
      <input type="hidden" name="submission_id" value={submissionId} />
      <input
        type="hidden"
        name="document_requirement_id"
        value={requirement.id}
      />

      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-sm">{requirement.name}</p>
        {requirement.is_required ? (
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-700 dark:text-amber-400"
          >
            Wajib
          </Badge>
        ) : (
          <Badge variant="secondary">Opsional</Badge>
        )}
      </div>

      {requirement.description ? (
        <p className="mt-1 text-muted-foreground text-xs">
          {requirement.description}
        </p>
      ) : null}

      <p
        id={`aturan-${requirement.id}`}
        className="mt-1 text-muted-foreground text-xs"
      >
        Tipe yang diizinkan: {tipeLabel} — maksimal{" "}
        {formatUkuranFile(requirement.max_file_size)}.
      </p>

      <div className="mt-3 space-y-2">
        <Label htmlFor={`file-${requirement.id}`} className="sr-only">
          Berkas {requirement.name}
        </Label>
        <Input
          id={`file-${requirement.id}`}
          name="file"
          type="file"
          accept={accept}
          required
          className="max-w-md"
          aria-invalid={state.fieldErrors?.file ? true : undefined}
        />
        {state.fieldErrors?.file?.map((err) => (
          <p key={err} className="text-xs text-destructive">
            {err}
          </p>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Mengunggah..." : "Unggah"}
        </Button>
        {state.ok && state.message ? (
          <p
            role="status"
            className={cn("text-sm font-medium text-emerald-600 dark:text-emerald-400")}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {/* Pesan umum (mis. 422 tipe/ukuran) — pesan field sudah tampil di atas. */}
      {!state.ok && state.message && !state.fieldErrors?.file ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
