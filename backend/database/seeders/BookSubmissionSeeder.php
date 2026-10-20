<?php

namespace Database\Seeders;

use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Contoh pengajuan fiktif per status untuk pratinjau dashboard.
 * Riwayat status dibuat mengikuti peta transisi resmi (SubmissionStatus).
 */
class BookSubmissionSeeder extends Seeder
{
    /**
     * Rantai langkah [status_baru, aktor_pemohon?, catatan?] menuju status akhir.
     *
     * @var array<string, array<int, array{0: SubmissionStatus, 1: bool, 2?: string}>>
     */
    private const CHAINS = [
        'draft' => [],
        'submitted' => [
            [SubmissionStatus::Submitted, true, null],
        ],
        'under_review' => [
            [SubmissionStatus::Submitted, true, null],
            [SubmissionStatus::UnderReview, false, 'Berkas sedang diperiksa oleh verifikator.'],
        ],
        'needs_revision' => [
            [SubmissionStatus::Submitted, true, null],
            [SubmissionStatus::UnderReview, false, null],
            [SubmissionStatus::NeedsRevision, false, 'Sinopsis belum memuat ringkasan tiap bab. Mohon lengkapi.'],
        ],
        'approved_for_processing' => [
            [SubmissionStatus::Submitted, true, null],
            [SubmissionStatus::UnderReview, false, null],
            [SubmissionStatus::ApprovedForProcessing, false, 'Kelengkapan data dan dokumen sudah sesuai.'],
        ],
        'isbn_assigned' => [
            [SubmissionStatus::Submitted, true, null],
            [SubmissionStatus::UnderReview, false, null],
            [SubmissionStatus::ApprovedForProcessing, false, null],
            [SubmissionStatus::IsbnAssigned, false, 'Nomor ISBN diterima dari pihak berwenang.'],
        ],
        'rejected' => [
            [SubmissionStatus::Submitted, true, null],
            [SubmissionStatus::UnderReview, false, null],
            [SubmissionStatus::Rejected, false, 'Naskah di luar lingkup pendaftaran ISBN.'],
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $applicants = User::where('role', 'applicant')->get();
        $admin = User::where('role', 'admin')->firstOrFail();

        $isbnSequence = 1;

        foreach (self::CHAINS as $finalStatus => $chain) {
            $applicant = $applicants->random();

            $submission = BookSubmission::factory()->withStatus(SubmissionStatus::from($finalStatus))->create([
                'user_id' => $applicant->id,
            ]);

            $previous = null;

            foreach ($chain as [$newStatus, $byApplicant, $note]) {
                $submission->statusHistories()->create([
                    'actor_user_id' => $byApplicant ? $applicant->id : $admin->id,
                    'previous_status' => $previous,
                    'new_status' => $newStatus->value,
                    'note' => $note,
                ]);

                $previous = $newStatus->value;
            }

            if ($submission->status === SubmissionStatus::IsbnAssigned) {
                $submission->update([
                    'isbn_number' => sprintf('978-602-000000-%d', $isbnSequence++),
                    'isbn_assigned_at' => now(),
                    'isbn_source_note' => 'Dicatat dari surat penetapan yang diterima admin (contoh fiktif).',
                ]);
            }
        }
    }
}
