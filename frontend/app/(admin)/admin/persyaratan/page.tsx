import { Plus } from "lucide-react";
import Link from "next/link";

import { DeleteRequirementButton } from "@/components/admin/delete-requirement-button";
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
import { formatUkuranFile } from "@/lib/format";
import type { DocumentRequirement } from "@/lib/types";

export const metadata = { title: "Persyaratan Dokumen" };

/**
 * CRUD persyaratan dokumen (Tahap 7) — GET/POST/PUT/DELETE
 * /api/v1/admin/document-requirements (docs/API.md §3.4).
 */
export default async function PersyaratanDokumenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = await searchParams;

  const ambil = (key: string): string => {
    const nilai = sp[key];

    return typeof nilai === "string" ? nilai : "";
  };

  const data = await apiFetch<DocumentRequirement[]>(
    "/api/v1/admin/document-requirements",
  );

  const dibuat = ambil("created") === "1";
  const diperbarui = ambil("updated") === "1";
  const dihapus = ambil("deleted") === "1";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Persyaratan Dokumen
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar persyaratan yang tampil pada formulir unggah pemohon,
            beserta tipe berkas dan batas ukurannya.
          </p>
        </div>
        <Button render={<Link href="/admin/persyaratan/baru" />}>
          <Plus />
          Tambah Persyaratan
        </Button>
      </header>

      {dibuat || diperbarui || dihapus ? (
        <Alert>
          <AlertDescription>
            {dibuat
              ? "Persyaratan dokumen berhasil dibuat."
              : diperbarui
                ? "Persyaratan dokumen berhasil diperbarui."
                : "Persyaratan dokumen berhasil dihapus."}
          </AlertDescription>
        </Alert>
      ) : null}

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Belum ada persyaratan dokumen.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan persyaratan agar pemohon dapat mengunggah dokumen.
          </p>
          <Button
            render={<Link href="/admin/persyaratan/baru" />}
            className="mt-4"
          >
            <Plus />
            Tambah Persyaratan
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-right">Urutan</TableHead>
                <TableHead>Persyaratan</TableHead>
                <TableHead>Wajib</TableHead>
                <TableHead>Tipe Berkas</TableHead>
                <TableHead className="whitespace-nowrap">Maks. Ukuran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-right text-muted-foreground">
                    {item.sort_order}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.name}</span>
                    {item.description ? (
                      <span className="mt-0.5 block max-w-sm text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_required ? "default" : "outline"}>
                      {item.is_required ? "Wajib" : "Opsional"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <span className="block text-xs break-all text-muted-foreground">
                      {item.allowed_mime_types.join(", ")}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatUkuranFile(item.max_file_size)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "secondary" : "outline"}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-start justify-end gap-1">
                      <Button
                        render={
                          <Link href={`/admin/persyaratan/${item.id}`} />
                        }
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <DeleteRequirementButton
                        requirementId={item.id}
                        nama={item.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catatan Pengelolaan</CardTitle>
          <CardDescription>
            Persyaratan yang sudah dipakai dokumen pengajuan tidak dapat dihapus
            (backend membalas 409). Nonaktifkan agar tidak tampil pada formulir
            baru tanpa merusak riwayat unggahan.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
