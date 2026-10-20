"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { deleteUserAction, type AdminFormState } from "@/lib/actions";

const initialState: AdminFormState = { ok: false, message: "" };

/**
 * Tombol hapus akun (khusus super_admin) — DELETE /admin/users/{id}.
 * Backend menolak (409) bila akun masih memiliki pengajuan; pesan
 * ditampilkan di bawah tombol.
 */
export function DeleteUserButton({
  userId,
  nama,
}: {
  userId: number;
  nama: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteUserAction,
    initialState,
  );

  return (
    <div className="space-y-1">
      <form
        action={formAction}
        onSubmit={(event) => {
          const yakin = confirm(
            `Hapus akun "${nama}"? Tindakan tidak dapat dibatalkan.`,
          );

          if (!yakin) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={userId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={pending}
        >
          <Trash2 />
          Hapus
        </Button>
      </form>
      {!state.ok && state.message ? (
        <p className="max-w-56 text-xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}
