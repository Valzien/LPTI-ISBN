import { Plus } from "lucide-react";
import Link from "next/link";

import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { apiFetchWithMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatTanggalPendek } from "@/lib/format";
import type { User } from "@/lib/types";

export const metadata = { title: "Pengguna" };

/** Pilihan role yang dapat difilter (selaras enum backend). */
const ROLE_FILTER = [
  { value: "applicant", label: "Pemohon" },
  { value: "admin", label: "Admin / Verifikator" },
  { value: "super_admin", label: "Admin Utama" },
] as const;

/**
 * Manajemen akun pengguna (Tahap 7) — hanya super_admin.
 * GET/POST/PUT/DELETE /api/v1/admin/users (docs/API.md §3.4).
 */
export default async function PenggunaAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();

  const sp = await searchParams;

  const ambil = (key: string): string => {
    const nilai = sp[key];

    return typeof nilai === "string" ? nilai.trim() : "";
  };

  if (user.role !== "super_admin") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pengguna
          </h1>
          <p className="text-sm text-muted-foreground">
            Manajemen akun pengguna platform LPTI-ISBN.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Khusus Admin Utama</CardTitle>
            <CardDescription>
              Hanya akun dengan role Admin Utama (super_admin) yang dapat
              membuat, mengubah, atau menghapus akun pengguna. Anda tetap dapat
              melihat daftar pemohon melalui menu Daftar Pemohon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/admin/pemohon" />} variant="outline">
              Buka Daftar Pemohon
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = ambil("q").slice(0, 100);
  const roleMentah = ambil("role");
  const role = ROLE_FILTER.some((item) => item.value === roleMentah)
    ? roleMentah
    : "";
  const pageMentah = Number.parseInt(ambil("page"), 10);
  const page = Number.isFinite(pageMentah) && pageMentah > 0 ? pageMentah : 1;

  const query = new URLSearchParams();

  if (q) query.set("q", q);
  if (role) query.set("role", role);
  if (page > 1) query.set("page", String(page));

  const qs = query.toString();

  const { data, meta } = await apiFetchWithMeta<User[]>(
    `/api/v1/admin/users${qs ? `?${qs}` : ""}`,
  );

  const tautanHalaman = (tujuan: number): string => {
    const params = new URLSearchParams(query);

    if (tujuan <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(tujuan));
    }

    const qs = params.toString();

    return qs ? `/admin/pengguna?${qs}` : "/admin/pengguna";
  };

  const dibuat = ambil("created") === "1";
  const diperbarui = ambil("updated") === "1";
  const dihapus = ambil("deleted") === "1";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pengguna
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun pemohon, admin, dan admin utama. Kredensial tidak
            pernah ditampilkan.
          </p>
        </div>
        <Button render={<Link href="/admin/pengguna/baru" />}>
          <Plus />
          Tambah Pengguna
        </Button>
      </header>

      {dibuat || diperbarui || dihapus ? (
        <Alert>
          <AlertDescription>
            {dibuat
              ? "Akun pengguna berhasil dibuat."
              : diperbarui
                ? "Data akun pengguna berhasil diperbarui."
                : "Akun pengguna berhasil dihapus."}
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        method="get"
        action="/admin/pengguna"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto_auto] lg:items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="q">Cari Pengguna</Label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Nama atau email"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue={role}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Semua role</option>
            {ROLE_FILTER.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          Terapkan
        </Button>
        <Button
          render={<Link href="/admin/pengguna" />}
          variant="outline"
          size="sm"
        >
          Reset
        </Button>
      </form>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Tidak ada pengguna ditemukan.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba ubah kata kunci atau filter role.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Pengajuan</TableHead>
                <TableHead className="hidden md:table-cell">Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((akun) => (
                <TableRow key={akun.id}>
                  <TableCell className="font-medium">
                    {akun.name}
                    {akun.id === user.id ? (
                      <Badge variant="outline" className="ml-2">
                        Anda
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {akun.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={akun.role === "applicant" ? "secondary" : "default"}
                    >
                      {akun.role_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {akun.submissions_count ?? 0}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatTanggalPendek(akun.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-start justify-end gap-1">
                      <Button
                        render={
                          <Link href={`/admin/pengguna/${akun.id}`} />
                        }
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      {akun.id === user.id ? null : (
                        <DeleteUserButton userId={akun.id} nama={akun.name} />
                      )}
                    </div>
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
            pengguna
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
