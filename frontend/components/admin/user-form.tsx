"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createUserAction,
  updateUserAction,
  type AdminFormState,
} from "@/lib/actions";
import type { User } from "@/lib/types";

const initialState: AdminFormState = { ok: false, message: "" };

/** Kelas select asli — konsisten dengan filter di halaman lain. */
const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

interface UserFormProps {
  /** Bila diisi, form berada pada mode edit (PUT /admin/users/{id}). */
  user?: User;
}

/**
 * Form buat/edit akun oleh admin utama (Tahap 7) — POST/PUT /admin/users.
 * Kata sandi hanya wajib saat membuat akun; kosongkan bila tidak diubah.
 */
export function UserForm({ user }: UserFormProps) {
  const mode = user ? "edit" : "create";
  const [state, formAction, pending] = useActionState(
    user ? updateUserAction : createUserAction,
    initialState,
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">
          {mode === "edit" ? "Ubah Data Akun" : "Akun Baru"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Perubahan role berlaku langsung setelah disimpan. Kata sandi lama tidak pernah ditampilkan."
            : "Akun dibuat dengan kata sandi awal yang harus Anda sampaikan kepada pengguna."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!state.ok && state.message ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          {user ? <input type="hidden" name="id" value={user.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user?.name ?? ""}
              required
              minLength={3}
              maxLength={255}
              aria-invalid={state.fieldErrors?.name ? true : undefined}
            />
            {state.fieldErrors?.name?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email ?? ""}
                required
                maxLength={255}
                aria-invalid={state.fieldErrors?.email ? true : undefined}
              />
              {state.fieldErrors?.email?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={user?.phone ?? ""}
                maxLength={30}
                aria-invalid={state.fieldErrors?.phone ? true : undefined}
              />
              {state.fieldErrors?.phone?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={user?.role ?? "applicant"}
                className={SELECT_CLASS}
                aria-invalid={state.fieldErrors?.role ? true : undefined}
              >
                <option value="applicant">Pemohon</option>
                <option value="admin">Admin / Verifikator</option>
                <option value="super_admin">Admin Utama</option>
              </select>
              {state.fieldErrors?.role?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === "edit" ? "Kata Sandi Baru" : "Kata Sandi Awal"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required={mode === "create"}
                minLength={8}
                maxLength={255}
                placeholder={
                  mode === "edit"
                    ? "Kosongkan bila tidak diubah"
                    : "Minimal 8 karakter"
                }
                aria-invalid={state.fieldErrors?.password ? true : undefined}
              />
              {state.fieldErrors?.password?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="applicant_type">Jenis Pemohon</Label>
              <select
                id="applicant_type"
                name="applicant_type"
                defaultValue={user?.applicant_type ?? ""}
                className={SELECT_CLASS}
                aria-invalid={
                  state.fieldErrors?.applicant_type ? true : undefined
                }
              >
                <option value="">— Tidak diisi —</option>
                <option value="author">Penulis</option>
                <option value="publisher_rep">Perwakilan Penerbit</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Hanya digunakan untuk role Pemohon.
              </p>
              {state.fieldErrors?.applicant_type?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher_name">Nama Penerbit</Label>
              <Input
                id="publisher_name"
                name="publisher_name"
                defaultValue={user?.publisher_name ?? ""}
                maxLength={255}
                aria-invalid={
                  state.fieldErrors?.publisher_name ? true : undefined
                }
              />
              {state.fieldErrors?.publisher_name?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={user?.address ?? ""}
              rows={3}
              maxLength={1000}
              aria-invalid={state.fieldErrors?.address ? true : undefined}
            />
            {state.fieldErrors?.address?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Menyimpan…"
                : mode === "edit"
                  ? "Simpan Perubahan"
                  : "Buat Akun"}
            </Button>
            <Button
              render={<Link href="/admin/pengguna" />}
              variant="outline"
              type="button"
            >
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
