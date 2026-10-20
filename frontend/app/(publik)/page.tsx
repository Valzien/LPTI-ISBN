import {
  ArrowRight,
  ClipboardList,
  FileUp,
  PenLine,
  ShieldCheck,
  Stamp,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SubmissionStatus } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/status";

const LANGKAH = [
  {
    nomor: "1",
    judul: "Daftar akun pemohon",
    isi: "Buat akun dengan data diri yang valid, lalu tunggu verifikasi admin.",
    icon: UserPlus,
  },
  {
    nomor: "2",
    judul: "Siapkan pengajuan",
    isi: "Isi data buku dan unggah dokumen sesuai persyaratan yang berlaku.",
    icon: FileUp,
  },
  {
    nomor: "3",
    judul: "Verifikasi oleh admin",
    isi: "Admin meninjau kelengkapan. Bila perlu perbaikan, Anda menerima catatan revisi.",
    icon: ClipboardList,
  },
  {
    nomor: "4",
    judul: "Pencatatan ISBN",
    isi: "Setelah disetujui, nomor ISBN yang telah sah ditetapkan dicatat oleh admin.",
    icon: Stamp,
  },
];

/**
 * DATA CONTOH (preview Tahap 3) — daftar riil dikelola admin lewat API
 * dan dapat berubah sewaktu-waktu (master prompt §Persyaratan Dokumen).
 */
const PERSYARATAN_CONTOH = [
  {
    nama: "KTP Penulis / Surat Keterangan Penerbit",
    ket: "Identitas pemohon dalam satu berkas PDF atau foto.",
  },
  {
    nama: "Surat Pernyataan Keaslian Naskah",
    ket: "Ditandatangani penulis atau penerbit yang bertanggung jawab.",
  },
  {
    nama: "Sinopsis Buku",
    ket: "Ringkasan isi buku, kurang lebih satu halaman.",
  },
  {
    nama: "Contoh Isi / Sampul Buku",
    ket: "Beberapa halaman awal naskah dan desain sampul.",
  },
];

const PENJELASAN_STATUS: Record<SubmissionStatus, string> = {
  draft: "Pengajuan sedang disiapkan dan belum dikirim.",
  submitted: "Sudah dikirim, menunggu pemeriksaan verifikator.",
  under_review: "Sedang diperiksa oleh tim verifikasi.",
  needs_revision: "Perlu perbaikan — catatan revisi dikirim ke pemohon.",
  resubmitted: "Revisi telah dikirim ulang dan menunggu pemeriksaan.",
  approved_for_processing:
    "Disetujui untuk diproses lebih lanjut (belum berarti ISBN diterbitkan).",
  isbn_assigned: "Nomor ISBN yang sah telah dicatat oleh admin.",
  rejected: "Pengajuan ditolak beserta alasannya.",
};

function JudulSeksi({
  eyebrow,
  judul,
  deskripsi,
}: {
  eyebrow: string;
  judul: string;
  deskripsi: string;
}) {
  return (
    <div className="mb-8 max-w-2xl space-y-2">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {judul}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        {deskripsi}
      </p>
    </div>
  );
}

export default function BerandaPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl space-y-6">
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="size-3.5" />
              Platform independen — bukan portal resmi Perpusnas
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Kelola pengajuan ISBN buku Anda secara tertib dan terlacak
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
              LPTI-ISBN membantu penulis dan penerbit menyiapkan pengajuan
              ISBN, mengunggah dokumen persyaratan, dan memantau proses
              verifikasi — lengkap dengan riwayat setiap perubahan status.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Daftar Sekarang
                <ArrowRight />
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={<Link href="/login" />}
              >
                Masuk
              </Button>
              <Button
                variant="ghost"
                size="lg"
                render={<Link href="/#alur" />}
              >
                Lihat alur pengajuan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Nomor ISBN tidak pernah dibuat otomatis oleh sistem — hanya
              dicatat oleh admin setelah ditetapkan secara sah.
            </p>
          </div>
        </div>
      </section>

      {/* Alur */}
      <section id="alur" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <JudulSeksi
            eyebrow="Alur Pengajuan"
            judul="Empat langkah dari naskah hingga pencatatan ISBN"
            deskripsi="Setiap tahap tercatat otomatis dalam histori status, sehingga Anda selalu tahu posisi pengajuan."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map((langkah) => (
              <Card key={langkah.nomor}>
                <CardHeader>
                  <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <langkah.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">
                    <span className="mr-1.5 text-muted-foreground">
                      {langkah.nomor}.
                    </span>
                    {langkah.judul}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {langkah.isi}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Persyaratan */}
      <section
        id="persyaratan"
        className="scroll-mt-20 border-y bg-muted/20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <JudulSeksi
            eyebrow="Persyaratan Dokumen"
            judul="Dokumen yang umumnya disiapkan"
            deskripsi="Daftar persyaratan bersifat dinamis dan sepenuhnya dikelola oleh admin platform."
          />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Data contoh (preview)</Badge>
            <p className="text-xs text-muted-foreground">
              Nama dan ketentuan di bawah ini adalah data sementara untuk
              pratinjau tampilan dan akan diganti dengan data dari admin.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PERSYARATAN_CONTOH.map((syarat) => (
              <Card key={syarat.nama}>
                <CardHeader>
                  <CardTitle className="text-base">{syarat.nama}</CardTitle>
                  <CardDescription>{syarat.ket}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">Wajib</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Status */}
      <section id="status">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <JudulSeksi
            eyebrow="Pelacakan Status"
            judul="Delapan status resmi untuk setiap pengajuan"
            deskripsi="Perubahan status hanya terjadi melalui transisi yang sah dan tercatat dalam histori beserta pelakunya."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {STATUS_ORDER.map((status) => (
              <div
                key={status}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <StatusBadge status={status} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-snug text-muted-foreground">
                  {PENJELASAN_STATUS[status]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Label dan urutan ini selaras dengan definisi status di backend.
          </p>
        </div>
      </section>

      {/* Ajakan */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <Card className="items-center gap-4 bg-primary text-primary-foreground sm:flex-row sm:justify-between sm:gap-8 sm:px-8">
            <CardHeader className="sm:gap-1">
              <CardTitle className="text-xl text-primary-foreground">
                Siap mengajukan buku Anda?
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Buat akun pemohon, siapkan dokumen, dan lacak prosesnya hingga
                pencatatan ISBN.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex shrink-0 flex-wrap gap-3">
              <Button
                variant="secondary"
                render={<Link href="/register" />}
              >
                Daftar
              </Button>
              <Button
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                render={<Link href="/login" />}
              >
                Masuk
              </Button>
            </CardContent>
          </Card>
          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <PenLine className="mt-0.5 size-3.5 shrink-0" />
            <p>
              LPTI-ISBN bukan situs resmi pemerintah dan tidak menerbitkan
              nomor ISBN. Nomor hanya dicatat setelah ditetapkan oleh pihak
              yang berwenang sesuai ketentuan yang berlaku.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
