import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/types";

interface SubmissionFiltersProps {
  q: string;
  status: SubmissionStatus | null;
  dateFrom: string;
  dateTo: string;
  /** Path tujuan form GET — default `/pengajuan` (area pemohon). */
  action?: string;
}

/**
 * Formulir GET filter daftar pengajuan — parameter dikirim ke
 * GET /api/v1/submissions (q, status, date_from, date_to); area admin
 * memakai action yang sama ke /admin/pengajuan (GET /admin/submissions).
 */
export function SubmissionFilters({
  q,
  status,
  dateFrom,
  dateTo,
  action = "/pengajuan",
}: SubmissionFiltersProps) {
  return (
    <form
      method="get"
      action={action}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end"
    >
      <div className="space-y-1">
        <Label htmlFor="q">Kata Kunci</Label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Judul / nomor / penulis"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Semua status</option>
          {STATUS_ORDER.map((value) => (
            <option key={value} value={value}>
              {STATUS_META[value].label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="date_from">Tanggal Dari</Label>
        <Input
          id="date_from"
          name="date_from"
          type="date"
          defaultValue={dateFrom}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date_to">Tanggal Sampai</Label>
        <Input
          id="date_to"
          name="date_to"
          type="date"
          defaultValue={dateTo}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Terapkan
        </Button>
        <Button render={<Link href={action} />} variant="outline" size="sm">
          Reset
        </Button>
      </div>
    </form>
  );
}
