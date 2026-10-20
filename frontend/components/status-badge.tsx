import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/types";
import { getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

/**
 * Badge status pengajuan — label dan warna selaras dengan
 * backend/app/Enums/SubmissionStatus.php (lihat lib/status.ts).
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <Badge variant={meta.variant} className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
