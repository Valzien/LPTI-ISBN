"use client";

import Link from "next/link";
import { useActionState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  createRequirementAction,
  updateRequirementAction,
  type AdminFormState,
} from "@/lib/actions";
import type { DocumentRequirement } from "@/lib/types";

const initialState: AdminFormState = { ok: false, message: "" };

interface RequirementFormProps {
  /** Bila diisi, form berada pada mode edit (PUT). */
  requirement?: DocumentRequirement;
}

/** Ukuran byte → isian MB tanpa nol berlebih (mis. 2097152 → "2"). */
function ukuranMb(bytes: number): string {
  return String(Number((bytes / 1024 / 1024).toFixed(2)));
}

/**
 * Form persyaratan dokumen (Tahap 7) — nama, deskripsi, tipe berkas yang
 * diizinkan, ukuran maksimum, wajib/tidak, urutan, dan status aktif.
 * Daftar ini menjadi sumber persyaratan pada formulir pemohon.
 */
export function RequirementForm({ requirement }: RequirementFormProps) {
  const mode = requirement ? "edit" : "create";
  const [state, formAction, pending] = useActionState(
    requirement ? updateRequirementAction : createRequirementAction,
    initialState,
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">
          {mode === "edit" ? "Ubah Persyaratan" : "Persyaratan Baru"}
        </CardTitle>
        <CardDescription>
          Tipe berkas ditulis dalam format MIME, dipisahkan koma — contoh:
          application/pdf, image/jpeg.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!state.ok && state.message ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          {requirement ? (
            <input type="hidden" name="id" value={requirement.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Persyaratan</Label>
            <Input
              id="name"
              name="name"
              defaultValue={requirement?.name ?? ""}
              required
              minLength={3}
              maxLength={150}
              aria-invalid={state.fieldErrors?.name ? true : undefined}
            />
            {state.fieldErrors?.name?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={requirement?.description ?? ""}
              rows={3}
              maxLength={1000}
              placeholder="Penjelasan singkat dokumen yang harus diunggah."
              aria-invalid={state.fieldErrors?.description ? true : undefined}
            />
            {state.fieldErrors?.description?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowed_mime_types">Tipe Berkas Diizinkan</Label>
            <Textarea
              id="allowed_mime_types"
              name="allowed_mime_types"
              defaultValue={
                requirement?.allowed_mime_types.join(", ") ??
                "application/pdf, image/jpeg, image/png"
              }
              rows={2}
              required
              aria-invalid={
                state.fieldErrors?.allowed_mime_types ? true : undefined
              }
            />
            <p className="text-xs text-muted-foreground">
              Maksimal 10 tipe, masing-masing ditulis seperti application/pdf.
            </p>
            {state.fieldErrors?.allowed_mime_types?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_file_size_mb">Ukuran Maksimum (MB)</Label>
              <Input
                id="max_file_size_mb"
                name="max_file_size_mb"
                type="number"
                min={0.01}
                max={10}
                step={0.01}
                defaultValue={
                  requirement ? ukuranMb(requirement.max_file_size) : "2"
                }
                required
                aria-invalid={
                  state.fieldErrors?.max_file_size_mb ? true : undefined
                }
              />
              {state.fieldErrors?.max_file_size_mb?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Urutan Tampil</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                min={0}
                max={999}
                step={1}
                defaultValue={requirement?.sort_order ?? 0}
                required
                aria-invalid={state.fieldErrors?.sort_order ? true : undefined}
              />
              {state.fieldErrors?.sort_order?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_required"
                value="1"
                defaultChecked={requirement ? requirement.is_required : true}
                className="size-4 rounded border-input accent-primary"
              />
              Wajib diunggah
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                value="1"
                defaultChecked={requirement ? requirement.is_active : true}
                className="size-4 rounded border-input accent-primary"
              />
              Aktif (tampil pada formulir pemohon)
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Menyimpan…"
                : mode === "edit"
                  ? "Simpan Perubahan"
                  : "Buat Persyaratan"}
            </Button>
            <Button
              render={<Link href="/admin/persyaratan" />}
              variant="outline"
              type="button"
            >
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
