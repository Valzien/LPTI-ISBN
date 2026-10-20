"use client";

import { useActionState } from "react";

import {
  resubmitSubmissionAction,
  submitSubmissionAction,
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
import type { SubmissionStatus } from "@/lib/types";

const initialState: SubmissionFormState = { ok: false, message: "" };

interface StatusActionsProps {
  submissionId: number;
  status: SubmissionStatus;
}

/**
 * Tombol transisi status pemohon: draft → submitted (Ajukan) dan
 * needs_revision → resubmitted (Ajukan Ulang). Status lain tidak
 * menampilkan aksi (divalidasi ulang oleh backend).
 */
export function StatusActions({ submissionId, status }: StatusActionsProps) {
  // Hook dipanggil tanpa syarat (rules-of-hooks): aksi dipilih dari status.
  const aksi = status === "draft" ? submitSubmissionAction : resubmitSubmissionAction;
  const [state, formAction, pending] = useActionState(aksi, initialState);

  const meta =
    status === "draft"
      ? {
          tombol: "Ajukan ke Verifikasi",
          judul: "Ajukan Pengajuan",
          deskripsi:
            "Pengajuan akan dikunci dan diteruskan ke verifikator. Pastikan data buku benar dan dokumen wajib sudah lengkap.",
        }
      : status === "needs_revision"
        ? {
            tombol: "Ajukan Ulang",
            judul: "Ajukan Ulang Setelah Revisi",
            deskripsi:
              "Setelah memperbaiki data atau dokumen sesuai catatan verifikator, ajukan ulang pengajuan ini.",
          }
        : null;

  if (meta === null) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{meta.judul}</CardTitle>
        <CardDescription>{meta.deskripsi}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.message ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction}>
          <input type="hidden" name="id" value={submissionId} />
          <Button type="submit" disabled={pending}>
            {pending ? "Mengirim..." : meta.tombol}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
