import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchWithMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatTanggalPendek } from "@/lib/format";
import type { User } from "@/lib/types";

export const metadata = { title: "Daftar Pemohon" };

/**
 * Daftar pemohon + ringkasan pengajuan (Tahap 7) —
 * GET /api/v1/admin/pemohon dengan pencarian nama/email dan pagination.
 */
export default async function DaftarPemohonPage({
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
  const pageMentah = Number.parseInt(ambil("page"), 10);
  const page = Number.isFinite(pageMentah) && pageMentah > 0 ? pageMentah : 1;

  const query = new URLSearchParams();

  if (q) query.set("q", q);
  if (page > 1) query.set("page", String(page));

  const qs = query.toString();

  const { data, meta } = await apiFetchWithMeta<User[]>(
    `/api/v1/admin/pemohon${qs ? `?${qs}` : ""}`,
  );

  const tautanHalaman = (tujuan: number): string => {
    const params = new URLSearchParams(query);

    if (tujuan <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(tujuan));
    }

    const qs = params.toString();

    return qs ? `/admin/pemohon?${qs}` : "/admin/pemohon";
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Daftar Pemohon
        </h1>
        <p className="text-sm text-muted-foreground">
          Seluruh akun pemohon beserta jumlah pengajuan ISBN-nya.
        </p>
      </header>

      <form
        method="get"
        action="/admin/pemohon"
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="q">Cari Pemohon</Label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Nama atau email pemohon"
          />
        </div>
        <Button type="submit" size="sm">
          Cari
        </Button>
        <Button render={<Link href="/admin/pemohon" />} variant="outline" size="sm">
          Reset
        </Button>
      </form>

      <section aria-label="Daftar pemohon" className="space-y-3">
        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Tidak ada pemohon ditemukan.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q
                ? "Coba ubah kata kunci pencarian Anda."
                : "Belum ada akun pemohon terdaftar."}
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.map((pemohon) => (
              <li
                key={pemohon.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{pemohon.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pemohon.email}
                    {pemohon.applicant_type_label
                      ? ` — ${pemohon.applicant_type_label}`
                      : ""}
                    {pemohon.publisher_name
                      ? ` — ${pemohon.publisher_name}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bergabung {formatTanggalPendek(pemohon.created_at)} —{" "}
                    <strong className="font-semibold text-foreground">
                      {pemohon.submissions_count ?? 0}
                    </strong>{" "}
                    pengajuan
                  </p>
                </div>
                <Button
                  render={
                    <Link
                      href={`/admin/pengajuan?q=${encodeURIComponent(pemohon.name)}`}
                    />
                  }
                  variant="outline"
                  size="sm"
                >
                  Lihat Pengajuan
                </Button>
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
            pemohon
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
