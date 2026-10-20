"use client";

import { BookMarked, LogIn, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DashboardNavLinks } from "@/components/dashboard/nav-links";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { User } from "@/lib/types";

interface MobileSidebarProps {
  variant: "pemohon" | "admin";
  user: User | null;
}

function inisialNama(nama: string): string {
  return nama
    .split(" ")
    .map((kata) => kata.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Sidebar dashboard untuk layar kecil (Sheet dari kiri). */
export function MobileSidebar({ variant, user }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const tutup = () => setOpen(false);
  const areaLabel = variant === "admin" ? "Area Admin" : "Area Pemohon";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buka menu navigasi"
            className="lg:hidden"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0 sm:max-w-none">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookMarked className="size-3.5" />
            </span>
            LPTI-ISBN
          </SheetTitle>
          <SheetDescription className="sr-only">
            Menu navigasi {areaLabel}
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label={areaLabel}
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          <DashboardNavLinks variant={variant} onNavigate={tutup} />
        </nav>
        <div className="mt-auto space-y-3 border-t p-4">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {inisialNama(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.role_label}
                </p>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              render={<Link href="/login" onClick={tutup} />}
            >
              <LogIn />
              Masuk
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
