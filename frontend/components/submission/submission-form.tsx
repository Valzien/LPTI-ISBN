"use client";

import { useActionState } from "react";

import {
  createSubmissionAction,
  updateSubmissionAction,
  type SubmissionFormState,
} from "@/lib/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BookSubmission } from "@/lib/types";

const initialState: SubmissionFormState = { ok: false, message: "" };

/** Opsi format terbitan — backend menerima string bebas maks 255 karakter. */
const FORMAT_TERBITAN = ["Cetak", "Digital", "Cetak & Digital"] as const;

interface FieldErrors {
  [key: string]: string[] | undefined;
}

/** Pesan per-field dari hasil validasi backend (422). */
function FieldError({
  errors,
  field,
}: {
  errors: FieldErrors | undefined;
  field: string;
}) {
  return errors?.[field]?.map((err) => (
    <p key={err} className="text-xs text-destructive">
      {err}
    </p>
  ));
}

interface SubmissionFormProps {
  /** "create" untuk pengajuan baru; "edit" untuk ubah draft/perlu revisi. */
  mode: "create" | "edit";
  initial?: BookSubmission;
}

/**
 * Formulir data buku (draft & edit) — Server Action POST/PUT penuh ke
 * /api/v1/submissions (docs/API.md §3.2).
 */
export function SubmissionForm({ mode, initial }: SubmissionFormProps) {
  const action = mode === "create" ? createSubmissionAction : updateSubmissionAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const isEdit = mode === "edit" && initial !== undefined;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">
          {isEdit ? "Ubah Data Buku" : "Data Buku Baru"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Perubahan disimpan setelah Anda menekan tombol simpan. Field bertanda wajib diisi."
            : "Pengajuan disimpan sebagai draft — Anda dapat melengkapi dokumen sebelum mengajukan. Field bertanda wajib diisi."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!state.ok && state.message ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          {isEdit ? <input type="hidden" name="id" value={initial.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="title">
              Judul Buku <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title ?? ""}
              required
              aria-invalid={state.fieldErrors?.title ? true : undefined}
            />
            <FieldError errors={state.fieldErrors} field="title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subjudul</Label>
            <Input
              id="subtitle"
              name="subtitle"
              defaultValue={initial?.subtitle ?? ""}
              placeholder="Jika ada"
            />
            <FieldError errors={state.fieldErrors} field="subtitle" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="main_author">
                Penulis Utama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="main_author"
                name="main_author"
                defaultValue={initial?.main_author ?? ""}
                required
                aria-invalid={state.fieldErrors?.main_author ? true : undefined}
              />
              <FieldError errors={state.fieldErrors} field="main_author" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher_name">
                Nama Penerbit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="publisher_name"
                name="publisher_name"
                defaultValue={initial?.publisher_name ?? ""}
                required
                aria-invalid={
                  state.fieldErrors?.publisher_name ? true : undefined
                }
              />
              <FieldError errors={state.fieldErrors} field="publisher_name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_authors">Penulis Tambahan</Label>
            <Textarea
              id="additional_authors"
              name="additional_authors"
              rows={2}
              defaultValue={initial?.additional_authors ?? ""}
              placeholder="Satu nama per baris, bila ada"
            />
            <FieldError
              errors={state.fieldErrors}
              field="additional_authors"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editor">Editor</Label>
              <Input
                id="editor"
                name="editor"
                defaultValue={initial?.editor ?? ""}
              />
              <FieldError errors={state.fieldErrors} field="editor" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translator">Penerjemah</Label>
              <Input
                id="translator"
                name="translator"
                defaultValue={initial?.translator ?? ""}
              />
              <FieldError errors={state.fieldErrors} field="translator" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">
                Bahasa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="language"
                name="language"
                defaultValue={initial?.language ?? "Indonesia"}
                placeholder="Indonesia"
                required
                aria-invalid={state.fieldErrors?.language ? true : undefined}
              />
              <FieldError errors={state.fieldErrors} field="language" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publication_format">
                Format Terbitan <span className="text-destructive">*</span>
              </Label>
              <Select
                name="publication_format"
                defaultValue={initial?.publication_format ?? "Cetak"}
              >
                <SelectTrigger
                  id="publication_format"
                  aria-invalid={
                    state.fieldErrors?.publication_format ? true : undefined
                  }
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_TERBITAN.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={state.fieldErrors}
                field="publication_format"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="planned_publication_year">
                Tahun Terbit Terencana
              </Label>
              <Input
                id="planned_publication_year"
                name="planned_publication_year"
                type="number"
                min={1900}
                max={2100}
                defaultValue={initial?.planned_publication_year ?? ""}
              />
              <FieldError
                errors={state.fieldErrors}
                field="planned_publication_year"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edition">Edisi</Label>
              <Input
                id="edition"
                name="edition"
                defaultValue={initial?.edition ?? ""}
                placeholder="Edisi 1"
              />
              <FieldError errors={state.fieldErrors} field="edition" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_count">Jumlah Halaman</Label>
              <Input
                id="page_count"
                name="page_count"
                type="number"
                min={1}
                max={100000}
                defaultValue={initial?.page_count ?? ""}
              />
              <FieldError errors={state.fieldErrors} field="page_count" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book_size">Ukuran Buku</Label>
            <Input
              id="book_size"
              name="book_size"
              defaultValue={initial?.book_size ?? ""}
              placeholder="14 x 20 cm"
            />
            <FieldError errors={state.fieldErrors} field="book_size" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">Sinopsis</Label>
            <Textarea
              id="synopsis"
              name="synopsis"
              rows={4}
              defaultValue={initial?.synopsis ?? ""}
              placeholder="Ringkasan isi buku"
            />
            <FieldError errors={state.fieldErrors} field="synopsis" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (untuk verifikator)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initial?.notes ?? ""}
              placeholder="Informasi tambahan bila ada"
            />
            <FieldError errors={state.fieldErrors} field="notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan Draft"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
