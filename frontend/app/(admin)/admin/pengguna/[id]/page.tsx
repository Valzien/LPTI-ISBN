import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { UserForm } from "@/components/admin/user-form";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { User } from "@/lib/types";

export const metadata = { title: "Ubah Pengguna" };

/**
 * Form edit akun (Tahap 7) — hanya super_admin.
 * Data diambil dari GET /api/v1/admin/users/{id}; perubahan melalui PUT.
 */
export default async function PenggunaEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();

  if (user.role !== "super_admin") {
    redirect("/admin/pengguna");
  }

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  let akun: User;

  try {
    akun = await apiFetch<User>(`/api/v1/admin/users/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Ubah Pengguna
        </h1>
        <p className="text-sm text-muted-foreground">
          {akun.name} — {akun.email}. Role tidak dapat diubah untuk akun Anda
          sendiri; backend menolak perubahan tersebut.
        </p>
      </header>

      <UserForm user={akun} />

      <Button render={<Link href="/admin/pengguna" />} variant="ghost" size="sm">
        Kembali ke daftar pengguna
      </Button>
    </div>
  );
}
