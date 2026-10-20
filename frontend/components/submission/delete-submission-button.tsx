"use client";

import { Trash2 } from "lucide-react";

import { deleteSubmissionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

/**
 * Tombol hapus draft dengan konfirmasi browser — Server Action
 * DELETE /api/v1/submissions/{id} (hanya status Draft yang boleh dihapus).
 */
export function DeleteSubmissionButton({ submissionId }: { submissionId: number }) {
  return (
    <form
      action={deleteSubmissionAction}
      onSubmit={(event) => {
        const yakin = confirm(
          "Hapus pengajuan draft ini beserta seluruh dokumennya? Tindakan tidak dapat dibatalkan.",
        );

        if (!yakin) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={submissionId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-destructive"
      >
        <Trash2 />
        Hapus Draft
      </Button>
    </form>
  );
}
