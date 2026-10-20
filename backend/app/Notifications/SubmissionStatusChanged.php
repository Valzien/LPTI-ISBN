<?php

namespace App\Notifications;

use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use Illuminate\Notifications\Notification;

/**
 * Notifikasi dalam aplikasi (kanal database) untuk setiap perubahan status
 * pengajuan (master prompt §5.8).
 *
 * Email bersifat opsional dan tidak diaktifkan secara default: fitur inti
 * tetap berjalan melalui notifikasi dasbor — pengguna melihat jumlah belum
 * dibaca dan halaman notifikasi.
 */
class SubmissionStatusChanged extends Notification
{
    public function __construct(
        public readonly BookSubmission $submission,
        public readonly SubmissionStatus $newStatus,
        public readonly ?string $note = null,
    ) {}

    /**
     * Kanal pengiriman: hanya database (dalam aplikasi).
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Muatan notifikasi yang disimpan di kolom `data`.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        [$title, $message] = $this->tulisPesan();

        return [
            'title' => $title,
            'message' => $message,
            'submission_id' => $this->submission->id,
            'submission_number' => $this->submission->submission_number,
            'status' => $this->newStatus->value,
            'status_label' => $this->newStatus->label(),
        ];
    }

    /**
     * Judul & isi pesan Bahasa Indonesia per status tujuan.
     *
     * @return array{0: string, 1: string}
     */
    private function tulisPesan(): array
    {
        $judul = $this->submission->title;
        $nomor = $this->submission->submission_number;

        return match ($this->newStatus) {
            SubmissionStatus::Draft => [
                'Pengajuan dibuat',
                'Pengajuan "'.$judul.'" ('.$nomor.') tersimpan sebagai draft. Lengkapi data & dokumen lalu ajukan.',
            ],
            SubmissionStatus::Submitted,
            SubmissionStatus::Resubmitted => [
                'Pengajuan baru menunggu pemeriksaan',
                'Pengajuan "'.$judul.'" ('.$nomor.') menunggu pemeriksaan verifikator.',
            ],
            SubmissionStatus::UnderReview => [
                'Pengajuan sedang diperiksa',
                'Pengajuan "'.$judul.'" ('.$nomor.') sedang berada dalam pemeriksaan verifikator.',
            ],
            SubmissionStatus::NeedsRevision => [
                'Pengajuan perlu direvisi',
                'Pengajuan "'.$judul.'" dikembalikan untuk direvisi. Catatan: '.($this->note ?? '-'),
            ],
            SubmissionStatus::ApprovedForProcessing => [
                'Pengajuan disetujui untuk diproses',
                'Pengajuan "'.$judul.'" disetujui untuk diproses. Nomor ISBN dicatat setelah sah ditetapkan pihak berwenang.',
            ],
            SubmissionStatus::Rejected => [
                'Pengajuan ditolak',
                'Pengajuan "'.$judul.'" ditolak. Alasan: '.($this->note ?? '-'),
            ],
            SubmissionStatus::IsbnAssigned => [
                'Nomor ISBN telah dicatat',
                'Nomor ISBN '.($this->submission->isbn_number ?? '-').' telah dicatat pada pengajuan "'.$judul.'".',
            ],
        };
    }
}
