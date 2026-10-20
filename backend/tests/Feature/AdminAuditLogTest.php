<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji endpoint log audit admin (docs/API.md §3.4, master prompt §9) — Tahap 8.
 */
class AdminAuditLogTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    private function seedLog(string $action = 'user.login', array $overrides = []): AuditLog
    {
        return AuditLog::create(array_merge([
            'actor_user_id' => $this->admin()->id,
            'action' => $action,
            'entity_type' => 'user',
            'entity_id' => 1,
            'metadata' => ['safe' => true],
            'ip_address' => '127.0.0.1',
        ], $overrides));
    }

    public function test_admin_can_list_audit_logs_with_actor_and_metadata(): void
    {
        $admin = $this->actingAsAdmin();
        $log = $this->seedLog('user.login', ['actor_user_id' => $admin->id]);

        $this->getJson('/api/v1/admin/audit-log')
            ->assertOk()
            ->assertJsonPath('data.0.id', $log->id)
            ->assertJsonPath('data.0.action', 'user.login')
            ->assertJsonPath('data.0.actor.id', $admin->id)
            ->assertJsonPath('data.0.actor.name', $admin->name)
            ->assertJsonPath('data.0.metadata.safe', true)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_applicant_cannot_read_audit_log(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/audit-log')
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki akses ke resource ini.');
    }

    public function test_guest_cannot_read_audit_log(): void
    {
        $this->getJson('/api/v1/admin/audit-log')->assertUnauthorized();
    }

    public function test_audit_log_filters_by_action_and_actor(): void
    {
        $admin = $this->actingAsAdmin();
        $wanted = $this->seedLog('submission.status_changed', ['actor_user_id' => $admin->id]);
        $this->seedLog('user.login', ['actor_user_id' => $this->applicant()->id]);
        $this->seedLog('user.login', ['actor_user_id' => $this->admin()->id]);

        $this->getJson('/api/v1/admin/audit-log?action=submission.status_changed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $wanted->id);

        $this->getJson('/api/v1/admin/audit-log?actor_user_id='.$admin->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'submission.status_changed');
    }

    public function test_audit_log_filters_by_date_range_and_rejects_reversed_range(): void
    {
        $this->actingAsAdmin();
        $recent = $this->seedLog('user.login');
        AuditLog::query()->where('id', $recent->id)->update(['created_at' => now()->subDays(20)]);

        $this->getJson('/api/v1/admin/audit-log?date_from='.now()->subDay()->format('Y-m-d'))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/admin/audit-log?date_from='.now()->subDays(30)->format('Y-m-d'))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/admin/audit-log?date_from=2026-10-10&date_to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonPath('errors.date_to.0', 'Tanggal akhir tidak boleh sebelum tanggal awal.');
    }

    public function test_audit_log_rejects_unknown_actor_filter(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/audit-log?actor_user_id=99999')
            ->assertUnprocessable()
            ->assertJsonPath('errors.actor_user_id.0', 'Aktor tidak ditemukan.');
    }

    public function test_audit_log_is_paginated_twenty_per_page(): void
    {
        $this->actingAsAdmin();
        $actor = $this->admin();

        foreach (range(1, 21) as $index) {
            AuditLog::create([
                'actor_user_id' => $actor->id,
                'action' => 'user.login',
                'entity_type' => 'user',
                'entity_id' => $actor->id,
            ]);
        }

        $this->getJson('/api/v1/admin/audit-log')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 21)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_audit_log_metadata_never_contains_secrets(): void
    {
        $admin = $this->actingAsAdmin();

        $this->actingAsApplicant();
        $this->postJson('/api/v1/register', [
            'name' => 'Pemohon Uji Rahasia',
            'email' => 'rahasia-uji@example.com',
            'password' => 'kata-sandi-tersembunyi',
            'password_confirmation' => 'kata-sandi-tersembunyi',
            'applicant_type' => 'author',
        ])->assertCreated();

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/audit-log')->assertOk();

        $content = $response->getContent();

        $this->assertStringContainsString('user.registered', $content);
        $this->assertStringNotContainsString('kata-sandi-tersembunyi', $content);
        $this->assertStringNotContainsString('"password"', $content);
    }
}
