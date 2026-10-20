import { NextResponse } from "next/server";

import { getToken } from "@/lib/api";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * Proxy ekspor CSV laporan pengajuan (Tahap 7).
 *
 * Browser memanggil route ini; token sesi dibaca dari cookie httpOnly lalu
 * dipakai untuk memanggil GET /api/v1/admin/reports/submissions.csv di
 * backend (wajib role admin — dicek backend). Nama berkas mengikuti header
 * Content-Disposition dari backend.
 */
export async function GET(request: Request) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesi berakhir. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  const qs = new URL(request.url).searchParams.toString();

  let upstream: Response;

  try {
    upstream = await fetch(
      `${API_URL}/api/v1/admin/reports/submissions.csv${qs ? `?${qs}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/csv,*/*" },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Tidak dapat terhubung ke server API laporan." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    // Teruskan status + envelope error backend apa adanya (mis. 422 filter
    // tidak valid, 403 bukan admin).
    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers({
    "Content-Type":
      upstream.headers.get("content-type") ?? "text/csv; charset=UTF-8",
    "Content-Disposition":
      upstream.headers.get("content-disposition") ??
      "attachment; filename=laporan-pengajuan.csv",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });

  return new NextResponse(upstream.body, { status: 200, headers });
}
