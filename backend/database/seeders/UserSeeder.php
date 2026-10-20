<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Akun demo — semua data fiktif, password 'password' (master prompt §9:
 * jangan menggunakan data pribadi nyata pada seeder).
 */
class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::factory()->superAdmin()->create([
            'name' => 'Admin Utama LPTI',
            'email' => 'admin.utama@example.com',
        ]);

        User::factory()->admin()->create([
            'name' => 'Verifikator Satu',
            'email' => 'verifikator1@example.com',
        ]);

        User::factory()->admin()->create([
            'name' => 'Verifikator Dua',
            'email' => 'verifikator2@example.com',
        ]);

        User::factory()->create([
            'name' => 'Budi Santoso',
            'email' => 'pemohon1@example.com',
        ]);

        User::factory()->publisherRep()->create([
            'name' => 'Siti Rahayu',
            'email' => 'pemohon2@example.com',
        ]);

        User::factory()->create([
            'name' => 'Andi Wijaya',
            'email' => 'pemohon3@example.com',
        ]);
    }
}
