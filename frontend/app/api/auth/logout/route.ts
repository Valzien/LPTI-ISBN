import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiFetch, TOKEN_COOKIE } from "@/lib/api";

export async function POST() {
  try {
    // Revoke token di backend (jika masih valid)
    await apiFetch("/api/v1/logout", {
      method: "POST",
      auth: true,
    });
  } catch {
    // Abaikan error jika token sudah tidak valid (tetap bersihkan cookie)
  }

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json(
    {
      success: true,
      message: "Berhasil logout.",
    },
    { status: 200 },
  );
}
