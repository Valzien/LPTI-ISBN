<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Notifications\SubmissionStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji endpoint notifikasi dalam aplikasi (docs/API.md §3.3) — Tahap 8:
 * milik sendiri saja, filter belum dibaca, penandaan baca, anti-enumeration.
 */
class NotificationTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_guest_cannot_list_notifications(): void
    {
        $this->getJson('/api/v1/notifications')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan login kembali.');
    }

    public function test_index_lists_only_own_notifications(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $foreign = $this->submissionFor($this->applicant());

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));
        $foreign->user->notify(new SubmissionStatusChanged($foreign, SubmissionStatus::Draft));

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.submission_id', $submission->id)
            ->assertJsonPath('data.0.is_read', false)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_index_resource_hides_internal_notification_class(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonMissingPath('data.0.type')
            ->assertJsonMissingPath('data.0.data');
    }

    public function test_index_filters_unread_notifications(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $read = new SubmissionStatusChanged($submission, SubmissionStatus::Draft);
        $unread = new SubmissionStatusChanged($submission, SubmissionStatus::Draft);

        $owner->notify($read);
        $owner->notify($unread);

        $owner->notifications()->orderBy('created_at')->first()->markAsRead();

        $this->getJson('/api/v1/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.is_read', false);

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_index_rejects_invalid_unread_filter(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/notifications?unread=yak')
            ->assertUnprocessable()
            ->assertJsonPath('errors.unread.0', 'Filter belum dibaca tidak valid.');
    }

    public function test_mark_read_own_notification(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));
        $notification = $owner->notifications()->firstOrFail();

        $this->patchJson('/api/v1/notifications/'.$notification->id.'/read')
            ->assertOk()
            ->assertJsonPath('data.is_read', true)
            ->assertJsonPath('meta.message', 'Notifikasi ditandai sudah dibaca.');

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_mark_read_is_idempotent(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));
        $notification = $owner->notifications()->firstOrFail();

        $this->patchJson('/api/v1/notifications/'.$notification->id.'/read')->assertOk();
        $this->patchJson('/api/v1/notifications/'.$notification->id.'/read')->assertOk();

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_mark_read_of_foreign_or_unknown_notification_returns_404(): void
    {
        $this->actingAsApplicant();
        $foreign = $this->submissionFor($this->applicant());

        $foreign->user->notify(new SubmissionStatusChanged($foreign, SubmissionStatus::Draft));
        $foreignNotification = $foreign->user->notifications()->firstOrFail();

        $this->patchJson('/api/v1/notifications/'.$foreignNotification->id.'/read')
            ->assertNotFound()
            ->assertJsonPath('message', 'Notifikasi tidak ditemukan.');

        $this->patchJson('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
            ->assertNotFound();

        $this->assertNull($foreignNotification->fresh()->read_at);
    }

    public function test_read_all_marks_only_own_unread_notifications(): void
    {
        $owner = $this->actingAsApplicant();
        $otherApplicant = $this->applicant();
        $submission = $this->submissionFor($owner);
        $foreignSubmission = $this->submissionFor($otherApplicant);

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));
        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Draft));
        $otherApplicant->notify(new SubmissionStatusChanged($foreignSubmission, SubmissionStatus::Draft));

        $this->patchJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked', 2)
            ->assertJsonPath('meta.message', 'Semua notifikasi ditandai sudah dibaca.');

        $this->assertSame(0, $owner->notifications()->whereNull('read_at')->count());
        $this->assertSame(1, $otherApplicant->notifications()->whereNull('read_at')->count());

        $this->patchJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked', 0);
    }

    public function test_dashboard_stats_count_unread_notifications(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $owner->notify(new SubmissionStatusChanged($submission, SubmissionStatus::Submitted));

        $this->getJson('/api/v1/submissions/stats')
            ->assertOk()
            ->assertJsonPath('data.unread_notifications', 1);

        $this->patchJson('/api/v1/notifications/read-all')->assertOk();

        $this->getJson('/api/v1/submissions/stats')
            ->assertOk()
            ->assertJsonPath('data.unread_notifications', 0);
    }
}
