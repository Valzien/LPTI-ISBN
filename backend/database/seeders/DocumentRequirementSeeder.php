<?php

namespace Database\Seeders;

use App\Models\DocumentRequirement;
use Illuminate\Database\Seeder;

/**
 * Contoh daftar persyaratan dokumen — SEMUA nilai bersifat fiktif dan
 * harus disesuaikan admin mengikuti ketentuan resmi yang berlaku.
 */
class DocumentRequirementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lewati bila daftar persyaratan sudah terisi — seeder aman dijalankan
        // ulang oleh entrypoint container tiap deploy tanpa menduplikasi baris
        // dan tanpa menimpa konfigurasi yang sudah diedit admin di produksi.
        if (DocumentRequirement::query()->exists()) {
            return;
        }

        $requirements = [
            [
                'name' => 'KTP Penulis / Surat Keterangan Penerbit',
                'description' => 'Salinan KTP penulis utama atau surat keterangan resmi dari penerbit.',
                'allowed_mime_types' => ['application/pdf', 'image/jpeg', 'image/png'],
                'is_required' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Surat Pernyataan Keaslian Naskah',
                'description' => 'Surat pernyataan bahwa naskah merupakan karya asli dan bukan plagiarisme, ditandatangani penulis/penerbit.',
                'allowed_mime_types' => ['application/pdf', 'image/jpeg', 'image/png'],
                'is_required' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Sinopsis Buku',
                'description' => 'Ringkasan isi buku dalam satu hingga dua halaman.',
                'allowed_mime_types' => ['application/pdf'],
                'is_required' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Contoh Isi / Sampul Buku',
                'description' => 'Cuplikan halaman awal dan sampul buku dalam format PDF.',
                'allowed_mime_types' => ['application/pdf'],
                'is_required' => false,
                'sort_order' => 4,
            ],
        ];

        foreach ($requirements as $requirement) {
            DocumentRequirement::create([
                ...$requirement,
                'max_file_size' => 4194304, // 4 MB — batas aman unggah via Vercel (server action 4.2 MB, limit platform 4.5 MB)
                'is_active' => true,
            ]);
        }
    }
}
