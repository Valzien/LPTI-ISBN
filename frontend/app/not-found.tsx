import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-6xl font-semibold text-muted-foreground">
        404
      </p>
      <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Halaman yang Anda tuju tidak ada, telah dipindahkan, atau Anda tidak
        memiliki akses ke sana.
      </p>
      <Button render={<Link href="/" />}>Kembali ke Beranda</Button>
    </div>
  );
}
