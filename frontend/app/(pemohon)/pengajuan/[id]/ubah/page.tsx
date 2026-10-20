import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmissionForm } from "@/components/submission/submission-form";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { requireApplicant } from "@/lib/auth";
import type { BookSubmission } from "@/lib/types";

export const metadata = { title: "Ubah Pengajuan" };

/**
 * Halaman ubah data buku — hanya untuk status Draft / Perlu Revisi.
 * Status terkunci dialihkan kembali ke halaman detail.
 */
export default async function UbahPengajuanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Hanya pemohon (applicant) — admin/super_admin diarahkan ke /admin.
  await requireApplicant();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  let submission: BookSubmission;

  try {
    submission = await apiFetch<BookSubmission>(`/api/v1/submissions/${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      // Sudah terkunci — kembali ke detail (backend menolak dengan 409).
      if (error.status === 404) {
        notFound();
      }

      if (error.status === 409) {
        redirect(`/pengajuan/${id}`);
      }
    }

    throw error;
  }

  if (!submission.is_editable) {
    redirect(`/pengajuan/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-3">
        <Button
          render={<Link href={`/pengajuan/${submission.id}`} />}
          variant="ghost"
          size="sm"
          className="-ml-2"
        >
          <ArrowLeft />
          Kembali ke Detail Pengajuan
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Ubah Pengajuan
          </h1>
          <p className="font-mono text-muted-foreground text-sm">
            {submission.submission_number}
          </p>
        </div>
      </header>

      <SubmissionForm mode="edit" initial={submission} />
    </div>
  );
}
