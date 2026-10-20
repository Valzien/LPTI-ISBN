import Link from "next/link";

import { NotificationList } from "@/components/notification/notification-list";
import { Button } from "@/components/ui/button";
import { apiFetchWithMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { AppNotification } from "@/lib/types";

export const metadata = { title: "Notifikasi Admin" };

/**
 * Notifikasi admin/verifikator (Tahap 7) — mis. pengajuan baru menunggu
 * pemeriksaan. GET /api/v1/notifications (docs/API.md §3.3).
 */
export default async function NotifikasiAdminPage({
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

  const hanyaBelumDibaca = ambil("unread") === "1";
  const pageMentah = Number.parseInt(ambil("page"), 10);
  const page = Number.isFinite(pageMentah) && pageMentah > 0 ? pageMentah : 1;

  const query = new URLSearchParams();

  if (hanyaBelumDibaca) query.set("unread", "1");
  if (page > 1) query.set("page", String(page));

  const qs = query.toString();

  const { data, meta } = await apiFetchWithMeta<AppNotification[]>(
    `/api/v1/notifications${qs ? `?${qs}` : ""}`,
  );

  const tautanHalaman = (tujuan: number): string => {
    const params = new URLSearchParams(query);

    if (tujuan <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(tujuan));
    }

    const qs = params.toString();

    return qs ? `/admin/notifikasi?${qs}` : "/admin/notifikasi";
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Notifikasi
        </h1>
        <p className="text-sm text-muted-foreground">
          Pemberitahuan pengajuan baru yang menunggu pemeriksaan verifikator.
        </p>
      </header>

      <nav aria-label="Filter notifikasi" className="flex gap-2 text-sm">
        <Button
          render={<Link href="/admin/notifikasi" />}
          variant={hanyaBelumDibaca ? "outline" : "default"}
          size="sm"
        >
          Semua
        </Button>
        <Button
          render={<Link href="/admin/notifikasi?unread=1" />}
          variant={hanyaBelumDibaca ? "default" : "outline"}
          size="sm"
        >
          Belum Dibaca
        </Button>
      </nav>

      <NotificationList items={data} basePath="/admin/pengajuan" />

      {meta.last_page > 1 ? (
        <nav
          aria-label="Paginasi"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="text-muted-foreground">
            Halaman {meta.current_page} dari {meta.last_page} — {meta.total}{" "}
            notifikasi
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
