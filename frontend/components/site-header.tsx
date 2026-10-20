import { BookMarked } from "lucide-react";
import Link from "next/link";

import { PublicMobileNav } from "@/components/public-mobile-nav";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/#alur", label: "Alur Pengajuan" },
  { href: "/#persyaratan", label: "Persyaratan" },
];

/** Header halaman publik (beranda, login, daftar) — desktop + mobile. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookMarked className="size-4" />
          </span>
          <span>LPTI-ISBN</span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              render={<Link href={link.href} />}
            >
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link href="/login" />}
          >
            Masuk
          </Button>
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link href="/register" />}
          >
            Daftar
          </Button>
          <div className="md:hidden">
            <PublicMobileNav links={NAV_LINKS} />
          </div>
        </div>
      </div>
    </header>
  );
}
