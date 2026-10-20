import { FileText } from "lucide-react";
import Link from "next/link";

import { StatCards } from "@/components/admin/stat-cards";
import { StatusBadge } from "@/components/status-badge";
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
import { apiFetch } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatTanggalPendek } from "@/lib/format";
import type { AdminDashboardStats } from "@/lib/types";

export const metadata = { title: "Dashboard Admin" };

/**
 * Dashboard admin (Tahap 6, master prompt §5.6): statistik terhitung dari
 * database lewat GET /api/v1/admin/dashboard + tabel pengajuan terbaru.
 */
export default async function DashboardAdminPage() {
  await requireAdmin();

  const stats = await apiFetch<AdminDashboardStats>("/api/v1/admin/dashboard");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan pengajuan masuk dan antrean verifikasi ISBN.
          </p>
        </div>
        <Button render={<Link href="/admin/pengajuan" />}>
          <FileText />
          Lihat Semua Pengajuan
        </Button>
      </header>

      <StatCards stats={stats} />

      <section
        aria-label="Sebaran status"
        className="flex flex-wrap gap-2 text-sm"
      >
        {stats.by_status.map((item) => (
          <span
            key={item.status}
            className="rounded-full border border-input px-3 py-1 text-muted-foreground"
          >
            {item.label}:{" "}
            <strong className="font-semibold text-foreground">{item.total}</strong>
          </span>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
          <CardDescription>
            Sepuluh pengajuan paling baru — klik untuk membuka halaman
            verifikasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Belum ada pengajuan masuk.</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Pengajuan dari pemohon akan tampil di sini.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Pengajuan</TableHead>
                  <TableHead>Judul Buku</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Pemohon
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Diperbarui
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.submission_number}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {item.user?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatTanggalPendek(item.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        render={<Link href={`/admin/pengajuan/${item.id}`} />}
                        variant="outline"
                        size="sm"
                      >
                        Periksa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
