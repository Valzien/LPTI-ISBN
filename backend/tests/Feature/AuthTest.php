<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji endpoint autentikasi /api/v1 (register, login, me, update, logout)
 * beserta validasi, rate limit, dan audit log — Tahap 8.
 */
class AuthTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    private const REGISTER_PAYLOAD = [
        'name' => 'Calon Pemohon',
        'email' => 'calon@example.com',
        'password' => 'rahasia123',
        'password_confirmation' => 'rahasia123',
        'applicant_type' => 'author',
    ];

    public function test_register_creates_applicant_and_returns_working_token(): void
    {
        $response = $this->postJson('/api/v1/register', self::REGISTER_PAYLOAD);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'applicant')
            ->assertJsonPath('data.user.email', 'calon@example.com')
            ->assertJsonPath('meta.message', 'Registrasi berhasil.');

        $this->assertNotEmpty($response->json('data.token'));

        $user = User::query()->where('email', 'calon@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('rahasia123', $user->password));

        $this->withToken($response->json('data.token'))
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_register_always_forces_applicant_role_regardless_of_input(): void
    {
        $this->postJson('/api/v1/register', array_merge(self::REGISTER_PAYLOAD, [
            'role' => 'super_admin',
            'email_verified_at' => now()->toIso8601String(),
        ]))
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'applicant');

        $this->assertDatabaseHas('users', [
            'email' => 'calon@example.com',
            'role' => 'applicant',
        ]);
    }

    public function test_register_requires_publisher_name_for_publisher_representative(): void
    {
        $this->postJson('/api/v1/register', array_merge(self::REGISTER_PAYLOAD, [
            'applicant_type' => 'publisher_rep',
            'publisher_name' => null,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.publisher_name.0', 'Nama penerbit wajib diisi untuk perwakilan penerbit.');
    }

    public function test_register_rejects_duplicate_email_with_indonesian_message(): void
    {
        $this->applicant(['email' => 'calon@example.com']);

        $this->postJson('/api/v1/register', self::REGISTER_PAYLOAD)
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Email sudah terdaftar.');
    }

    public function test_register_is_rate_limited_to_three_requests_per_minute(): void
    {
        foreach (range(1, 3) as $index) {
            $this->postJson('/api/v1/register', array_merge(self::REGISTER_PAYLOAD, [
                'email' => 'calon'.$index.'@example.com',
            ]))->assertCreated();
        }

        $this->postJson('/api/v1/register', array_merge(self::REGISTER_PAYLOAD, [
            'email' => 'calon-keempat@example.com',
        ]))
            ->assertTooManyRequests()
            ->assertJsonPath('message', 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.');
    }

    public function test_register_writes_audit_log(): void
    {
        $this->postJson('/api/v1/register', self::REGISTER_PAYLOAD)->assertCreated();

        $user = User::query()->where('email', 'calon@example.com')->firstOrFail();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.registered',
            'actor_user_id' => $user->id,
            'entity_id' => $user->id,
        ]);
    }

    public function test_login_returns_token_and_user(): void
    {
        $user = $this->applicant();

        $response = $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('meta.message', 'Login berhasil.');

        $this->withToken($response->json('data.token'))
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.login',
            'actor_user_id' => $user->id,
        ]);
    }

    public function test_login_with_wrong_credentials_returns_401(): void
    {
        $user = $this->applicant();

        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'salah-banget',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Email atau password salah.');
    }

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $user = $this->applicant();

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/v1/login', [
                'email' => $user->email,
                'password' => 'salah-'.$attempt,
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'salah-lagi',
        ])
            ->assertTooManyRequests()
            ->assertJsonPath('message', 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan login kembali.');
    }

    public function test_me_never_exposes_secrets(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');
    }

    public function test_update_profile_updates_own_data_and_writes_audit_log(): void
    {
        $user = $this->actingAsApplicant();

        $this->putJson('/api/v1/me', [
            'name' => 'Nama Baru',
            'phone' => '0811111111',
            'applicant_type' => 'author',
            'address' => 'Jalan Baru No. 1',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('meta.message', 'Profil berhasil diperbarui.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Nama Baru',
            'phone' => '0811111111',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.profile_updated',
            'actor_user_id' => $user->id,
        ]);
    }

    public function test_update_profile_cannot_change_email_role_or_password(): void
    {
        $user = $this->actingAsApplicant();

        $this->putJson('/api/v1/me', [
            'name' => 'Nama Baru',
            'applicant_type' => 'author',
            'email' => 'baru@example.com',
            'role' => 'super_admin',
            'password' => 'password-baru-123',
        ])->assertOk();

        $user->refresh();

        $this->assertNotSame('baru@example.com', $user->email);
        $this->assertSame('applicant', $user->role->value);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_update_profile_requires_publisher_name_for_publisher_representative(): void
    {
        $this->actingAsApplicant();

        $this->putJson('/api/v1/me', [
            'name' => 'Nama Baru',
            'applicant_type' => 'publisher_rep',
            'publisher_name' => null,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.publisher_name.0', 'Nama penerbit wajib diisi untuk perwakilan penerbit.');
    }

    public function test_logout_revokes_only_current_token(): void
    {
        $user = $this->applicant();

        $first = $user->createToken('api')->plainTextToken;
        $second = $user->createToken('api')->plainTextToken;

        $this->withToken($first)
            ->postJson('/api/v1/logout')
            ->assertOk()
            ->assertJsonPath('meta.message', 'Berhasil logout.');

        $this->assertSame(1, $user->tokens()->count());

        $this->app['auth']->forgetGuards();

        $this->withToken($first)
            ->getJson('/api/v1/me')
            ->assertUnauthorized();

        $this->withToken($second)
            ->getJson('/api/v1/me')
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.logout',
            'actor_user_id' => $user->id,
        ]);
    }
}
