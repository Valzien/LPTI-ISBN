"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";

import { updateProfileAction, type AuthFormState } from "@/lib/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";

const initialState: AuthFormState = { ok: false, message: "" };

export function ProfileForm({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const suksesBaru = searchParams.get("success") === "1";
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const [applicantType, setApplicantType] = useState(
    user.applicant_type ?? "author",
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Data Diri</CardTitle>
        <CardDescription>
          Data ini digunakan pada setiap pengajuan yang Anda buat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suksesBaru && !state.message ? (
          <Alert className="mb-4">
            <AlertDescription>Profil berhasil diperbarui.</AlertDescription>
          </Alert>
        ) : null}

        {!state.ok && state.message ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email tidak dapat diubah setelah terdaftar.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
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
              <Label htmlFor="applicant_type">Jenis Pemohon</Label>
              <Select
                name="applicant_type"
                value={applicantType}
                onValueChange={(v) =>
                  setApplicantType(v as "author" | "publisher_rep")
                }
              >
                <SelectTrigger id="applicant_type">
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                placeholder="08xxxxxxxxxx"
              />
              {state.fieldErrors?.phone?.map((err) => (
                <p key={err} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          {applicantType === "publisher_rep" ? (
            <div className="space-y-2">
              <Label htmlFor="publisher_name">Nama Penerbit</Label>
              <Input
                id="publisher_name"
                name="publisher_name"
                defaultValue={user.publisher_name ?? ""}
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
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={user.address ?? ""}
              placeholder="Alamat lengkap"
            />
            {state.fieldErrors?.address?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
