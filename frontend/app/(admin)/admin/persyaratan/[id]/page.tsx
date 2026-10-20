import Link from "next/link";
import { notFound } from "next/navigation";

import { RequirementForm } from "@/components/admin/requirement-form";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { DocumentRequirement } from "@/lib/types";

export const metadata = { title: "Ubah Persyaratan" };

/**
 * Form edit persyaratan dokumen (Tahap 7).
 * Endpoint admin tidak menyediakan detail per-ID; daftar persyaratan memang
 * kecil sehingga datanya diambil dari daftar lalu dicocokkan.
 */
export default async function PersyaratanEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const daftar = await apiFetch<DocumentRequirement[]>(
    "/api/v1/admin/document-requirements",
  );

  const requirement = daftar.find((item) => item.id === Number(id));

  if (!requirement) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Ubah Persyaratan
        </h1>
        <p className="text-sm text-muted-foreground">
          {requirement.name} — perubahan berlaku untuk formulir unggah
          berikutnya.
        </p>
      </header>

      <RequirementForm requirement={requirement} />

      <Button
        render={<Link href="/admin/persyaratan" />}
        variant="ghost"
        size="sm"
      >
        Kembali ke daftar persyaratan
      </Button>
    </div>
  );
}
