import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SubmissionForm } from "@/components/submission/submission-form";
import { Button } from "@/components/ui/button";
import { requireApplicant } from "@/lib/auth";

export const metadata = { title: "Buat Pengajuan" };

/** Halaman pembuatan pengajuan baru — hasilnya tersimpan sebagai draft. */
export default async function PengajuanBaruPage() {
  // Hanya pemohon (applicant) — admin/super_admin diarahkan ke /admin.
  await requireApplicant();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-3">
        <Button
          render={<Link href="/pengajuan" />}
          variant="ghost"
          size="sm"
          className="-ml-2"
        >
          <ArrowLeft />
          Kembali ke Daftar Pengajuan
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pengajuan Baru
          </h1>
          <p className="text-sm text-muted-foreground">
            Isi data buku terlebih dahulu. Setelah tersimpan sebagai draft,
            lengkapi dokumen persyaratan sebelum mengajukan ke verifikator.
          </p>
        </div>
      </header>

      <SubmissionForm mode="create" />
    </div>
  );
}
