import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiFetch, TOKEN_COOKIE } from "@/lib/api";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "applicant" | "admin" | "super_admin";
    role_label: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;

    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password wajib diisi.",
        },
        { status: 422 },
      );
    }

    const data = await apiFetch<LoginResponse>("/api/v1/login", {
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
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return NextResponse.json(
      {
        success: true,
        data: { user: data.user },
        message: "Login berhasil.",
      },
      { status: 200 },
    );
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      errors?: Record<string, string[]>;
    };

    const status = err.status && err.status > 0 ? err.status : 500;
    const message = err.message || "Terjadi kesalahan saat login.";

    if (status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message,
        errors: err.errors,
      },
      { status },
    );
  }
}
