import { Plus } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmissionFilters } from "@/components/submission/submission-filters";
import { formatTanggalPendek } from "@/lib/format";
import { apiFetchWithMeta } from "@/lib/api";
import { requireApplicant } from "@/lib/auth";
import { STATUS_ORDER } from "@/lib/status";
import type { BookSubmission, SubmissionStatus } from "@/lib/types";

export const metadata = { title: "Pengajuan Saya" };

/**
 * Halaman daftar pengajuan pemohon — GET /api/v1/submissions dengan
 * filter status/q/tanggal dan pagination (docs/API.md §3.2).
 */
export default async function PengajuanSayaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Hanya pemohon (applicant) — admin/super_admin diarahkan ke /admin.
  await requireApplicant();

  const sp = await searchParams;

  const ambil = (key: string): string => {
    const nilai = sp[key];

    return typeof nilai === "string" ? nilai.trim() : "";
  };

  const q = ambil("q").slice(0, 100);
  const statusMentah = ambil("status");
  const status = (
    STATUS_ORDER as readonly string[]
  ).includes(statusMentah)
    ? (statusMentah as SubmissionStatus)
    : null;
  const dateFrom = ambil("date_from");
  const dateTo = ambil("date_to");
  const pageMentah = Number.parseInt(ambil("page"), 10);
  const page = Number.isFinite(pageMentah) && pageMentah > 0 ? pageMentah : 1;

  const query = new URLSearchParams();

  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (dateFrom) query.set("date_from", dateFrom);
  if (dateTo) query.set("date_to", dateTo);
  if (page > 1) query.set("page", String(page));

  const qs = query.toString();

  const { data, meta } = await apiFetchWithMeta<BookSubmission[]>(
    `/api/v1/submissions${qs ? `?${qs}` : ""}`,
  );

  /** Tautan halaman yang mempertahankan filter aktif. */
  const tautanHalaman = (tujuan: number): string => {
    const params = new URLSearchParams(query);

    if (tujuan <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(tujuan));
    }

    const qs = params.toString();

    return qs ? `/pengajuan?${qs}` : "/pengajuan";
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pengajuan Saya
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh pengajuan ISBN yang Anda buat beserta status
            terkininya.
          </p>
        </div>
        <Button render={<Link href="/pengajuan/baru" />}>
          <Plus />
          Buat Pengajuan Baru
        </Button>
      </header>

      {sp.deleted === "1" ? (
        <Alert>
          <AlertDescription>Pengajuan berhasil dihapus.</AlertDescription>
        </Alert>
      ) : null}

      <SubmissionFilters
        q={q}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <section aria-label="Daftar pengajuan" className="space-y-3">
        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Tidak ada pengajuan ditemukan.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              {q || status || dateFrom || dateTo
                ? "Coba ubah kata kunci atau filter Anda."
                : "Mulai dengan membuat pengajuan baru."}
            </p>
            {!q && !status && !dateFrom && !dateTo ? (
              <Button
                render={<Link href="/pengajuan/baru" />}
                className="mt-4"
              >
                <Plus />
                Buat Pengajuan Baru
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/pengajuan/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-muted-foreground text-xs">
                      {item.submission_number}
                    </p>
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {item.main_author} — {item.publisher_name} — diperbarui{" "}
                      {formatTanggalPendek(item.updated_at)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {meta.last_page > 1 ? (
        <nav
          aria-label="Paginasi"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="text-muted-foreground">
            Halaman {meta.current_page} dari {meta.last_page} — {meta.total}{" "}
            pengajuan
          </p>
          <div className="flex gap-2">
            {meta.current_page > 1 ? (
              <Button
                render={<Link href={tautanHalaman(meta.current_page - 1)} />}
                variant="outline"
                size="sm"
              >
                Sebelumnya
              </Button>
            ) : null}
            {meta.current_page < meta.last_page ? (
              <Button
                render={<Link href={tautanHalaman(meta.current_page + 1)} />}
                variant="outline"
                size="sm"
              >
                Berikutnya
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
