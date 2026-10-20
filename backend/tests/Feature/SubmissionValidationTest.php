<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji validasi & otorisasi pembuatan/penyuntingan pengajuan serta
 * pembatasan tipe berkas (path traversal) — Tahap 8.
 */
class SubmissionValidationTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_title_must_not_exceed_255_characters(): void
    {
        $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'title' => str_repeat('a', 256),
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.title.0', 'Judul buku maksimal 255 karakter.');
    }

    public function test_planned_publication_year_must_be_a_number_within_range(): void
    {
        $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'planned_publication_year' => 'dua ribu',
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.planned_publication_year.0', 'Tahun terbit terencana harus berupa angka.');

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'planned_publication_year' => 1800,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.planned_publication_year.0', 'Tahun terbit terencana tidak valid.');

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'planned_publication_year' => 2200,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.planned_publication_year.0', 'Tahun terbit terencana maksimal 2100.');
    }

    public function test_page_count_must_be_a_positive_integer(): void
    {
        $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'page_count' => 0,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.page_count.0', 'Jumlah halaman minimal 1.');

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'page_count' => 'seratus',
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.page_count.0', 'Jumlah halaman harus berupa angka.');
    }

    public function test_long_free_text_fields_are_rejected(): void
    {
        $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'synopsis' => str_repeat('a', 10001),
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.synopsis.0', 'Sinopsis maksimal 10000 karakter.');

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'notes' => str_repeat('a', 5001),
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.notes.0', 'Catatan maksimal 5000 karakter.');
    }

    public function test_validation_error_message_uses_indonesian(): void
    {
        $this->actingAsApplicant();

        $response = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload([
            'title' => '',
        ]))->assertUnprocessable();

        $this->assertSame('Data yang dikirim tidak valid.', $response->json('message'));
        $this->assertSame('Judul buku wajib diisi.', $response->json('errors.title.0'));
    }

    public function test_update_uses_same_rules_as_create(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->putJson('/api/v1/submissions/'.$submission->id, $this->validSubmissionPayload([
            'main_author' => '',
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.main_author.0', 'Penulis utama wajib diisi.');
    }

    public function test_invalid_document_requirement_id_is_rejected(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => 99999,
            'file' => UploadedFile::fake()->create('a.pdf', 10),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.document_requirement_id.0', 'Jenis dokumen tidak valid atau sudah tidak aktif.');
    }

    public function test_uploaded_filename_cannot_escape_private_directory(): void
    {
        Storage::fake('local');

        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner);

        $this->post('/api/v1/submissions/'.$submission->id.'/documents', [
            'document_requirement_id' => $this->pdfRequirement()->id,
            'file' => UploadedFile::fake()->create('../../evil.pdf', 10),
        ], ['Accept' => 'application/json'])->assertCreated();

        $document = $submission->documents()->firstOrFail();

        $this->assertStringStartsWith('submissions/'.$submission->id.'/', $document->stored_path);
        $this->assertStringNotContainsString('..', $document->stored_path);

        $pathParts = explode('/', str_replace('\\', '/', $document->stored_path));
        $this->assertCount(3, $pathParts);
        $this->assertSame('submissions', $pathParts[0]);
        $this->assertSame((string) $submission->id, $pathParts[1]);
    }

    public function test_pemohon_cannot_access_admin_dashboard_or_submission_lists(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
        $this->getJson('/api/v1/admin/submissions')->assertForbidden();
        $this->getJson('/api/v1/admin/audit-log')->assertForbidden();
        $this->getJson('/api/v1/admin/pemohon')->assertForbidden();
        $this->getJson('/api/v1/admin/document-requirements')->assertForbidden();
    }

    public function test_admin_cannot_touch_applicant_document_endpoints(): void
    {
        $this->actingAsAdmin();
        $submission = $this->submissionFor($this->applicant());

        $this->postJson('/api/v1/submissions/'.$submission->id.'/documents', [])->assertNotFound();
        $this->getJson('/api/v1/submissions/'.$submission->id.'/history')->assertNotFound();
    }
}
