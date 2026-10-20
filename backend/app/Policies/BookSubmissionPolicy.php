<?php

namespace App\Policies;

use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Otorisasi pengajuan: pemohon hanya untuk miliknya sendiri,
 * admin memiliki akses penuh (before()).
 */
class BookSubmissionPolicy
{
    /**
     * Admin/verifikator melewati pemeriksaan per-metode.
     */
    public function before(User $user): ?bool
    {
        return $user->hasAdminPrivileges() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BookSubmission $bookSubmission): bool
    {
        return $user->id === $bookSubmission->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, BookSubmission $bookSubmission): Response
    {
        return $user->id === $bookSubmission->user_id && $bookSubmission->status->isEditable()
            ? Response::allow()
            : Response::deny('Pengajuan hanya dapat diubah saat berstatus Draft atau Perlu Revisi.');
    }

    public function delete(User $user, BookSubmission $bookSubmission): Response
    {
        return $user->id === $bookSubmission->user_id && $bookSubmission->status === SubmissionStatus::Draft
            ? Response::allow()
            : Response::deny('Hanya pengajuan berstatus Draft yang dapat dihapus.');
    }
}
