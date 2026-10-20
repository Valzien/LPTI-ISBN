"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { registerAction, type AuthFormState } from "@/lib/actions";

const initialState: AuthFormState = { ok: false, message: "" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const [applicantType, setApplicantType] = useState<"author" | "publisher_rep">(
    "author",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Daftar Akun Pemohon</CardTitle>
        <CardDescription>
          Buat akun untuk mengajukan pendaftaran ISBN buku.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nama lengkap sesuai identitas"
              required
            />
            {state.fieldErrors?.name?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@contoh.com"
              required
            />
            {state.fieldErrors?.email?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                required
              />
              {state.fieldErrors?.password?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
              <Input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password"
                required
              />
              {state.fieldErrors?.password_confirmation?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicant_type">Jenis Pemohon</Label>
            <Select
              name="applicant_type"
              value={applicantType}
              onValueChange={(v) =>
                setApplicantType(v as "author" | "publisher_rep")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis pemohon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="author">Penulis</SelectItem>
                <SelectItem value="publisher_rep">
                  Perwakilan Penerbit
                </SelectItem>
              </SelectContent>
            </Select>
            {state.fieldErrors?.applicant_type?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          {applicantType === "publisher_rep" ? (
            <div className="space-y-2">
              <Label htmlFor="publisher_name">Nama Penerbit</Label>
              <Input
                id="publisher_name"
                name="publisher_name"
                placeholder="Nama penerbit"
              />
              {state.fieldErrors?.publisher_name?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon (opsional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="08xxxxxxxxxx"
            />
            {state.fieldErrors?.phone?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat (opsional)</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              placeholder="Alamat lengkap"
            />
            {state.fieldErrors?.address?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Memproses..." : "Daftar"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              render={<Link href="/login" />}
            >
              Sudah punya akun? Masuk
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
