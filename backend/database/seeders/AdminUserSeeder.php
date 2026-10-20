<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Akun super_admin untuk produksi — dibuat dari environment, TANPA data demo.
 *
 * Idempoten: dilewati bila ADMIN_EMAIL/ADMIN_PASSWORD belum di-set, dan tidak
 * pernah menimpa akun yang sudah ada (password yang sudah diganti aman saat
 * container redeploy). Dipanggil docker/entrypoint.sh pada setiap start;
 * nilai dibaca dari environment proses sehingga tetap berfungsi walau
 * config di-cache (lihat docs/DEPLOYMENT.md).
 */
class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! is_string($email) || $email === '' || ! is_string($password) || $password === '') {
            return;
        }

        User::firstOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Admin Utama LPTI'),
                'password' => $password,
                'role' => UserRole::SuperAdmin->value,
            ],
        );
    }
}
