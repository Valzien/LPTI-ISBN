import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions";
import { formatWaktu } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

interface NotificationListProps {
  items: AppNotification[];
  /** Basis tautan detail pengajuan: `/pengajuan` atau `/admin/pengajuan`. */
  basePath: string;
}

/**
 * Daftar notifikasi dalam aplikasi (Tahap 7, master prompt §5.8) —
 * server component dengan form Server Action agar tetap berfungsi tanpa JS.
 */
export function NotificationList({ items, basePath }: NotificationListProps) {
  const adaBelumDibaca = items.some((item) => !item.is_read);

  return (
    <div className="space-y-3">
      {adaBelumDibaca ? (
        <form
          action={markAllNotificationsReadAction}
          className="flex justify-end"
        >
          <Button type="submit" variant="outline" size="sm">
            <CheckCheck />
            Tandai semua dibaca
          </Button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Bell className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 font-medium">Belum ada notifikasi.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Perubahan status pengajuan akan tampil di sini.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li
              key={item.id}
              className={item.is_read ? "p-4" : "bg-muted/40 p-4"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {item.title ?? "Notifikasi"}
                    {!item.is_read ? (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Baru
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.submission_number
                      ? `${item.submission_number} — `
                      : ""}
                    {formatWaktu(item.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.submission_id ? (
                    <Button
                      render={
                        <Link href={`${basePath}/${item.submission_id}`} />
                      }
                      variant="outline"
                      size="sm"
                    >
                      Lihat Pengajuan
                    </Button>
                  ) : null}
                  {!item.is_read ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Tandai dibaca
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
