/** Pemformatan nilai untuk tampilan Bahasa Indonesia. */

const tanggalFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const tanggalPendekFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Format tanggal panjang, contoh: "19 Oktober 2026". */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return tanggalFormatter.format(date);
}

/** Format tanggal pendek, contoh: "19 Okt 2026". */
export function formatTanggalPendek(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return tanggalPendekFormatter.format(date);
}

/** Format ukuran file, contoh: "1,5 MB". */
export function formatUkuranFile(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobyte = bytes / 1024;

  if (kilobyte < 1024) {
    return `${kilobyte.toFixed(kilobyte < 10 ? 1 : 0)} KB`;
  }

  return `${(kilobyte / 1024).toFixed(1)} MB`;
}

const waktuFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Format tanggal + jam, contoh: "19 Okt 2026, 14.05". */
export function formatWaktu(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return waktuFormatter.format(date);
}
