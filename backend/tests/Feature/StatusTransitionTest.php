<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Models\AuditLog;
use App\Models\BookSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji transisi status pengajuan (master prompt §4): matriks peran, validasi
 * catatan/alasan/ISBN, histori, audit, dan notifikasi — Tahap 8.
 */
class StatusTransitionTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_full_lifecycle_from_draft_to_isbn_assigned(): void
    {
        $owner = $this->applicant();
        $admin = $this->admin();

        Sanctum::actingAs($owner);

        $submissionId = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())
            ->assertCreated()
            ->json('data.id');

        $this->postJson('/api/v1/submissions/'.$submissionId.'/submit')
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted');

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/submissions/'.$submissionId.'/start-review')
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');

        $this->postJson('/api/v1/admin/submissions/'.$submissionId.'/request-revision', [
            'note' => 'Perbaiki halaman judul dan daftar isi.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'needs_revision');

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/submissions/'.$submissionId.'/resubmit')
            ->assertOk()
            ->assertJsonPath('data.status', 'resubmitted');

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/submissions/'.$submissionId.'/start-review')
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');

        $this->postJson('/api/v1/admin/submissions/'.$submissionId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'approved_for_processing');

        $this->postJson('/api/v1/admin/submissions/'.$submissionId.'/record-isbn', [
            'isbn_number' => '978-602-1234-56-7',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Ditetapkan melalui surat resmi Perpusnas.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'isbn_assigned')
            ->assertJsonPath('data.isbn_number', '9786021234567');

        $submission = BookSubmission::query()->findOrFail($submissionId);

        $this->assertSame(SubmissionStatus::IsbnAssigned, $submission->status);
        $this->assertSame('9786021234567', $submission->isbn_number);
        $this->assertSame('Ditetapkan melalui surat resmi Perpusnas.', $submission->isbn_source_note);
        $this->assertNotNull($submission->isbn_assigned_at);

        $this->assertSame(8, $submission->statusHistories()->count());
        $this->assertSame(
            'Perbaiki halaman judul dan daftar isi.',
            $submission->statusHistories()->where('new_status', 'needs_revision')->value('note'),
        );

        $this->assertSame(7, AuditLog::query()
            ->where('action', 'submission.status_changed')
            ->where('entity_id', $submissionId)
            ->count());

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'submission.isbn_recorded',
            'entity_id' => $submissionId,
            'actor_user_id' => $admin->id,
        ]);

        // submitted & resubmitted → admin; keputusan lain → pemilik.
        $this->assertSame(2, $admin->notifications()->count());
        $this->assertSame(5, $owner->notifications()->count());
    }

    public function test_start_review_is_rejected_from_draft(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/start-review')
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Mulai verifikasi hanya dapat dilakukan dari status Diajukan atau Diajukan Ulang (status saat ini: Draft).',
            );

        $this->assertSame(SubmissionStatus::Draft, $submission->fresh()->status);
    }

    public function test_start_review_transitions_and_notifies_owner_only(): void
    {
        $admin = $this->actingAsAdmin();
        $owner = $this->applicant();
        $otherApplicant = $this->applicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/start-review')
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review')
            ->assertJsonPath('meta.message', 'Pengajuan masuk dalam pemeriksaan.');

        $this->assertSame(1, $owner->notifications()->count());
        $this->assertSame(0, $otherApplicant->notifications()->count());

        $notification = $owner->notifications()->firstOrFail();
        $this->assertSame('Pengajuan sedang diperiksa', $notification->data['title']);
        $this->assertSame('under_review', $notification->data['status']);

        $this->assertDatabaseHas('submission_status_histories', [
            'book_submission_id' => $submission->id,
            'previous_status' => 'submitted',
            'new_status' => 'under_review',
            'actor_user_id' => $admin->id,
        ]);
    }

    public function test_request_revision_requires_note(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/request-revision', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.note.0', 'Catatan revisi wajib diisi.');

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/request-revision', [
            'note' => 'pend',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.note.0', 'Catatan revisi minimal 5 karakter.');

        $this->assertSame(SubmissionStatus::UnderReview, $submission->fresh()->status);
    }

    public function test_request_revision_stores_note_and_notifies_owner(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/request-revision', [
            'note' => 'Unggah ulang naskah yang sudah diperbaiki.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'needs_revision')
            ->assertJsonPath('meta.message', 'Pengajuan dikembalikan ke pemohon untuk revisi.');

        $notification = $owner->notifications()->firstOrFail();

        $this->assertSame('Pengajuan perlu direvisi', $notification->data['title']);
        $this->assertStringContainsString(
            'Unggah ulang naskah yang sudah diperbaiki.',
            $notification->data['message'],
        );
    }

    public function test_approve_transitions_and_notifies_owner(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'approved_for_processing')
            ->assertJsonPath('meta.message', 'Pengajuan disetujui untuk diproses.');

        $notification = $owner->notifications()->firstOrFail();

        $this->assertSame('Pengajuan disetujui untuk diproses', $notification->data['title']);
        $this->assertStringContainsString(
            'Nomor ISBN dicatat setelah sah ditetapkan',
            $notification->data['message'],
        );
    }

    public function test_reject_requires_reason(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/reject', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.reason.0', 'Alasan penolakan wajib diisi.');
    }

    public function test_reject_stores_reason_and_is_terminal(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/reject', [
            'reason' => 'Naskah tidak sesuai ketentuan penerbitan.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('meta.message', 'Pengajuan ditolak.');

        $this->assertSame(
            'Naskah tidak sesuai ketentuan penerbitan.',
            $submission->statusHistories()->where('new_status', 'rejected')->value('note'),
        );

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/start-review')
            ->assertForbidden();
    }

    public function test_record_isbn_requires_approved_for_processing_status(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [
            'isbn_number' => '9786021234567',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Pencatatan ISBN hanya dapat dilakukan dari status Disetujui untuk Diproses (status saat ini: Dalam Verifikasi).',
            );
    }

    public function test_record_isbn_validates_required_fields_and_format(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::ApprovedForProcessing);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.isbn_number.0', 'Nomor ISBN wajib diisi.')
            ->assertJsonPath('errors.isbn_assigned_at.0', 'Tanggal penetapan ISBN wajib diisi.')
            ->assertJsonPath('errors.isbn_source_note.0', 'Sumber/keterangan penerbitan ISBN wajib diisi.');

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [
            'isbn_number' => '12345',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.isbn_number.0',
                'Format nomor ISBN tidak valid. Gunakan ISBN-10 atau ISBN-13 (contoh: 978-602-1234-56-7).',
            );

        $this->assertSame(SubmissionStatus::ApprovedForProcessing, $submission->fresh()->status);
        $this->assertNull($submission->fresh()->isbn_number);
    }

    public function test_record_isbn_rejects_duplicate_after_normalization(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();
        $first = $this->submissionFor($owner, SubmissionStatus::ApprovedForProcessing);
        $second = $this->submissionFor($owner, SubmissionStatus::ApprovedForProcessing);

        $this->postJson('/api/v1/admin/submissions/'.$first->id.'/record-isbn', [
            'isbn_number' => '9786021234567',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])->assertOk();

        $this->postJson('/api/v1/admin/submissions/'.$second->id.'/record-isbn', [
            'isbn_number' => '978-602-1234-56-7',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.isbn_number.0', 'Nomor ISBN ini sudah tercatat pada pengajuan lain.');
    }

    public function test_record_isbn_rejects_far_future_assignment_date(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::ApprovedForProcessing);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [
            'isbn_number' => '9786021234567',
            'isbn_assigned_at' => now()->addDays(3)->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.isbn_assigned_at.0', 'Tanggal penetapan ISBN tidak boleh jauh di masa depan.');
    }

    public function test_record_isbn_stores_normalized_number_and_audit_metadata(): void
    {
        $admin = $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::ApprovedForProcessing);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [
            'isbn_number' => '978-602-1234-56-7',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Ditetapkan oleh pihak berwenang.',
        ])
            ->assertOk()
            ->assertJsonPath('data.isbn_number', '9786021234567')
            ->assertJsonPath('meta.message', 'Nomor ISBN berhasil dicatat.');

        $audit = AuditLog::query()
            ->where('action', 'submission.isbn_recorded')
            ->where('entity_id', $submission->id)
            ->firstOrFail();

        $this->assertSame($admin->id, $audit->actor_user_id);
        $this->assertSame('9786021234567', $audit->metadata['isbn_number']);
    }

    public function test_isbn_assigned_submission_is_terminal(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::IsbnAssigned, [
            'isbn_number' => '9786021234567',
        ]);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/start-review')->assertForbidden();
        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/approve')->assertForbidden();
        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/record-isbn', [
            'isbn_number' => '9786021234568',
            'isbn_assigned_at' => now()->format('Y-m-d'),
            'isbn_source_note' => 'Surat resmi.',
        ])->assertForbidden();
    }

    public function test_applicant_cannot_perform_admin_transitions(): void
    {
        $this->actingAsApplicant();
        $submission = $this->submissionFor($this->applicant(), SubmissionStatus::Submitted);

        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/start-review')->assertForbidden();
        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/approve')->assertForbidden();
        $this->postJson('/api/v1/admin/submissions/'.$submission->id.'/reject', [
            'reason' => 'Alasan uji.',
        ])->assertForbidden();
    }

    public function test_admin_cannot_use_applicant_transition_endpoints(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());

        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')->assertNotFound();
        $this->postJson('/api/v1/submissions/'.$submission->id.'/resubmit')->assertNotFound();
    }

    public function test_submitted_and_resubmitted_status_notifies_every_admin_without_duplicates(): void
    {
        $owner = $this->actingAsApplicant();
        $adminOne = $this->admin();
        $adminTwo = $this->superAdmin();
        $submission = $this->submissionFor($owner);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')->assertOk();

        $this->assertSame(1, $adminOne->notifications()->count());
        $this->assertSame(1, $adminTwo->notifications()->count());

        $notification = $adminOne->notifications()->firstOrFail();
        $this->assertSame('Pengajuan baru menunggu pemeriksaan', $notification->data['title']);
        $this->assertSame($submission->submission_number, $notification->data['submission_number']);
    }
}
