import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

/**
 * Layout area admin: wajib login dengan role admin/super_admin (Tahap 4).
 * Pemohon yang mencoba mengakses akan diarahkan ke /dashboard,
 * tamu diarahkan ke /login?redirect=<halaman-asal>.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <DashboardShell variant="admin" user={user}>
      {children}
    </DashboardShell>
  );
}
