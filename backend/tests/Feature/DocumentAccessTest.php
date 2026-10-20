<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji isolasi akses dokumen: unggah/hapus/preview milik sendiri,
 * pemeriksaan & unduhan admin, serta berkas tetap di disk privat — Tahap 8.
 */
class DocumentAccessTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    public function test_applicant_uploads_document_to_own_draft(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $requirement = $this->pdfRequirement();

        $response = $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $requirement->id,
            'file' => UploadedFile::fake()->create('naskah-lengkap.pdf', 200),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.original_filename', 'naskah-lengkap.pdf')
            ->assertJsonPath('data.mime_type', 'application/pdf')
            ->assertJsonPath('data.review_status', 'pending')
            ->assertJsonPath('meta.message', 'Dokumen berhasil diunggah.');

        $document = $submission->documents()->firstOrFail();

        $this->assertStringStartsWith('submissions/'.$submission->id.'/', $document->stored_path);
        Storage::disk('local')->assertExists($document->stored_path);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.uploaded',
            'actor_user_id' => $owner->id,
            'entity_id' => $document->id,
        ]);
    }

    public function test_document_can_be_uploaded_while_needs_revision(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::NeedsRevision);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $this->pdfRequirement()->id,
            'file' => UploadedFile::fake()->create('revisi.pdf', 100),
        ], ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_upload_to_locked_submission_returns_409(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $this->pdfRequirement()->id,
            'file' => UploadedFile::fake()->create('telat.pdf', 100),
        ], ['Accept' => 'application/json'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Dokumen hanya dapat diunggah saat pengajuan berstatus Draft atau Perlu Revisi.');
    }

    public function test_upload_to_foreign_submission_returns_404(): void
    {
        $this->actingAsApplicant();
        $foreign = $this->submissionFor($this->applicant());

        $this->post('/api/v1/submissions/'.$foreign->id.'/documents', [
            'document_requirement_id' => $this->pdfRequirement()->id,
            'file' => UploadedFile::fake()->create('asing.pdf', 100),
        ], ['Accept' => 'application/json'])->assertNotFound();
    }

    public function test_upload_rejects_inactive_requirement(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $requirement = $this->pdfRequirement(['is_active' => false]);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $requirement->id,
            'file' => UploadedFile::fake()->create('naskah.pdf', 100),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.document_requirement_id.0', 'Jenis dokumen tidak valid atau sudah tidak aktif.');
    }

    public function test_upload_rejects_disallowed_mime_type(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $this->pdfRequirement()->id,
            'file' => UploadedFile::fake()->create('virus.exe', 100),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.file.0', 'Tipe berkas tidak diizinkan untuk persyaratan dokumen ini.');
    }

    public function test_upload_rejects_file_larger_than_requirement_limit(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $requirement = $this->pdfRequirement(['max_file_size' => 1024]);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $requirement->id,
            'file' => UploadedFile::fake()->create('besar.pdf', 100)->size(2),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.file.0', 'Ukuran berkas maksimal 1 MB.');
    }

    public function test_upload_requires_file_and_requirement(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.document_requirement_id.0', 'Jenis dokumen wajib dipilih.')
            ->assertJsonPath('errors.file.0', 'Berkas dokumen wajib diunggah.');
    }

    public function test_preview_streams_own_private_document(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $document = $this->documentFor($submission, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, '%PDF-1.4 isi uji');

        $this->get('/api/v1/documents/'.$document->id.'/preview')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('x-content-type-options', 'nosniff')
            ->assertStreamedContent('%PDF-1.4 isi uji');
    }

    public function test_preview_of_foreign_document_returns_404(): void
    {
        $this->actingAsApplicant();
        $foreign = $this->submissionFor($this->applicant());
        $document = $this->documentFor($foreign, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, 'rahasia');

        $this->get('/api/v1/documents/'.$document->id.'/preview')->assertNotFound();
    }

    public function test_admin_cannot_use_applicant_preview_endpoint(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());
        $document = $this->documentFor($submission, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, 'rahasia');

        $this->get('/api/v1/documents/'.$document->id.'/preview')->assertNotFound();
    }

    public function test_preview_returns_404_when_file_is_missing_from_storage(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $document = $this->documentFor($submission, $this->pdfRequirement());

        $this->getJson('/api/v1/documents/'.$document->id.'/preview')
            ->assertNotFound()
            ->assertJsonPath('message', 'Berkas dokumen tidak ditemukan di penyimpanan.');
    }

    public function test_applicant_deletes_own_document_and_file(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);
        $document = $this->documentFor($submission, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, 'isi');

        $this->deleteJson('/api/v1/submissions/'.$submission->id.'/documents/'.$document->id)
            ->assertNoContent();

        $this->assertDatabaseMissing('submission_documents', ['id' => $document->id]);
        Storage::disk('local')->assertMissing($document->stored_path);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.deleted',
            'actor_user_id' => $owner->id,
        ]);
    }

    public function test_document_must_belong_to_submission_in_route(): void
    {
        $owner = $this->actingAsApplicant();
        $first = $this->submissionFor($owner);
        $second = $this->submissionFor($owner);
        $document = $this->documentFor($first, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, 'isi');

        $this->deleteJson('/api/v1/submissions/'.$second->id.'/documents/'.$document->id)
            ->assertNotFound();

        $this->assertDatabaseHas('submission_documents', ['id' => $document->id]);
    }

    public function test_delete_document_is_locked_when_submission_is_submitted(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);
        $document = $this->documentFor($submission, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, 'isi');

        $this->deleteJson('/api/v1/submissions/'.$submission->id.'/documents/'.$document->id)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Dokumen hanya dapat dihapus saat pengajuan berstatus Draft atau Perlu Revisi.');

        $this->assertDatabaseHas('submission_documents', ['id' => $document->id]);
    }

    public function test_admin_reviews_document_with_note(): void
    {
        $admin = $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());
        $document = $this->documentFor($submission, $this->pdfRequirement());

        $this->patchJson('/api/v1/admin/documents/'.$document->id.'/review', [
            'review_status' => 'rejected',
            'admin_note' => 'Hasil pindai kurang jelas.',
        ])
            ->assertOk()
            ->assertJsonPath('data.review_status', 'rejected')
            ->assertJsonPath('data.admin_note', 'Hasil pindai kurang jelas.')
            ->assertJsonPath('meta.message', 'Hasil pemeriksaan dokumen disimpan.');

        $this->assertDatabaseHas('submission_documents', [
            'id' => $document->id,
            'review_status' => 'rejected',
            'admin_note' => 'Hasil pindai kurang jelas.',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.reviewed',
            'actor_user_id' => $admin->id,
            'entity_id' => $document->id,
        ]);
    }

    public function test_admin_review_rejects_invalid_status(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());
        $document = $this->documentFor($submission, $this->pdfRequirement());

        $this->patchJson('/api/v1/admin/documents/'.$document->id.'/review', [
            'review_status' => 'entah',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.review_status.0', 'Hasil pemeriksaan dokumen tidak valid.');
    }

    public function test_admin_downloads_document_as_attachment(): void
    {
        $admin = $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());
        $document = $this->documentFor($submission, $this->pdfRequirement());

        Storage::disk('local')->put($document->stored_path, '%PDF isi');

        $this->get('/api/v1/admin/documents/'.$document->id.'/download')
            ->assertOk()
            ->assertDownload('berkas.pdf')
            ->assertHeader('x-content-type-options', 'nosniff')
            ->assertStreamedContent('%PDF isi');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.downloaded',
            'actor_user_id' => $admin->id,
            'entity_id' => $document->id,
        ]);
    }

    public function test_applicant_cannot_review_or_download_documents_as_admin(): void
    {
        $this->actingAsApplicant();
        $submission = $this->submissionFor($this->applicant());
        $document = $this->documentFor($submission, $this->pdfRequirement());

        $this->patchJson('/api/v1/admin/documents/'.$document->id.'/review', [
            'review_status' => 'approved',
        ])->assertForbidden();

        $this->get('/api/v1/admin/documents/'.$document->id.'/download')->assertForbidden();
    }

    public function test_applicant_sees_only_active_document_requirements(): void
    {
        $this->actingAsApplicant();

        $active = $this->pdfRequirement(['name' => 'Aktif']);
        $this->pdfRequirement(['name' => 'Nonaktif', 'is_active' => false]);

        $this->getJson('/api/v1/document-requirements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.is_active', true);
    }

    public function test_document_requirements_require_authentication(): void
    {
        $this->getJson('/api/v1/document-requirements')->assertUnauthorized();
    }
}
