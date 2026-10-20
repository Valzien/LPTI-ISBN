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
import { loginAction, type AuthFormState } from "@/lib/actions";

const initialState: AuthFormState = { ok: false, message: "" };

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Masuk</CardTitle>
        <CardDescription>
          Masuk ke akun pemohon atau admin LPTI-ISBN.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {redirectTo ? (
            <input type="hidden" name="redirect" value={redirectTo} />
          ) : null}
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@contoh.com"
              required
              aria-invalid={state.fieldErrors?.email ? true : undefined}
            />
            {state.fieldErrors?.email?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-invalid={state.fieldErrors?.password ? true : undefined}
            />
            {state.fieldErrors?.password?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Memproses..." : "Masuk"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              render={<Link href="/register" />}
            >
              Belum punya akun? Daftar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
