<?php

namespace Tests\Concerns;

use App\Enums\DocumentReviewStatus;
use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use App\Models\DocumentRequirement;
use App\Models\SubmissionDocument;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * Helper pembuatan data uji & autentikasi peran untuk feature test API
 * LPTI-ISBN (Tahap 8 — pengujian dan hardening).
 */
trait InteractsWithApi
{
    protected function applicant(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    protected function actingAsApplicant(): User
    {
        $user = $this->applicant();

        Sanctum::actingAs($user);

        return $user;
    }

    protected function admin(array $attributes = []): User
    {
        return User::factory()->admin()->create($attributes);
    }

    protected function actingAsAdmin(): User
    {
        $user = $this->admin();

        Sanctum::actingAs($user);

        return $user;
    }

    protected function superAdmin(array $attributes = []): User
    {
        return User::factory()->superAdmin()->create($attributes);
    }

    protected function actingAsSuperAdmin(): User
    {
        $user = $this->superAdmin();

        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * Buat pengajuan milik $user dengan status tertentu (default draft).
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function submissionFor(
        User $user,
        SubmissionStatus $status = SubmissionStatus::Draft,
        array $attributes = [],
    ): BookSubmission {
        return BookSubmission::factory()
            ->for($user, 'user')
            ->withStatus($status)
            ->create($attributes);
    }

    /**
     * Body valid pembuatan pengajuan (docs/API.md §3.2).
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function validSubmissionPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Naskah Uji Sistem',
            'main_author' => 'Penulis Uji',
            'publisher_name' => 'Penerbit Uji',
            'language' => 'Indonesia',
            'publication_format' => 'Cetak',
        ], $overrides);
    }

    /**
     * Persyaratan dokumen PDF wajib & aktif untuk uji unggah.
     *
     * @param  array<string, mixed>  $overrides
     */
    protected function pdfRequirement(array $overrides = []): DocumentRequirement
    {
        return DocumentRequirement::create(array_merge([
            'name' => 'Naskah Lengkap PDF',
            'description' => 'Berkas naskah lengkap dalam format PDF.',
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size' => 4194304,
            'is_required' => true,
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides));
    }

    /**
     * Buat catatan dokumen tanpa melewati endpoint unggah (untuk menguji
     * preview/hapus/unduh pada status yang sudah terkunci).
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function documentFor(
        BookSubmission $submission,
        DocumentRequirement $requirement,
        ?string $storedPath = null,
        array $attributes = [],
    ): SubmissionDocument {
        $document = new SubmissionDocument(array_merge([
            'original_filename' => 'berkas.pdf',
            'stored_path' => $storedPath ?? sprintf('submissions/%d/berkas.pdf', $submission->id),
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
        ], $attributes));

        $document->book_submission_id = $submission->id;
        $document->document_requirement_id = $requirement->id;
        $document->uploaded_by = $submission->user_id;
        $document->review_status = DocumentReviewStatus::Pending;
        $document->save();

        return $document;
    }

    /**
     * Body valid pembuatan persyaratan dokumen oleh admin.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function requirementPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Surat Keterangan Penerbit',
            'description' => 'Surat keterangan resmi dari penerbit.',
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size' => 2097152,
            'is_required' => true,
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides);
    }
}
