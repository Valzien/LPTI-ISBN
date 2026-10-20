import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAuth } from "@/lib/auth";

/**
 * Layout area pemohon: wajib login (guard Tahap 4).
 * Tamu diarahkan ke /login?redirect=<halaman-asal>.
 * Pemeriksaan role per halaman (mis. dashboard = pemohon) ada di masing-masing page.
 */
export default async function PemohonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <DashboardShell variant="pemohon" user={user}>
      {children}
    </DashboardShell>
  );
}
