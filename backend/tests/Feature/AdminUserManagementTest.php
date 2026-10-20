<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\SubmissionStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji pemohon & manajemen akun pengguna (docs/API.md §3.4): daftar pemohon
 * untuk semua admin, CRUD akun khusus super_admin, guard perilaku — Tahap 8.
 */
class AdminUserManagementTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_applicants_list_is_available_to_admin_with_submission_counts(): void
    {
        $this->actingAsAdmin();
        $applicant = $this->applicant(['name' => 'Pemohon Satu']);
        $this->submissionFor($applicant);
        $this->submissionFor($applicant);
        $this->admin(['name' => 'Bukan Pemohon']);

        $this->getJson('/api/v1/admin/pemohon')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Pemohon Satu')
            ->assertJsonPath('data.0.submissions_count', 2);
    }

    public function test_applicants_list_can_be_searched(): void
    {
        $this->actingAsAdmin();
        $this->applicant(['name' => 'Budi Santoso', 'email' => 'budi@contoh.com']);
        $this->applicant(['name' => 'Siti Rahayu']);

        $this->getJson('/api/v1/admin/pemohon?q=Budi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budi Santoso');

        $this->getJson('/api/v1/admin/pemohon?q='.urlencode('budi@contoh.com'))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_applicant_cannot_list_applicants(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/pemohon')
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki akses ke resource ini.');
    }

    public function test_user_management_is_super_admin_only(): void
    {
        $this->actingAsAdmin();
        $target = $this->applicant();

        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/users/'.$target->id)->assertForbidden();
        $this->postJson('/api/v1/admin/users', [])->assertForbidden();
        $this->putJson('/api/v1/admin/users/'.$target->id, [])->assertForbidden();
        $this->deleteJson('/api/v1/admin/users/'.$target->id)->assertForbidden();
    }

    public function test_super_admin_can_list_users_with_role_and_search_filters(): void
    {
        $this->actingAsSuperAdmin();
        $this->applicant(['name' => 'Pemohon Dua']);
        $this->admin(['name' => 'Verifikator Dua']);

        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/admin/users?role=admin')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Verifikator Dua');

        $this->getJson('/api/v1/admin/users?q=Pemohon')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/admin/users?role=ngawur')
            ->assertUnprocessable()
            ->assertJsonPath('errors.role.0', 'Role tidak valid.');
    }

    public function test_super_admin_shows_single_user_with_submission_count(): void
    {
        $this->actingAsSuperAdmin();
        $target = $this->applicant();
        $this->submissionFor($target);

        $this->getJson('/api/v1/admin/users/'.$target->id)
            ->assertOk()
            ->assertJsonPath('data.id', $target->id)
            ->assertJsonPath('data.submissions_count', 1);

        $this->getJson('/api/v1/admin/users/99999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Resource tidak ditemukan.');
    }

    public function test_super_admin_creates_user_with_explicit_role_and_hashed_password(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/v1/admin/users', [
            'name' => 'Verifikator Baru',
            'email' => 'verifikator.baru@example.com',
            'password' => 'kata-sandi-baru',
            'role' => 'admin',
            'phone' => '081234567890',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.role_label', 'Admin/Verifikator')
            ->assertJsonPath('meta.message', 'Akun pengguna berhasil dibuat.');

        $user = User::query()->where('email', 'verifikator.baru@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('kata-sandi-baru', $user->password));
        $this->assertSame(UserRole::Admin, $user->role);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.created',
            'actor_user_id' => $superAdmin->id,
            'entity_id' => $user->id,
        ]);
    }

    public function test_create_user_validates_required_fields(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/users', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama wajib diisi.')
            ->assertJsonPath('errors.email.0', 'Email wajib diisi.')
            ->assertJsonPath('errors.password.0', 'Kata sandi wajib diisi.')
            ->assertJsonPath('errors.role.0', 'Role wajib dipilih.');

        $taken = $this->applicant();

        $this->postJson('/api/v1/admin/users', [
            'name' => 'Duplikat',
            'email' => $taken->email,
            'password' => 'kata-sandi-baru',
            'role' => 'applicant',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Email sudah digunakan akun lain.');
    }

    public function test_super_admin_updates_user_without_forcing_password_change(): void
    {
        $this->actingAsSuperAdmin();
        $target = $this->applicant(['name' => 'Nama Lama']);

        $this->putJson('/api/v1/admin/users/'.$target->id, [
            'name' => 'Nama Baru',
            'email' => $target->email,
            'password' => null,
            'role' => 'applicant',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('meta.message', 'Akun pengguna berhasil diperbarui.');

        $target->refresh();

        $this->assertSame('Nama Baru', $target->name);
        $this->assertTrue(Hash::check('password', $target->password));
    }

    public function test_super_admin_can_change_password_and_role_of_other_user(): void
    {
        $this->actingAsSuperAdmin();
        $target = $this->applicant(['name' => 'Pemohon Naik Kelas']);

        $this->putJson('/api/v1/admin/users/'.$target->id, [
            'name' => 'Pemohon Naik Kelas',
            'email' => $target->email,
            'password' => 'sandibaru123',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $target->refresh();

        $this->assertSame(UserRole::Admin, $target->role);
        $this->assertTrue(Hash::check('sandibaru123', $target->password));
    }

    public function test_super_admin_cannot_change_own_role(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();

        $this->putJson('/api/v1/admin/users/'.$superAdmin->id, [
            'name' => $superAdmin->name,
            'email' => $superAdmin->email,
            'password' => null,
            'role' => 'admin',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak dapat mengubah role akun sendiri.');

        $this->assertSame(UserRole::SuperAdmin, $superAdmin->fresh()->role);
    }

    public function test_super_admin_can_keep_own_role_when_updating_own_account(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();

        $this->putJson('/api/v1/admin/users/'.$superAdmin->id, [
            'name' => 'Admin Utama Diperbarui',
            'email' => $superAdmin->email,
            'password' => null,
            'role' => 'super_admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Admin Utama Diperbarui');

        $this->assertSame(UserRole::SuperAdmin, $superAdmin->fresh()->role);
    }

    public function test_super_admin_cannot_delete_own_account(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();

        $this->deleteJson('/api/v1/admin/users/'.$superAdmin->id)
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak dapat menghapus akun sendiri.');

        $this->assertDatabaseHas('users', ['id' => $superAdmin->id]);
    }

    public function test_cannot_delete_user_that_still_has_submissions(): void
    {
        $this->actingAsSuperAdmin();
        $target = $this->applicant();
        $this->submissionFor($target);

        $this->deleteJson('/api/v1/admin/users/'.$target->id)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Akun masih memiliki pengajuan sehingga tidak dapat dihapus.');

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_super_admin_deletes_user_and_removes_tokens_and_notifications(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();
        $target = $this->applicant();
        $target->createToken('api')->plainTextToken;
        $target->notify(new SubmissionStatusChanged(
            $this->submissionFor($target),
            SubmissionStatus::Draft,
        ));

        $target->submissions()->delete();

        $this->deleteJson('/api/v1/admin/users/'.$target->id)->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $target->id]);
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $target->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.deleted',
            'actor_user_id' => $superAdmin->id,
        ]);
    }

    public function test_update_validates_email_uniqueness_and_password_length(): void
    {
        $this->actingAsSuperAdmin();
        $target = $this->applicant();
        $other = $this->applicant();

        $this->putJson('/api/v1/admin/users/'.$target->id, [
            'name' => 'Nama',
            'email' => $other->email,
            'password' => null,
            'role' => 'applicant',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Email sudah digunakan akun lain.');

        $this->putJson('/api/v1/admin/users/'.$target->id, [
            'name' => 'Nama',
            'email' => $target->email,
            'password' => 'pendek',
            'role' => 'applicant',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.password.0', 'Kata sandi minimal 8 karakter.');
    }
}
