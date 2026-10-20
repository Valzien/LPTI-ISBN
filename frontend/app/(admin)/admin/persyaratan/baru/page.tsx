import Link from "next/link";

import { RequirementForm } from "@/components/admin/requirement-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Tambah Persyaratan" };

/**
 * Form pembuatan persyaratan dokumen (Tahap 7) — POST
 * /api/v1/admin/document-requirements.
 */
export default async function PersyaratanBaruPage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Tambah Persyaratan
        </h1>
        <p className="text-sm text-muted-foreground">
          Persyaratan aktif akan tampil pada formulir unggah dokumen pemohon.
        </p>
      </header>

      <RequirementForm />

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
