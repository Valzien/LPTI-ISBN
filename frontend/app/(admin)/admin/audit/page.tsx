import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetchWithMeta } from "@/lib/api";
import { DAFTAR_AKSI, labelAksi, labelEntitas } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { formatWaktu } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/types";

export const metadata = { title: "Log Audit" };

/**
 * Log audit aktivitas sensitif (Tahap 7, master prompt §5.9) —
 * GET /api/v1/admin/audit-log dengan filter aksi, aktor, dan rentang tanggal.
 * Metadata yang ditampilkan sudah dibatasi backend (tanpa kredensial).
 */
export default async function AuditLogPage({
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

  const action = ambil("action").slice(0, 100);
  const actorMentah = ambil("actor_user_id");
  const actorUserId = /^\d+$/.test(actorMentah) ? actorMentah : "";
  const dateFrom = ambil("date_from");
  const dateTo = ambil("date_to");

  // Rentang terbalik dicegah di UI agar backend tidak membalas 422.
  const rentangSalah = Boolean(dateFrom && dateTo && dateTo < dateFrom);

  const pageMentah = Number.parseInt(ambil("page"), 10);
  const page = Number.isFinite(pageMentah) && pageMentah > 0 ? pageMentah : 1;

  const query = new URLSearchParams();

  if (action) query.set("action", action);
  if (actorUserId) query.set("actor_user_id", actorUserId);
  if (dateFrom && !rentangSalah) query.set("date_from", dateFrom);
  if (dateTo && !rentangSalah) query.set("date_to", dateTo);
  if (page > 1) query.set("page", String(page));

  const qs = query.toString();

  const { data, meta } = await apiFetchWithMeta<AuditLogEntry[]>(
    `/api/v1/admin/audit-log${qs ? `?${qs}` : ""}`,
  );

  const tautanHalaman = (tujuan: number): string => {
    const params = new URLSearchParams(query);

    if (tujuan <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(tujuan));
    }

    const qs = params.toString();

    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  };

  const adaFilter = Boolean(action || actorUserId || dateFrom || dateTo);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Log Audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Riwayat aktivitas sensitif: masuk/keluar, perubahan status, aksi
          admin, unggah/unduh dokumen, dan ekspor laporan.
        </p>
      </header>

      {rentangSalah ? (
        <Alert variant="destructive">
          <AlertDescription>
            Tanggal akhir tidak boleh sebelum tanggal awal — filter tanggal
            diabaikan. Perbaiki rentang lalu terapkan kembali.
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        method="get"
        action="/admin/audit"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto_auto] lg:items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="action">Aksi</Label>
          <Input
            id="action"
            name="action"
            list="daftar-aksi"
            defaultValue={action}
            placeholder="mis. submission.status_changed"
          />
          <datalist id="daftar-aksi">
            {DAFTAR_AKSI.map((nilai) => (
              <option key={nilai} value={nilai} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <Label htmlFor="actor_user_id">ID Aktor</Label>
          <Input
            id="actor_user_id"
            name="actor_user_id"
            type="number"
            min={1}
            defaultValue={actorUserId}
            placeholder="mis. 1"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date_from">Tanggal Dari</Label>
          <Input
            id="date_from"
            name="date_from"
            type="date"
            defaultValue={dateFrom}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date_to">Tanggal Sampai</Label>
          <Input
            id="date_to"
            name="date_to"
            type="date"
            defaultValue={dateTo}
          />
        </div>

        <Button type="submit" size="sm">
          Terapkan
        </Button>
        <Button render={<Link href="/admin/audit" />} variant="outline" size="sm">
          Reset
        </Button>
      </form>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Tidak ada aktivitas ditemukan.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {adaFilter
              ? "Coba ubah filter aksi, aktor, atau rentang tanggal."
              : "Log audit akan terisi saat pengguna beraktivitas."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="whitespace-nowrap">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatWaktu(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    {entry.actor ? (
                      <span>
                        {entry.actor.name}
                        <span className="block text-xs text-muted-foreground">
                          ID {entry.actor.id}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sistem</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{labelAksi(entry.action)}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {entry.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {labelEntitas(entry.entity_type)}
                    {entry.entity_id !== null ? (
                      <span className="block text-xs text-muted-foreground">
                        #{entry.entity_id}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {entry.metadata ? (
                      <code className="block max-h-24 overflow-y-auto text-[11px] break-all text-muted-foreground">
                        {JSON.stringify(entry.metadata)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {entry.ip_address ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta.last_page > 1 ? (
        <nav
          aria-label="Paginasi"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="text-muted-foreground">
            Halaman {meta.current_page} dari {meta.last_page} — {meta.total}{" "}
            entri
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
