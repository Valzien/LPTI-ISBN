import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardStats } from "@/lib/types";

/**
 * Kartu ringkasan dashboard admin (master prompt §5.6) —
 * seluruh angka dihitung dari database lewat GET /admin/dashboard.
 */
export function StatCards({ stats }: { stats: AdminDashboardStats }) {
  const kartu = [
    { label: "Total Pengajuan", nilai: stats.total },
    { label: "Perlu Diperiksa", nilai: stats.needs_check },
    { label: "Dalam Verifikasi", nilai: stats.under_review },
    { label: "Perlu Revisi", nilai: stats.needs_revision },
    { label: "Selesai", nilai: stats.finished },
  ];

  return (
    <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {kartu.map((item) => (
        <Card key={item.label} size="sm">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-3xl">{item.nilai}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
