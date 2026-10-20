"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface PublicMobileNavProps {
  links: { href: string; label: string }[];
}

/** Menu navigasi halaman publik untuk layar kecil (Sheet dari kanan). */
export function PublicMobileNav({ links }: PublicMobileNavProps) {
  const [open, setOpen] = useState(false);
  const tutup = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka menu navigasi" />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Navigasi halaman publik LPTI-ISBN
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label="Navigasi menu seluler"
          className="flex flex-col gap-1 px-4"
        >
          {links.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              className="justify-start"
              render={
                <Link href={link.href} onClick={tutup} />
              }
            >
              {link.label}
            </Button>
          ))}
          <Button
            variant="outline"
            className="justify-start"
            render={<Link href="/login" onClick={tutup} />}
          >
            Masuk
          </Button>
          <Button
            className="justify-start"
            render={<Link href="/register" onClick={tutup} />}
          >
            Daftar
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
