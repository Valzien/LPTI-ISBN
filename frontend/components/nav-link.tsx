"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Cocokkan path persis (mis. /dashboard agar /admin tidak ikut aktif). */
  exact?: boolean;
  onClick?: () => void;
}

/** Tautan navigasi dengan penanda halaman aktif (dipakai sidebar dashboard). */
export function NavLink({
  href,
  children,
  className,
  exact = false,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
