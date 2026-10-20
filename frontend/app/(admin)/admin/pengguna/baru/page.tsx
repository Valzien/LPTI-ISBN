import Link from "next/link";
import { redirect } from "next/navigation";

import { UserForm } from "@/components/admin/user-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Tambah Pengguna" };

/**
 * Form pembuatan akun (Tahap 7) — hanya super_admin.
 * Server Action memanggil POST /api/v1/admin/users.
 */
export default async function PenggunaBaruPage() {
  const user = await requireAdmin();

  if (user.role !== "super_admin") {
    redirect("/admin/pengguna");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Tambah Pengguna
        </h1>
        <p className="text-sm text-muted-foreground">
          Buat akun baru beserta role-nya. Kata sandi awal wajib diisi dan tidak
          ditampilkan kembali setelah disimpan.
        </p>
      </header>

      <UserForm />

      <Button render={<Link href="/admin/pengguna" />} variant="ghost" size="sm">
        Kembali ke daftar pengguna
      </Button>
    </div>
  );
}
