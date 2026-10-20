import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiFetch, TOKEN_COOKIE } from "@/lib/api";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string | null;
  applicant_type: "author" | "publisher_rep";
  publisher_name?: string | null;
  address?: string | null;
}

interface RegisterResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "applicant";
    role_label: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;

    const data = await apiFetch<RegisterResponse>("/api/v1/register", {
      method: "POST",
      body,
      auth: false,
    });

    const cookieStore = await cookies();

    cookieStore.set(TOKEN_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json(
      {
        success: true,
        data: { user: data.user },
        message: "Registrasi berhasil.",
      },
      { status: 201 },
    );
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      errors?: Record<string, string[]>;
    };

    const status = err.status && err.status > 0 ? err.status : 500;
    const message = err.message || "Terjadi kesalahan saat registrasi.";
    const errors = err.errors;

    return NextResponse.json(
      {
        success: false,
        message,
        errors,
      },
      { status },
    );
  }
}
