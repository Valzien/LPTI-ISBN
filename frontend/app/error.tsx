"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Error boundary tingkat route (wajib Client Component).
 * Detail teknis error sengaja tidak ditampilkan ke pengguna.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Permintaan tidak dapat diproses untuk saat ini. Silakan coba lagi, atau
        kembali ke beranda bila masalah berlanjut.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RefreshCw />
          Coba Lagi
        </Button>
        <Button variant="outline" render={<Link href="/" />}>
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
