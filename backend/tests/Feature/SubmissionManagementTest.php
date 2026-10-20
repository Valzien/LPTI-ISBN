<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use App\Notifications\SubmissionStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji pengajuan milik pemohon: pembuatan, daftar/filter/pencarian,
 * detail, edit terkunci, hapus, ajukan & ajukan ulang — Tahap 8.
 *
 * Seluruh akses antar pengguna memakai anti-enumeration 404.
 */
class SubmissionManagementTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_applicant_creates_draft_with_generated_number_and_initial_history(): void
    {
        $user = $this->actingAsApplicant();

        $response = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.status_label', 'Draft')
            ->assertJsonPath('data.is_editable', true)
            ->assertJsonPath('meta.message', 'Pengajuan berhasil dibuat.');

        $this->assertMatchesRegularExpression('/^LPTI-ISBN-\d{4}-\d{5}$/', $response->json('data.submission_number'));

        $submissionId = $response->json('data.id');

        $this->assertDatabaseHas('submission_status_histories', [
            'book_submission_id' => $submissionId,
            'previous_status' => null,
            'new_status' => 'draft',
            'actor_user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'submission.created',
            'actor_user_id' => $user->id,
            'entity_id' => $submissionId,
        ]);
    }

    public function test_create_ignores_protected_columns_from_client_input(): void
    {
        $this->actingAsApplicant();

        $response = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'status' => 'approved_for_processing',
            'submission_number' => 'LPTI-ISBN-2000-99999',
            'isbn_number' => '9786021234567',
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.isbn_number', null);

        $this->assertDoesNotMatchRegularExpression(
            '/^LPTI-ISBN-2000-99999$/',
            (string) $response->json('data.submission_number'),
        );
    }

    public function test_create_validates_required_book_fields(): void
    {
        $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.title.0', 'Judul buku wajib diisi.')
            ->assertJsonPath('errors.main_author.0', 'Penulis utama wajib diisi.')
            ->assertJsonPath('errors.publisher_name.0', 'Nama penerbit wajib diisi.')
            ->assertJsonPath('errors.language.0', 'Bahasa buku wajib diisi.')
            ->assertJsonPath('errors.publication_format.0', 'Format terbitan wajib diisi.');
    }

    public function test_admin_cannot_create_submission_via_applicant_endpoint(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())
            ->assertForbidden();
    }

    public function test_guest_cannot_create_submission(): void
    {
        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())
            ->assertUnauthorized();
    }

    public function test_index_lists_only_own_submissions(): void
    {
        $owner = $this->actingAsApplicant();
        $own = $this->submissionFor($owner);
        $other = $this->submissionFor($this->applicant());
        $adminSubmission = $this->submissionFor($this->admin());

        $this->getJson('/api/v1/submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_index_filters_by_status_and_searches_by_keyword(): void
    {
        $owner = $this->actingAsApplicant();

        $this->submissionFor($owner, SubmissionStatus::Draft, ['title' => 'Buku Masak Nusantara']);
        $diajukan = $this->submissionFor($owner, SubmissionStatus::Submitted, ['title' => 'Ensiklopedia Bahasa']);
        $this->submissionFor($owner, SubmissionStatus::Draft, ['title' => 'Novel Petualangan']);

        $this->getJson('/api/v1/submissions?status=submitted')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $diajukan->id);

        $this->getJson('/api/v1/submissions?q='.urlencode($diajukan->submission_number))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $diajukan->id);

        $this->getJson('/api/v1/submissions?q=Masak')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_index_rejects_invalid_status_filter(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/submissions?status=bukan-status')
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'Status tidak valid.');
    }

    public function test_index_is_paginated_ten_per_page(): void
    {
        $owner = $this->actingAsApplicant();

        foreach (range(1, 11) as $index) {
            $this->submissionFor($owner, SubmissionStatus::Draft, ['title' => 'Judul '.$index]);
        }

        $this->getJson('/api/v1/submissions')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 11)
            ->assertJsonPath('meta.last_page', 2);

        $this->getJson('/api/v1/submissions?page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_show_returns_detail_with_documents_and_history(): void
    {
        $owner = $this->actingAsApplicant();
        $submissionId = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())
            ->assertCreated()
            ->json('data.id');
        $submission = BookSubmission::query()->findOrFail($submissionId);
        $requirement = $this->pdfRequirement();

        Storage::fake('local');

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $requirement->id,
            'file' => UploadedFile::fake()->create('naskah.pdf', 100),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->getJson('/api/v1/submissions/'.$submission->id)
            ->assertOk()
            ->assertJsonCount(1, 'data.documents')
            ->assertJsonPath('data.documents.0.requirement_name', 'Naskah Lengkap PDF')
            ->assertJsonCount(1, 'data.status_histories')
            ->assertJsonPath('data.status_histories.0.new_status', 'draft')
            ->assertJsonPath('data.status_histories.0.actor_name', $owner->name);
    }

    public function test_show_update_and_delete_of_foreign_submission_return_404(): void
    {
        $this->actingAsApplicant();
        $foreign = $this->submissionFor($this->applicant());

        $this->getJson('/api/v1/submissions/'.$foreign->id)
            ->assertNotFound()
            ->assertJsonPath('message', 'Resource tidak ditemukan.');

        $this->putJson('/api/v1/submissions/'.$foreign->id, $this->validSubmissionPayload())
            ->assertNotFound();

        $this->postJson('/api/v1/submissions/'.$foreign->id.'/submit')
            ->assertNotFound();

        $this->deleteJson('/api/v1/submissions/'.$foreign->id)
            ->assertNotFound();
    }

    public function test_admin_cannot_use_applicant_endpoints_for_any_submission(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());

        $this->getJson('/api/v1/submissions/'.$submission->id)->assertNotFound();
        $this->putJson('/api/v1/submissions/'.$submission->id, $this->validSubmissionPayload())->assertNotFound();
        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')->assertNotFound();
    }

    public function test_update_allows_draft_and_needs_revision_statuses(): void
    {
        $owner = $this->actingAsApplicant();
        $draft = $this->submissionFor($owner);
        $needsRevision = $this->submissionFor($owner, SubmissionStatus::NeedsRevision);

        $this->putJson('/api/v1/submissions/'.$draft->id, $this->validSubmissionPayload([
            'title' => 'Judul Diperbarui',
        ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'Judul Diperbarui')
            ->assertJsonPath('meta.message', 'Pengajuan berhasil diperbarui.');

        $this->putJson('/api/v1/submissions/'.$needsRevision->id, $this->validSubmissionPayload([
            'title' => 'Revisi Diterapkan',
        ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'Revisi Diterapkan');
    }

    public function test_update_is_locked_when_submission_is_under_review(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::UnderReview);

        $this->putJson('/api/v1/submissions/'.$submission->id, $this->validSubmissionPayload())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Pengajuan hanya dapat diubah saat berstatus Draft atau Perlu Revisi.');
    }

    public function test_update_ignores_status_isbn_and_submission_number_input(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $originalNumber = $submission->submission_number;

        $this->putJson('/api/v1/submissions/'.$submission->id, $this->validSubmissionPayload([
            'status' => 'isbn_assigned',
            'isbn_number' => '9786021234567',
            'submission_number' => 'LPTI-ISBN-2000-99999',
        ]))->assertOk();

        $submission->refresh();

        $this->assertSame(SubmissionStatus::Draft, $submission->status);
        $this->assertNull($submission->isbn_number);
        $this->assertSame($originalNumber, $submission->submission_number);
    }

    public function test_delete_removes_draft_together_with_document_files(): void
    {
        Storage::fake('local');

        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $requirement = $this->pdfRequirement();

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $requirement->id,
            'file' => UploadedFile::fake()->create('naskah.pdf', 100),
        ], ['Accept' => 'application/json'])->assertCreated();

        $storedPath = $submission->documents()->firstOrFail()->stored_path;

        $this->deleteJson('/api/v1/submissions/'.$submission->id)
            ->assertNoContent();

        $this->assertDatabaseMissing('book_submissions', ['id' => $submission->id]);
        $this->assertDatabaseMissing('submission_documents', ['book_submission_id' => $submission->id]);
        Storage::disk('local')->assertMissing($storedPath);
    }

    public function test_delete_is_rejected_for_submitted_submission(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);

        $this->deleteJson('/api/v1/submissions/'.$submission->id)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Hanya pengajuan berstatus Draft yang dapat dihapus.');

        $this->assertDatabaseHas('book_submissions', ['id' => $submission->id]);
    }

    public function test_submit_requires_every_active_required_document(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $this->pdfRequirement(['name' => 'Naskah Lengkap PDF']);
        $this->pdfRequirement(['name' => 'Surat Pernyataan', 'sort_order' => 2]);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')
            ->assertUnprocessable()
            ->assertJsonPath('errors.documents.0', 'Naskah Lengkap PDF')
            ->assertJsonPath('errors.documents.1', 'Surat Pernyataan');

        $this->assertSame(SubmissionStatus::Draft, $submission->fresh()->status);
    }

    public function test_submit_moves_draft_to_submitted_and_notifies_all_admins(): void
    {
        $owner = $this->actingAsApplicant();
        $admin = $this->admin();
        $superAdmin = $this->superAdmin();
        $otherApplicant = $this->applicant();

        $submission = $this->submissionFor($owner);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('meta.message', 'Pengajuan berhasil diajukan dan menunggu verifikasi admin.');

        $this->assertSame(SubmissionStatus::Submitted, $submission->fresh()->status);

        $this->assertSame(1, $admin->notifications()->count());
        $this->assertSame(1, $superAdmin->notifications()->count());
        $this->assertSame(0, $otherApplicant->notifications()->count());
        $this->assertSame(0, $owner->notifications()->count());

        $this->assertDatabaseHas('submission_status_histories', [
            'book_submission_id' => $submission->id,
            'previous_status' => 'draft',
            'new_status' => 'submitted',
            'actor_user_id' => $owner->id,
        ]);
    }

    public function test_submit_is_rejected_from_non_draft_status(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::UnderReview);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/submit')
            ->assertForbidden()
            ->assertJsonPath('message', 'Pengajuan hanya dapat diajukan dari status Draft (status saat ini: Dalam Verifikasi).');
    }

    public function test_resubmit_moves_needs_revision_to_resubmitted(): void
    {
        $owner = $this->actingAsApplicant();
        $admin = $this->admin();
        $submission = $this->submissionFor($owner, SubmissionStatus::NeedsRevision);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/resubmit')
            ->assertOk()
            ->assertJsonPath('data.status', 'resubmitted')
            ->assertJsonPath('meta.message', 'Pengajuan berhasil diajukan ulang.');

        $this->assertSame(1, $admin->notifications()->count());
    }

    public function test_resubmit_is_rejected_from_draft(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->postJson('/api/v1/submissions/'.$submission->id.'/resubmit')
            ->assertForbidden()
            ->assertJsonPath('message', 'Pengajuan hanya dapat diajukan ulang dari status Perlu Revisi (status saat ini: Draft).');
    }

    public function test_stats_summarize_own_submissions_and_unread_notifications(): void
    {
        $owner = $this->actingAsApplicant();
        $draftOne = $this->submissionFor($owner, SubmissionStatus::Draft);
        $this->submissionFor($owner, SubmissionStatus::Draft);
        $this->submissionFor($owner, SubmissionStatus::Submitted);
        $this->submissionFor($this->applicant());

        $owner->notify(new SubmissionStatusChanged($draftOne, SubmissionStatus::Draft));

        $response = $this->getJson('/api/v1/submissions/stats')->assertOk();

        $this->assertSame(3, $response->json('data.total'));
        $this->assertSame(1, $response->json('data.unread_notifications'));
        $this->assertCount(8, $response->json('data.by_status'));

        $totals = collect($response->json('data.by_status'))->pluck('total', 'status');
        $this->assertSame(2, $totals['draft']);
        $this->assertSame(1, $totals['submitted']);
        $this->assertSame(0, $totals['rejected']);
    }

    public function test_applicant_cannot_access_admin_submission_endpoints(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/submissions')->assertForbidden();
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }
}
