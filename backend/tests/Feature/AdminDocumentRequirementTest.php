<?php

namespace Tests\Feature;

use App\Models\DocumentRequirement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji kelola persyaratan dokumen oleh admin (docs/API.md §3.4) — Tahap 8:
 * validasi, urutan, dan larangan menghapus persyaratan yang masih dipakai.
 */
class AdminDocumentRequirementTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_admin_lists_all_requirements_in_display_order(): void
    {
        $this->actingAsAdmin();
        $second = $this->pdfRequirement(['name' => 'Kedua', 'sort_order' => 2]);
        $first = $this->pdfRequirement(['name' => 'Pertama', 'sort_order' => 1]);
        $inactive = $this->pdfRequirement(['name' => 'Nonaktif', 'sort_order' => 3, 'is_active' => false]);

        $this->getJson('/api/v1/admin/document-requirements')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.1.id', $second->id)
            ->assertJsonPath('data.2.id', $inactive->id);
    }

    public function test_applicant_cannot_manage_requirements(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/document-requirements')->assertForbidden();
        $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload())->assertForbidden();
    }

    public function test_admin_creates_requirement_with_audit_log(): void
    {
        $admin = $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Surat Keterangan Penerbit')
            ->assertJsonPath('data.allowed_mime_types.0', 'application/pdf')
            ->assertJsonPath('data.max_file_size', 2097152)
            ->assertJsonPath('meta.message', 'Persyaratan dokumen berhasil dibuat.');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document_requirement.created',
            'actor_user_id' => $admin->id,
            'entity_id' => $response->json('data.id'),
        ]);
    }

    public function test_create_requirement_validates_payload(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/document-requirements', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama persyaratan wajib diisi.')
            ->assertJsonPath('errors.allowed_mime_types.0', 'Daftar tipe berkas yang diizinkan wajib diisi.')
            ->assertJsonPath('errors.max_file_size.0', 'Ukuran maksimum berkas wajib diisi.')
            ->assertJsonPath('errors.is_required.0', 'Penanda wajib/tidak wajib harus diisi.')
            ->assertJsonPath('errors.sort_order.0', 'Urutan wajib diisi.');
    }

    public function test_create_requirement_rejects_duplicate_name_and_bad_mime_and_oversized_limit(): void
    {
        $this->actingAsAdmin();
        $this->pdfRequirement(['name' => 'Surat Keterangan Penerbit']);

        $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload())
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama persyaratan sudah digunakan.');

        $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload([
            'name' => 'Tipe Salah',
            'allowed_mime_types' => ['pdf'],
        ]))
            ->assertUnprocessable();

        $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload([
            'name' => 'Terlalu Besar',
            'max_file_size' => 20971520,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.max_file_size.0', 'Ukuran maksimum berkas maksimal 4 MB.');
    }

    public function test_admin_updates_requirement_and_can_deactivate_it(): void
    {
        $this->actingAsAdmin();
        $requirement = $this->pdfRequirement();

        $this->putJson('/api/v1/admin/document-requirements/'.$requirement->id, $this->requirementPayload([
            'name' => 'Nama Diperbarui',
            'is_active' => false,
            'sort_order' => 5,
        ]))
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Diperbarui')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.sort_order', 5)
            ->assertJsonPath('meta.message', 'Persyaratan dokumen berhasil diperbarui.');

        $this->assertDatabaseHas('document_requirements', [
            'id' => $requirement->id,
            'name' => 'Nama Diperbarui',
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document_requirement.updated',
            'entity_id' => $requirement->id,
        ]);
    }

    public function test_update_keeps_own_name_allowed(): void
    {
        $this->actingAsAdmin();
        $requirement = $this->pdfRequirement(['name' => 'Naskah Lengkap PDF']);

        $this->putJson('/api/v1/admin/document-requirements/'.$requirement->id, $this->requirementPayload([
            'name' => 'Naskah Lengkap PDF',
        ]))->assertOk();
    }

    public function test_deleting_unused_requirement_succeeds(): void
    {
        $admin = $this->actingAsAdmin();
        $requirement = $this->pdfRequirement();

        $this->deleteJson('/api/v1/admin/document-requirements/'.$requirement->id)
            ->assertNoContent();

        $this->assertDatabaseMissing('document_requirements', ['id' => $requirement->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document_requirement.deleted',
            'actor_user_id' => $admin->id,
        ]);
    }

    public function test_deleting_used_requirement_is_blocked(): void
    {
        $this->actingAsAdmin();
        $requirement = $this->pdfRequirement();
        $submission = $this->submissionFor($this->applicant());

        $this->documentFor($submission, $requirement);

        $this->deleteJson('/api/v1/admin/document-requirements/'.$requirement->id)
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'Persyaratan masih dipakai pada dokumen pengajuan — nonaktifkan alih-alih menghapus.',
            );

        $this->assertDatabaseHas('document_requirements', ['id' => $requirement->id]);
    }

    public function test_applicant_only_sees_active_requirements_after_deactivation(): void
    {
        $admin = $this->actingAsAdmin();
        $requirement = $this->pdfRequirement();

        $this->putJson('/api/v1/admin/document-requirements/'.$requirement->id, $this->requirementPayload([
            'name' => $requirement->name,
            'is_active' => false,
        ]))->assertOk();

        $this->actingAsApplicant();

        $this->getJson('/api/v1/document-requirements')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_requirement_payload_table_columns_are_fully_persisted(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/v1/admin/document-requirements', $this->requirementPayload([
            'allowed_mime_types' => ['application/pdf', 'image/jpeg'],
            'description' => 'Deskripsi lengkap persyaratan.',
            'is_required' => false,
        ]))->assertCreated()->json('data.id');

        $requirement = DocumentRequirement::query()->findOrFail($id);

        $this->assertSame(['application/pdf', 'image/jpeg'], $requirement->allowed_mime_types);
        $this->assertSame('Deskripsi lengkap persyaratan.', $requirement->description);
        $this->assertFalse($requirement->is_required);
        $this->assertTrue($requirement->is_active);
    }
}
