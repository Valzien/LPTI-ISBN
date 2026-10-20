import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentReviewCard } from "@/components/admin/document-review-card";
import { VerificationPanel } from "@/components/admin/verification-panel";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HistoryTimeline } from "@/components/submission/history-timeline";
import { apiFetch, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import type { BookSubmission } from "@/lib/types";

export const metadata = { title: "Detail Verifikasi" };

/** Pasangan label–nilai untuk ringkasan data. */
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

/** Pesan sukses per flag query string setelah aksi verifikasi berhasil. */
const PESAN_FLAG: Record<string, string> = {
  review: "Pengajuan masuk dalam pemeriksaan.",
  revisi:
    "Permintaan revisi terkirim — catatan dilihat pemohon pada halaman pengajuannya.",
  disetujui:
    "Pengajuan disetujui untuk diproses — ini belum berarti nomor ISBN resmi terbit.",
  ditolak: "Pengajuan ditolak — alasan tercatat di histori status.",
  isbn: "Nomor ISBN berhasil dicatat pada pengajuan ini.",
};

/**
 * Detail pengajuan untuk verifikasi admin (Tahap 6): data buku, profil
 * pemohon, dokumen + pemeriksaannya, aksi transisi status, dan histori.
 */
export default async function DetailVerifikasiAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const sp = await searchParams;
  const flag = Object.keys(PESAN_FLAG).find((key) => sp[key] === "1");

  let submission: BookSubmission;

  try {
    submission = await apiFetch<BookSubmission>(
      `/api/v1/admin/submissions/${id}`,
    );
  } catch (error) {
    // Pengajuan tidak ada — tampilan 404 (admin boleh melihat semua
    // pengajuan yang valid, jadi hanya 404 nyata yang di-surface).
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const documents = submission.documents ?? [];
  const histories = submission.status_histories ?? [];
  const pemohon = submission.user ?? null;

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
              <span className="text-muted-foreground">
                {" "}
                — {submission.subtitle}
              </span>
            ) : null}
          </h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Pengajuan oleh{" "}
          <strong className="font-medium text-foreground">
            {pemohon?.name ?? "—"}
          </strong>
          {pemohon ? ` — ${pemohon.email}` : ""} — dibuat{" "}
          {formatTanggal(submission.created_at)} — diperbarui{" "}
          {formatTanggal(submission.updated_at)}
        </p>
        <p className="text-muted-foreground text-sm">
          <Link href="/admin/pengajuan" className="underline underline-offset-4">
            ← Kembali ke daftar pengajuan
          </Link>
        </p>
      </header>

      {flag ? (
        <Alert>
          <AlertDescription>{PESAN_FLAG[flag]}</AlertDescription>
        </Alert>
      ) : null}

      <VerificationPanel submissionId={submission.id} status={submission.status} />

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
            <Baris
              label="Tanggal Penetapan ISBN"
              value={
                submission.isbn_assigned_at
                  ? formatTanggal(submission.isbn_assigned_at)
                  : null
              }
            />
            <Baris
              label="Sumber ISBN"
              value={submission.isbn_source_note}
            />
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
          <CardTitle className="text-base">Profil Pemohon</CardTitle>
          <CardDescription>
            Data akun pemohon pengajuan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Baris label="Nama" value={pemohon?.name ?? null} />
            <Baris label="Email" value={pemohon?.email ?? null} />
            <Baris label="Telepon" value={pemohon?.phone ?? null} />
            <Baris
              label="Jenis Pemohon"
              value={pemohon?.applicant_type_label ?? null}
            />
            <Baris label="Nama Penerbit" value={pemohon?.publisher_name ?? null} />
            <Baris label="Alamat" value={pemohon?.address ?? null} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dokumen Persyaratan</CardTitle>
          <CardDescription>
            Unduhan dokumen bersifat privat dan tercatat dalam log audit.
            Hasil pemeriksaan per dokumen terlihat oleh pemohon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada dokumen yang diunggah untuk pengajuan ini.
            </p>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <DocumentReviewCard
                  key={doc.id}
                  document={doc}
                  submissionId={submission.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histori Status</CardTitle>
          <CardDescription>
            Riwayat seluruh perubahan status pengajuan ini — termasuk catatan
            revisi dan alasan penolakan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryTimeline histories={histories} />
        </CardContent>
      </Card>
    </div>
  );
}
