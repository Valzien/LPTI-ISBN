import { NextResponse } from "next/server";

import { getToken } from "@/lib/api";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * Proxy streaming dokumen privat (docs/API.md §3.2 preview).
 *
 * Browser memanggil route ini; token sesi dibaca dari cookie httpOnly lalu
 * dipakai untuk memanggil GET /api/v1/documents/{id}/preview di backend.
 * Berkas TIDAK PERNAH disimpan/diekspose sebagai URL publik.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { success: false, message: "ID dokumen tidak valid." },
      { status: 400 },
    );
  }

  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesi berakhir. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${API_URL}/api/v1/documents/${id}/preview`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Tidak dapat terhubung ke server API dokumen.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    // Teruskan status + envelope error backend apa adanya (mis. 404 milik
    // orang lain — tetap anti-enumeration).
    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers({
    "Content-Type":
      upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition":
      upstream.headers.get("content-disposition") ?? "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });

  return new NextResponse(upstream.body, { status: 200, headers });
}
