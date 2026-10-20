import { Bell, BookMarked, LogOut } from "lucide-react";
import Link from "next/link";

import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { DashboardNavLinks } from "@/components/dashboard/nav-links";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { apiFetchWithMeta } from "@/lib/api";
import type { AppNotification, User } from "@/lib/types";

interface DashboardShellProps {
  variant: "pemohon" | "admin";
  user: User | null;
  children: React.ReactNode;
}

function inisialNama(nama: string): string {
  return nama
    .split(" ")
    .map((kata) => kata.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Jumlah notifikasi belum dibaca (0 bila backend tidak terjangkau). */
async function jumlahNotifikasiBelumDibaca(): Promise<number> {
  try {
    const { meta } = await apiFetchWithMeta<AppNotification[]>(
      "/api/v1/notifications?unread=1",
    );

    return meta.total;
  } catch {
    return 0;
  }
}

/**
 * Kerangka dashboard: sidebar desktop (lg+), topbar dengan menu seluler,
 * lonceng notifikasi, dan area konten. Data user berasal dari sesi cookie
 * httpOnly (lib/session).
 */
export async function DashboardShell({
  variant,
  user,
  children,
}: DashboardShellProps) {
  const areaLabel = variant === "admin" ? "Area Admin" : "Area Pemohon";
  const notifHref = variant === "admin" ? "/admin/notifikasi" : "/notifikasi";
  const belumDibaca = user ? await jumlahNotifikasiBelumDibaca() : 0;

  return (
    <div className="min-h-screen w-full bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookMarked className="size-4" />
            </span>
            LPTI-ISBN
          </Link>
        </div>
        <p className="px-4 pt-4 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {areaLabel}
        </p>
        <nav
          aria-label={areaLabel}
          className="flex-1 overflow-y-auto px-3 pb-4"
        >
          <DashboardNavLinks variant={variant} />
        </nav>
        <div className="border-t p-4">
          {user ? (
            <>
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
              <form action={logoutAction} className="mt-3">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <LogOut />
                  Keluar
                </Button>
              </form>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Belum masuk.{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Masuk
              </Link>{" "}
              untuk melihat data Anda.
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <MobileSidebar variant={variant} user={user} />
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight lg:hidden"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookMarked className="size-4" />
              </span>
              LPTI-ISBN
            </Link>
            <p className="hidden text-sm text-muted-foreground lg:block">
              {areaLabel}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <Link
                  href={notifHref}
                  aria-label={
                    belumDibaca > 0
                      ? `Notifikasi — ${belumDibaca} belum dibaca`
                      : "Notifikasi"
                  }
                  className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Bell className="size-5" />
                  {belumDibaca > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
                      {belumDibaca > 9 ? "9+" : belumDibaca}
                    </span>
                  ) : null}
                </Link>
                <div className="hidden text-right sm:block">
                  <p className="text-sm leading-tight font-medium">
                    {user.name}
                  </p>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {user.role_label}
                  </p>
                </div>
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {inisialNama(user.name)}
                  </AvatarFallback>
                </Avatar>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Masuk
              </Link>
            )}
            {user ? (
              <form action={logoutAction} className="lg:hidden">
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Keluar dari akun"
                >
                  <LogOut />
                </Button>
              </form>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
