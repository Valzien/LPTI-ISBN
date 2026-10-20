<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewDocumentRequest;
use App\Http\Resources\SubmissionDocumentResource;
use App\Models\SubmissionDocument;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Pemeriksaan & unduhan dokumen oleh admin (docs/API.md §3.4).
 *
 * Berkas tetap pada disk privat — hanya di-stream lewat endpoint ini
 * setelah otorisasi, tidak pernah menjadi URL publik.
 */
class AdminDocumentController extends Controller
{
    use ApiResponse;

    /** Disk privat yang sama dengan SubmissionDocumentService. */
    private const DISK = 'local';

    /**
     * Set hasil pemeriksaan satu dokumen (review_status + catatan admin).
     */
    public function review(ReviewDocumentRequest $request, SubmissionDocument $document): JsonResponse
    {
        $document->fill($request->safe()->all());
        $document->save();

        AuditLogger::log($request->user(), 'document.reviewed', $document, [
            'review_status' => $document->review_status->value,
            'book_submission_id' => $document->book_submission_id,
        ]);

        return $this->successResponse(
            new SubmissionDocumentResource($document->load('requirement')),
            'Hasil pemeriksaan dokumen disimpan.',
        );
    }

    /**
     * Stream dokumen sebagai unduhan terotorisasi (disposition attachment).
     */
    public function download(Request $request, SubmissionDocument $document): JsonResponse|StreamedResponse
    {
        $disk = Storage::disk(self::DISK);

        if (! $disk->exists($document->stored_path)) {
            return $this->failResponse('Berkas dokumen tidak ditemukan di penyimpanan.', 404);
        }

        AuditLogger::log($request->user(), 'document.downloaded', $document, [
            'book_submission_id' => $document->book_submission_id,
        ]);

        return $disk->response(
            $document->stored_path,
            $document->original_filename,
            [
                'Content-Type' => $document->mime_type,
                'X-Content-Type-Options' => 'nosniff',
            ],
            'attachment',
        );
    }
}
