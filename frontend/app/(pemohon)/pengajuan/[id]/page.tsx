import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteSubmissionButton } from "@/components/submission/delete-submission-button";
import { DocumentList } from "@/components/submission/document-list";
import { DocumentUploader } from "@/components/submission/document-uploader";
import { HistoryTimeline } from "@/components/submission/history-timeline";
import { StatusActions } from "@/components/submission/status-actions";
import { apiFetch, ApiError } from "@/lib/api";
import { requireApplicant } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import type { BookSubmission, DocumentRequirement } from "@/lib/types";

/** Pasangan label–nilai untuk ringkasan data buku. */
function Baris({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/** Halaman detail satu pengajuan milik sendiri (data, dokumen, histori). */
export default async function DetailPengajuanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Hanya pemohon (applicant) — admin/super_admin diarahkan ke /admin.
  await requireApplicant();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const sp = await searchParams;
  const dibuat = sp.created === "1";
  const diperbarui = sp.updated === "1";

  let submission: BookSubmission;

  try {
    submission = await apiFetch<BookSubmission>(`/api/v1/submissions/${id}`);
  } catch (error) {
    // Pengajuan tidak ada atau bukan milik sendiri — tampilan 404 (anti-enumeration).
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const requirements = await apiFetch<DocumentRequirement[]>(
    "/api/v1/document-requirements",
  );

  const documents = submission.documents ?? [];
  const histories = submission.status_histories ?? [];

  // Catatan revisi verifikator: entri status needs_revision terakhir yang
  // memiliki catatan — ditampilkan menonjol agar pemohon tahu yang harus diperbaiki.
  const catatanRevisi = [...histories]
    .reverse()
    .find((entry) => entry.new_status === "needs_revision" && entry.note);

  const editable = submission.is_editable;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-3">
        <p className="font-mono text-muted-foreground text-xs">
          {submission.submission_number}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {submission.title}
            {submission.subtitle ? (
              <span className="text-muted-foreground"> — {submission.subtitle}</span>
            ) : null}
          </h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Dibuat {formatTanggal(submission.created_at)} — diperbarui{" "}
          {formatTanggal(submission.updated_at)}
        </p>
      </header>

      {dibuat ? (
        <Alert>
          <AlertDescription>
            Pengajuan berhasil dibuat dan tersimpan sebagai draft. Lengkapi
            dokumen persyaratan lalu ajukan ke verifikator.
          </AlertDescription>
        </Alert>
      ) : null}

      {diperbarui ? (
        <Alert>
          <AlertDescription>Pengajuan berhasil diperbarui.</AlertDescription>
        </Alert>
      ) : null}

      {catatanRevisi ? (
        <Alert variant="destructive">
          <AlertDescription>
            <strong className="font-medium">Catatan verifikator:</strong>{" "}
            {catatanRevisi.note}
          </AlertDescription>
        </Alert>
      ) : null}

      {editable ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Pengajuan masih dapat diubah karena berstatus{" "}
            <strong className="font-medium">{submission.status_label}</strong>.
          </p>
          <div className="flex gap-2">
            <Button
              render={
                <Link href={`/pengajuan/${submission.id}/ubah`} />
              }
              variant="outline"
              size="sm"
            >
              <Pencil />
              Ubah Data Buku
            </Button>
            <DeleteSubmissionButton submissionId={submission.id} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-3 text-muted-foreground text-sm">
          Pengajuan terkunci pada status{" "}
          <strong className="font-medium">{submission.status_label}</strong> dan
          tidak dapat diubah lagi. Hubungi pengelola bila ada kesalahan data.
        </div>
      )}

      {editable ? <StatusActions submissionId={submission.id} status={submission.status} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Buku</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Baris label="Penulis Utama" value={submission.main_author} />
            <Baris
              label="Penulis Tambahan"
              value={submission.additional_authors}
            />
            <Baris label="Penerbit" value={submission.publisher_name} />
            <Baris label="Bahasa" value={submission.language} />
            <Baris label="Format Terbitan" value={submission.publication_format} />
            <Baris
              label="Tahun Terbit Terencana"
              value={
                submission.planned_publication_year
                  ? String(submission.planned_publication_year)
                  : null
              }
            />
            <Baris label="Edisi" value={submission.edition} />
            <Baris label="Editor" value={submission.editor} />
            <Baris label="Penerjemah" value={submission.translator} />
            <Baris
              label="Jumlah Halaman"
              value={submission.page_count ? String(submission.page_count) : null}
            />
            <Baris label="Ukuran Buku" value={submission.book_size} />
            <Baris label="ISBN Dicatat" value={submission.isbn_number} />
          </dl>

          {submission.synopsis ? (
            <div className="mt-4">
              <p className="text-muted-foreground text-xs">Sinopsis</p>
              <p className="mt-1 text-sm whitespace-pre-line">
                {submission.synopsis}
              </p>
            </div>
          ) : null}

          {submission.notes ? (
            <div className="mt-4">
              <p className="text-muted-foreground text-xs">
                Catatan (untuk verifikator)
              </p>
              <p className="mt-1 text-sm whitespace-pre-line">
                {submission.notes}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dokumen Persyaratan</CardTitle>
          <CardDescription>
            Berkas disimpan secara privat dan hanya dapat dilihat oleh Anda
            serta verifikator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editable ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {requirements.map((requirement) => (
                <DocumentUploader
                  key={requirement.id}
                  submissionId={submission.id}
                  requirement={requirement}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Unggah dokumen hanya dapat dilakukan saat pengajuan berstatus
              Draft atau Perlu Revisi.
            </p>
          )}

          <DocumentList documents={documents} editable={editable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histori Status</CardTitle>
          <CardDescription>
            Riwayat seluruh perubahan status pengajuan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryTimeline histories={histories} />
        </CardContent>
      </Card>
    </div>
  );
}
