import { Bell, Plus } from "lucide-react";
import Link from "next/link";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { requireApplicant } from "@/lib/auth";
import { formatTanggalPendek } from "@/lib/format";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { BookSubmission, SubmissionStats } from "@/lib/types";

export const metadata = { title: "Dashboard" };

/** Alur proses pengajuan (master prompt §5.5 — timeline proses). */
const ALUR_PROSES = [
  {
    judul: "Diajukan",
    keterangan:
      "Pengajuan dikirim dan menunggu pemeriksaan verifikator. Status: Diajukan.",
  },
  {
    judul: "Dalam Verifikasi",
    keterangan:
      "Admin memeriksa data buku, profil, dan dokumen persyaratan Anda.",
  },
  {
    judul: "Perlu Revisi",
    keterangan:
      "Bila ada kekurangan, Anda memperbaiki pengajuan lalu mengajukannya ulang.",
  },
  {
    judul: "Disetujui untuk Diproses",
    keterangan:
      "Pengajuan disetujui. Pencatatan nomor ISBN menunggu penetapan nomor yang sah.",
  },
  {
    judul: "ISBN Ditetapkan",
    keterangan:
      "Nomor ISBN yang sudah sah ditetapkan dicatat oleh admin pada pengajuan Anda.",
  },
];

/**
 * Dashboard pemohon (Tahap 7) — seluruh angka berasal dari
 * GET /api/v1/submissions/stats, bukan data dummy (master prompt §5.5).
 */
export default async function DashboardPemohonPage() {
  // Hanya pemohon (applicant) — admin/super_admin diarahkan ke /admin.
  const user = await requireApplicant();

  const [stats, { data: terbaru }] = await Promise.all([
    apiFetch<SubmissionStats>("/api/v1/submissions/stats"),
    apiFetchWithMeta<BookSubmission[]>("/api/v1/submissions"),
  ]);

  const jumlah = (status: string): number =>
    stats.by_status.find((item) => item.status === status)?.total ?? 0;

  const kartu = [
    { label: "Total Pengajuan", nilai: stats.total },
    {
      label: "Menunggu Diperiksa",
      nilai: jumlah("submitted") + jumlah("resubmitted"),
    },
    { label: "Dalam Verifikasi", nilai: jumlah("under_review") },
    { label: "Perlu Revisi", nilai: jumlah("needs_revision") },
    { label: "ISBN Ditetapkan", nilai: jumlah("isbn_assigned") },
  ];

  const pengajuanTerbaru = terbaru.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Selamat datang, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan pengajuan ISBN Anda dan status terkininya.
          </p>
        </div>
        <Button render={<Link href="/pengajuan/baru" />}>
          <Plus />
          Buat Pengajuan Baru
        </Button>
      </header>

      {stats.unread_notifications > 0 ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Anda memiliki {stats.unread_notifications} notifikasi belum
              dibaca — termasuk catatan revisi dan hasil verifikasi.
            </span>
            <Button
              render={<Link href="/notifikasi?unread=1" />}
              variant="outline"
              size="sm"
            >
              <Bell />
              Lihat Notifikasi
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Ringkasan"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {kartu.map((item) => (
          <Card key={item.label} size="sm">
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.nilai}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section
        aria-label="Sebaran status"
        className="flex flex-wrap gap-2 text-sm"
      >
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className="rounded-full border border-input px-3 py-1 text-muted-foreground"
          >
            {STATUS_META[status].label}:{" "}
            <strong className="font-semibold text-foreground">
              {jumlah(status)}
            </strong>
          </span>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
          <CardDescription>
            Lima pengajuan terakhir — klik untuk membuka detail dan histori
            status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pengajuanTerbaru.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Belum ada pengajuan.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Mulai dengan membuat pengajuan ISBN pertama Anda.
              </p>
              <Button render={<Link href="/pengajuan/baru" />} className="mt-4">
                <Plus />
                Buat Pengajuan Baru
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Pengajuan</TableHead>
                  <TableHead>Judul Buku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Diperbarui
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengajuanTerbaru.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.submission_number}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatTanggalPendek(item.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        render={<Link href={`/pengajuan/${item.id}`} />}
                        variant="outline"
                        size="sm"
                      >
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alur Proses Pengajuan</CardTitle>
          <CardDescription>
            Tahapan yang dilalui pengajuan ISBN Anda dari pengiriman hingga
            pencatatan nomor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ALUR_PROSES.map((langkah, indeks) => (
              <li key={langkah.judul} className="space-y-1">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {indeks + 1}
                </span>
                <p className="text-sm font-medium">{langkah.judul}</p>
                <p className="text-xs text-muted-foreground">
                  {langkah.keterangan}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Catatan: status &quot;Disetujui untuk Diproses&quot; belum berarti
            nomor ISBN resmi telah terbit — nomor hanya dicatat setelah sah
            ditetapkan pihak berwenang.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
