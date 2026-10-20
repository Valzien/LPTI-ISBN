import { formatTanggal } from "@/lib/format";
import type { SubmissionStatusHistory } from "@/lib/types";

/** Waktu tampil: "19 Oktober 2026, 14.03". */
function formatWaktu(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const jam = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${formatTanggal(iso)}, ${jam}`;
}

interface HistoryTimelineProps {
  histories: SubmissionStatusHistory[];
}

/**
 * Linimasa perubahan status pengajuan (tiap entri = satu transisi tervalidasi
 * yang dicatat backend — docs/API.md §3.2 history).
 */
export function HistoryTimeline({ histories }: HistoryTimelineProps) {
  if (histories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Belum ada riwayat status.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-5 border-l pl-6">
      {histories.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden
            className="-left-[1.94rem] top-1 size-2.5 rounded-full bg-primary"
          />
          <p className="font-medium text-sm">
            {entry.previous_status === null
              ? `Pengajuan dibuat (${entry.new_status_label})`
              : `${entry.new_status_label}${entry.previous_status_label ? ` (sebelumnya: ${entry.previous_status_label})` : ""}`}
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {formatWaktu(entry.created_at)}
            {entry.actor_name ? ` — ${entry.actor_name}` : ""}
          </p>
          {entry.note ? (
            <p className="mt-1 rounded-md bg-muted p-2 text-sm">
              {entry.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
