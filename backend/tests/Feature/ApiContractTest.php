<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji kontrak bersama API /api/v1 (docs/API.md §1): format envelope,
 * pemetaan status HTTP, otentikasi, otorisasi peran, dan anti-enumeration.
 */
class ApiContractTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_success_envelope_always_contains_success_and_data(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonStructure(['success', 'data'])
            ->assertJsonPath('success', true);
    }

    public function test_failure_envelope_contains_message_and_success_false(): void
    {
        $this->postJson('/api/v1/login', ['email' => 'bukan-email', 'password' => 'x'])
            ->assertUnprocessable()
            ->assertJsonStructure(['success', 'message', 'errors'])
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Data yang dikirim tidak valid.');
    }

    public function test_every_v1_route_requires_authentication(): void
    {
        $owner = $this->applicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);
        $requirement = $this->pdfRequirement();
        $document = $this->documentFor($submission, $requirement);

        $guarded = [
            ['get', '/api/v1/me'],
            ['put', '/api/v1/me'],
            ['post', '/api/v1/logout'],
            ['get', '/api/v1/document-requirements'],
            ['get', '/api/v1/submissions'],
            ['get', '/api/v1/submissions/stats'],
            ['post', '/api/v1/submissions'],
            ['get', '/api/v1/submissions/'.$submission->id],
            ['put', '/api/v1/submissions/'.$submission->id],
            ['delete', '/api/v1/submissions/'.$submission->id],
            ['post', '/api/v1/submissions/'.$submission->id.'/submit'],
            ['post', '/api/v1/submissions/'.$submission->id.'/resubmit'],
            ['get', '/api/v1/submissions/'.$submission->id.'/history'],
            ['post', '/api/v1/submissions/'.$submission->id.'/documents'],
            ['delete', '/api/v1/submissions/'.$submission->id.'/documents/'.$document->id],
            ['get', '/api/v1/documents/'.$document->id.'/preview'],
            ['get', '/api/v1/notifications'],
            ['patch', '/api/v1/notifications/read-all'],
            ['patch', '/api/v1/notifications/00000000-0000-0000-0000-000000000000/read'],
            ['get', '/api/v1/admin/dashboard'],
            ['get', '/api/v1/admin/submissions'],
            ['get', '/api/v1/admin/submissions/'.$submission->id],
            ['post', '/api/v1/admin/submissions/'.$submission->id.'/start-review'],
            ['post', '/api/v1/admin/submissions/'.$submission->id.'/request-revision'],
            ['post', '/api/v1/admin/submissions/'.$submission->id.'/approve'],
            ['post', '/api/v1/admin/submissions/'.$submission->id.'/reject'],
            ['post', '/api/v1/admin/submissions/'.$submission->id.'/record-isbn'],
            ['patch', '/api/v1/admin/documents/'.$document->id.'/review'],
            ['get', '/api/v1/admin/documents/'.$document->id.'/download'],
            ['get', '/api/v1/admin/pemohon'],
            ['get', '/api/v1/admin/reports/submissions'],
            ['get', '/api/v1/admin/reports/submissions.csv'],
            ['get', '/api/v1/admin/audit-log'],
            ['get', '/api/v1/admin/document-requirements'],
            ['post', '/api/v1/admin/document-requirements'],
            ['put', '/api/v1/admin/document-requirements/'.$requirement->id],
            ['delete', '/api/v1/admin/document-requirements/'.$requirement->id],
            ['get', '/api/v1/admin/users'],
            ['post', '/api/v1/admin/users'],
            ['get', '/api/v1/admin/users/'.$owner->id],
            ['put', '/api/v1/admin/users/'.$owner->id],
            ['delete', '/api/v1/admin/users/'.$owner->id],
        ];

        foreach ($guarded as [$method, $uri]) {
            $this->json($method, $uri)
                ->assertUnauthorized()
                ->assertJsonPath('success', false);
        }
    }

    public function test_unknown_v1_route_returns_envelope_404(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/endpoint-tidak-ada')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Resource tidak ditemukan.');
    }

    public function test_wrong_http_method_returns_405_envelope(): void
    {
        $this->actingAsApplicant();

        $this->deleteJson('/api/v1/me')
            ->assertStatus(405)
            ->assertJsonPath('success', false);
    }

    public function test_state_conflict_uses_409(): void
    {
        $owner = $this->actingAsApplicant();
        $submission = $this->submissionFor($owner, SubmissionStatus::Submitted);

        $this->putJson('/api/v1/submissions/'.$submission->id, $this->validSubmissionPayload())
            ->assertStatus(409);
    }

    public function test_validation_error_uses_422_with_field_messages(): void
    {
        $this->postJson('/api/v1/register', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama lengkap wajib diisi.')
            ->assertJsonPath('errors.email.0', 'Email wajib diisi.')
            ->assertJsonPath('errors.applicant_type.0', 'Jenis pemohon wajib dipilih.');
    }

    public function test_role_authorization_uses_403_for_admin_area(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/submissions')
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki akses ke resource ini.');
    }

    public function test_role_authorization_uses_403_for_super_admin_area(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/users')
            ->assertForbidden()
            ->assertJsonPath('message', 'Hanya admin utama yang dapat mengakses resource ini.');
    }

    public function test_write_requests_are_never_cached_as_ids_are_unique_per_request(): void
    {
        $this->actingAsApplicant();

        $first = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())->assertCreated();
        $second = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())->assertCreated();

        $this->assertNotSame($first->json('data.id'), $second->json('data.id'));
        $this->assertNotSame(
            $first->json('data.submission_number'),
            $second->json('data.submission_number'),
        );
    }

    public function test_mass_assignment_of_role_via_any_endpoint_is_ignored(): void
    {
        $user = $this->actingAsApplicant();

        $this->postJson('/api/v1/submissions', $this->validSubmissionPayload(['role' => 'super_admin']))
            ->assertCreated();

        $this->assertSame('applicant', $user->fresh()->role->value);
        $this->assertSame(0, User::query()->where('role', 'super_admin')->count());
    }

    public function test_document_existence_is_never_disclosed_to_other_users(): void
    {
        Storage::fake('local');

        $owner = $this->applicant();
        $submission = $this->submissionFor($owner);
        $requirement = $this->pdfRequirement();
        $document = $this->documentFor($submission, $requirement);

        Storage::disk('local')->put($document->stored_path, 'rahasia');

        $this->actingAsApplicant();

        $this->getJson('/api/v1/documents/'.$document->id.'/preview')
            ->assertNotFound()
            ->assertJsonPath('message', 'Resource tidak ditemukan.');

        $this->deleteJson('/api/v1/submissions/'.$submission->id.'/documents/'.$document->id)
            ->assertNotFound();

        $this->assertDatabaseHas('submission_documents', ['id' => $document->id]);
    }

    public function test_submission_number_is_generated_by_system_and_sequential(): void
    {
        $this->actingAsApplicant();

        $first = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())->json('data.submission_number');
        $second = $this->postJson('/api/v1/submissions', $this->validSubmissionPayload())->json('data.submission_number');

        $year = now()->year;

        $this->assertSame('LPTI-ISBN-'.$year.'-00001', $first);
        $this->assertSame('LPTI-ISBN-'.$year.'-00002', $second);
    }
}
