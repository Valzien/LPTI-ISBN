"use client";

import {
  Bell,
  ClipboardCheck,
  FileBarChart,
  FileCheck,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  User,
  UserRound,
  Users,
} from "lucide-react";

import { NavLink } from "@/components/nav-link";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

/** Item navigasi area pemohon (Tahap 4–7: pengajuan, notifikasi, profil). */
export const PEMOHON_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/pengajuan", label: "Pengajuan Saya", icon: FileText },
  { href: "/notifikasi", label: "Notifikasi", icon: Bell },
  { href: "/profil", label: "Profil Saya", icon: User },
];

/** Item navigasi area admin (Tahap 6–7: verifikasi, laporan, akun, audit). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard Admin", icon: LayoutDashboard, exact: true },
  { href: "/admin/pengajuan", label: "Semua Pengajuan", icon: ClipboardCheck },
  { href: "/admin/pemohon", label: "Daftar Pemohon", icon: UserRound },
  { href: "/admin/laporan", label: "Laporan", icon: FileBarChart },
  { href: "/admin/notifikasi", label: "Notifikasi", icon: Bell },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users },
  { href: "/admin/persyaratan", label: "Persyaratan Dokumen", icon: FileCheck },
  { href: "/admin/audit", label: "Log Audit", icon: ScrollText },
];

interface DashboardNavLinksProps {
  variant: "pemohon" | "admin";
  /** Dipanggil saat tautan diklik (menutup Sheet menu seluler). */
  onNavigate?: () => void;
}

/** Daftar tautan sidebar — dipakai sidebar desktop dan menu seluler. */
export function DashboardNavLinks({
  variant,
  onNavigate,
}: DashboardNavLinksProps) {
  const items = variant === "admin" ? ADMIN_NAV_ITEMS : PEMOHON_NAV_ITEMS;

  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, exact }) => (
        <li key={href}>
          <NavLink href={href} exact={exact} onClick={onNavigate}>
            <Icon className="size-4" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
