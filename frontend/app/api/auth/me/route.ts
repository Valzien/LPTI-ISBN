import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesi Anda telah berakhir. Silakan login kembali.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: user,
    },
    { status: 200 },
  );
}
