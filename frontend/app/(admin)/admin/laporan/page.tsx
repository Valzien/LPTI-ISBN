import { Download, FileText } from "lucide-react";
import Link from "next/link";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { ReportSummary, SubmissionStatus } from "@/lib/types";

export const metadata = { title: "Laporan" };

/**
 * Laporan pengajuan (Tahap 7, master prompt §5.9) — ringkasan dari
 * GET /api/v1/admin/reports/submissions dan ekspor CSV aman melalui proxy BFF.
 */
export default async function LaporanAdminPage({
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

  const statusMentah = ambil("status");
  const status = (STATUS_ORDER as readonly string[]).includes(statusMentah)
    ? (statusMentah as SubmissionStatus)
    : null;
  const dateFrom = ambil("date_from");
  const dateTo = ambil("date_to");

  // Rentang terbalik dicegah di UI agar backend tidak membalas 422.
  const rentangSalah = Boolean(dateFrom && dateTo && dateTo < dateFrom);

  const query = new URLSearchParams();

  if (status) query.set("status", status);
  if (dateFrom && !rentangSalah) query.set("date_from", dateFrom);
  if (dateTo && !rentangSalah) query.set("date_to", dateTo);

  const qs = query.toString();

  const ringkasan = await apiFetch<ReportSummary>(
    `/api/v1/admin/reports/submissions${qs ? `?${qs}` : ""}`,
  );

  const tautanCsv = `/api/admin/reports/submissions-csv${qs ? `?${qs}` : ""}`;

  const adaFilter = Boolean(status || dateFrom || dateTo);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Laporan Pengajuan
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan pengajuan berdasarkan status dan rentang tanggal, serta
            ekspor CSV untuk kebutuhan pelaporan.
          </p>
        </div>
        <Button render={<a href={tautanCsv} />}>
          <Download />
          Unduh CSV
        </Button>
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
        action="/admin/laporan"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Semua status</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {STATUS_META[value].label}
              </option>
            ))}
          </select>
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
        <Button render={<Link href="/admin/laporan" />} variant="outline" size="sm">
          Reset
        </Button>
      </form>

      <section aria-label="Ringkasan laporan" className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total Pengajuan</CardDescription>
            <CardTitle className="text-3xl">{ringkasan.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Status Terpilih</CardDescription>
            <CardTitle className="text-base">
              {status ? STATUS_META[status].label : "Semua status"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Rentang Tanggal</CardDescription>
            <CardTitle className="text-base">
              {adaFilter && (dateFrom || dateTo)
                ? `${dateFrom ? formatTanggal(dateFrom) : "awal"} — ${
                    dateTo ? formatTanggal(dateTo) : "sekarang"
                  }`
                : "Semua waktu"}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sebaran per Status</CardTitle>
          <CardDescription>
            Dihitung langsung dari database pada{" "}
            {formatWaktu(ringkasan.generated_at)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ringkasan.by_status.map((item) => (
                <TableRow key={item.status}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Isi Ekspor CSV</CardTitle>
          <CardDescription>
            Kolom: nomor pengajuan, judul, subjudul, penulis utama, penerbit,
            nama pemohon, status, ISBN (bila sudah dicatat), tanggal dibuat, dan
            diperbarui. Ekspor tidak memuat email, catatan internal, maupun URL
            dokumen privat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          <span>
            Ekspor mengikuti filter di atas. Setiap ekspor tercatat pada log
            audit (aksi &quot;Ekspor laporan CSV&quot;).
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
