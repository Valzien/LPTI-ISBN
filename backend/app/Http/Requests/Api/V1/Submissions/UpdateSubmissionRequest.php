<?php

namespace App\Http\Requests\Api\V1\Submissions;

use App\Models\BookSubmission;

class UpdateSubmissionRequest extends StoreSubmissionRequest
{
    /**
     * Aturan field sama dengan pembuatan (diwarisi), hanya otorisasi berbeda.
     *
     * Urutan pemeriksaan:
     * 1. Bukan milik sendiri → 404 (anti-enumeration, docs/API.md §1).
     * 2. Status terkunci (bukan draft/perlu revisi) → 409 (konflik state).
     */
    public function authorize(): bool
    {
        $submission = $this->route('submission');

        abort_unless(
            $submission instanceof BookSubmission
                && $submission->user_id === $this->user()?->id,
            404,
        );

        abort_if(
            ! $submission->status->isEditable(),
            409,
            'Pengajuan hanya dapat diubah saat berstatus Draft atau Perlu Revisi.',
        );

        return parent::authorize();
    }
}
