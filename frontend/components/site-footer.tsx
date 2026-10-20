import Link from "next/link";

/** Footer publik — memuat disclaimer wajib (master prompt §Kepatuhan). */
export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-semibold">LPTI-ISBN</p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Platform pengelolaan pengajuan ISBN yang dikelola secara
            independen.{" "}
            <strong className="font-medium text-foreground">
              Bukan portal resmi Perpustakaan Nasional Republik Indonesia
              (Perpusnas).
            </strong>{" "}
            Nomor ISBN hanya dicatat setelah ditetapkan secara sah oleh pihak
            yang berwenang — sistem ini tidak menerbitkan atau menghasilkan
            nomor ISBN secara otomatis. Dokumen yang diunggah hanya disimpan
            secara privat dan ditinjau oleh admin platform.
          </p>
        </div>
        <nav
          aria-label="Tautan footer"
          className="flex flex-col items-start gap-2 text-sm"
        >
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Beranda
          </Link>
          <Link
            href="/#alur"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Alur Pengajuan
          </Link>
          <Link
            href="/#persyaratan"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Persyaratan Dokumen
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Masuk
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © 2026 LPTI-ISBN — data pemohon dan dokumen hanya diakses oleh admin
          platform untuk keperluan verifikasi.
        </p>
      </div>
    </footer>
  );
}
