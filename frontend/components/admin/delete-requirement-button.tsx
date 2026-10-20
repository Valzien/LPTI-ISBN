"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { deleteRequirementAction, type AdminFormState } from "@/lib/actions";

const initialState: AdminFormState = { ok: false, message: "" };

/**
 * Tombol hapus persyaratan dokumen — DELETE /admin/document-requirements/{id}.
 * Backend menolak (409) bila persyaratan sudah dipakai dokumen pengajuan;
 * admin disarankan menonaktifkannya lewat form edit.
 */
export function DeleteRequirementButton({
  requirementId,
  nama,
}: {
  requirementId: number;
  nama: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteRequirementAction,
    initialState,
  );

  return (
    <div className="space-y-1">
      <form
        action={formAction}
        onSubmit={(event) => {
          const yakin = confirm(
            `Hapus persyaratan "${nama}"? Bila sudah dipakai dokumen, nonaktifkan saja agar riwayat tetap utuh.`,
          );

          if (!yakin) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={requirementId} />
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
        <p className="max-w-64 text-xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}
