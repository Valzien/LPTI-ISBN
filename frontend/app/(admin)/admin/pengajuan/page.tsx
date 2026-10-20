import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmissionFilters } from "@/components/submission/submission-filters";
import { formatTanggalPendek } from "@/lib/format";
import { apiFetchWithMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { STATUS_ORDER } from "@/lib/status";
import type { BookSubmission, SubmissionStatus } from "@/lib/types";

export const metadata = { title: "Semua Pengajuan" };

/**
 * Daftar seluruh pengajuan untuk admin (Tahap 6) — GET /api/v1/admin/submissions
 * dengan filter status/q/tanggal dan pagination (docs/API.md §3.4).
 * Pencarian q mencakup judul, nomor, penulis, dan nama pemohon.
 */
export default async function SemuaPengajuanAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

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
    `/api/v1/admin/submissions${qs ? `?${qs}` : ""}`,
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

    return qs ? `/admin/pengajuan?${qs}` : "/admin/pengajuan";
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Semua Pengajuan
        </h1>
        <p className="text-sm text-muted-foreground">
          Seluruh pengajuan dari semua pemohon. Pencarian mencakup judul,
          nomor pengajuan, penulis, dan nama pemohon.
        </p>
      </header>

      <SubmissionFilters
        q={q}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        action="/admin/pengajuan"
      />

      <section aria-label="Daftar pengajuan" className="space-y-3">
        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Tidak ada pengajuan ditemukan.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              {q || status || dateFrom || dateTo
                ? "Coba ubah kata kunci atau filter Anda."
                : "Belum ada pengajuan yang masuk."}
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/pengajuan/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-muted-foreground text-xs">
                      {item.submission_number}
                    </p>
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {item.user?.name ?? "Pemohon"} — {item.main_author} —{" "}
                      {item.publisher_name ?? "tanpa penerbit"} — diperbarui{" "}
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
