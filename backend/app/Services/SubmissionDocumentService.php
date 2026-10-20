<?php

namespace App\Services;

use App\Enums\DocumentReviewStatus;
use App\Models\BookSubmission;
use App\Models\DocumentRequirement;
use App\Models\SubmissionDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Penyimpanan dokumen pengajuan pada disk PRIVAT (storage/app/private).
 *
 * Berkas tidak pernah diekspos ke publik — hanya dapat diakses lewat
 * endpoint terotorisasi (docs/API.md §3.2 preview).
 */
class SubmissionDocumentService
{
    /** Disk privat Laravel; sesuaikan bila kelak memakai S3 (Tahap 9). */
    private const DISK = 'local';

    /**
     * Persyaratan aktif berstatus WAJIB yang belum diunggah pada pengajuan ini.
     *
     * @return Collection<int, DocumentRequirement>
     */
    public function missingRequiredRequirements(BookSubmission $submission): Collection
    {
        $uploadedIds = $submission->documents()
            ->pluck('document_requirement_id')
            ->filter()
            ->values();

        return DocumentRequirement::query()
            ->where('is_active', true)
            ->where('is_required', true)
            ->whereNotIn('id', $uploadedIds->all())
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /**
     * Simpan berkas ke disk privat lalu buat catatan dokumennya.
     */
    public function store(
        UploadedFile $file,
        BookSubmission $submission,
        DocumentRequirement $requirement,
        User $uploader,
    ): SubmissionDocument {
        $path = $file->store(sprintf('submissions/%d', $submission->id), self::DISK);

        if ($path === false) {
            throw new RuntimeException('Berkas gagal disimpan. Silakan coba lagi.');
        }

        // Kolom foreign key diisi eksplisit (konvensi model: tidak mass-assignable).
        $document = new SubmissionDocument([
            'original_filename' => Str::limit($file->getClientOriginalName(), 200, ''),
            'stored_path' => $path,
            'mime_type' => (string) $file->getMimeType(),
            'file_size' => (int) $file->getSize(),
            'review_status' => DocumentReviewStatus::Pending,
        ]);

        $document->book_submission_id = $submission->id;
        $document->document_requirement_id = $requirement->id;
        $document->uploaded_by = $uploader->id;
        $document->save();

        return $document;
    }

    /**
     * Hapus berkas + record satu dokumen.
     */
    public function delete(SubmissionDocument $document): void
    {
        Storage::disk(self::DISK)->delete($document->stored_path);

        $document->delete();
    }

    /**
     * Hapus seluruh berkas milik pengajuan (sebelum record-nya ter-cascade
     * saat pengajuan dihapus — mencegah file orphan).
     *
     * @return int jumlah berkas yang dihapus
     */
    public function deleteFilesFor(BookSubmission $submission): int
    {
        $deleted = 0;
        $disk = Storage::disk(self::DISK);

        foreach ($submission->documents()->pluck('stored_path') as $path) {
            if ($disk->delete($path)) {
                $deleted++;
            }
        }

        return $deleted;
    }
}
