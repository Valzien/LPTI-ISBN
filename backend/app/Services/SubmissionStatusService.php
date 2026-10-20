<?php

namespace App\Services;

use App\Enums\SubmissionStatus;
use App\Enums\UserRole;
use App\Models\BookSubmission;
use App\Models\SubmissionStatusHistory;
use App\Models\User;
use App\Notifications\SubmissionStatusChanged;

/**
 * Satu-satunya tempat status pengajuan diubah (master prompt §4).
 *
 * Setiap transisi divalidasi terhadap peta SubmissionStatus::allowedTransitions()
 * beserta peran pelaku, dicatat ke submission_status_histories, dan masuk audit log.
 */
class SubmissionStatusService
{
    /**
     * Terapkan transisi status bila sah untuk peran pelaku.
     *
     * @param  string|null  $note  catatan opsional (wajib diisi admin saat minta revisi — Tahap 6)
     * @return bool true bila transisi diterapkan; false bila tidak diizinkan
     */
    public function transition(BookSubmission $submission, SubmissionStatus $target, User $actor, ?string $note = null): bool
    {
        $current = $submission->status;

        if (! $current->canTransitionTo($target, $actor->role)) {
            return false;
        }

        $submission->status = $target;
        $submission->save();

        $this->record($submission, $actor, $current, $target, $note);

        AuditLogger::log($actor, 'submission.status_changed', $submission, [
            'previous_status' => $current->value,
            'new_status' => $target->value,
        ]);

        $this->notifyRecipients($submission, $target, $note);

        return true;
    }

    /**
     * Kirim notifikasi dalam aplikasi ke penerima yang tepat (master prompt
     * §5.8): pengajuan baru → seluruh admin; keputusan admin → pemilik
     * pengajuan.
     */
    private function notifyRecipients(BookSubmission $submission, SubmissionStatus $target, ?string $note): void
    {
        if (in_array($target, [SubmissionStatus::Submitted, SubmissionStatus::Resubmitted], true)) {
            User::query()
                ->whereIn('role', [UserRole::Admin->value, UserRole::SuperAdmin->value])
                ->get()
                ->each(fn (User $admin) => $admin->notify(
                    new SubmissionStatusChanged($submission, $target, $note),
                ));

            return;
        }

        $submission->user?->notify(new SubmissionStatusChanged($submission, $target, $note));
    }

    /**
     * Catat status awal saat pengajuan dibuat (dari null → draft).
     */
    public function recordInitial(BookSubmission $submission, User $actor): void
    {
        $this->record($submission, $actor, null, SubmissionStatus::Draft, null);
    }

    private function record(
        BookSubmission $submission,
        User $actor,
        ?SubmissionStatus $previous,
        SubmissionStatus $new,
        ?string $note,
    ): void {
        $history = new SubmissionStatusHistory([
            'previous_status' => $previous?->value,
            'new_status' => $new->value,
            'note' => $note,
        ]);

        $history->book_submission_id = $submission->id;
        $history->actor_user_id = $actor->id;
        $history->save();
    }
}
