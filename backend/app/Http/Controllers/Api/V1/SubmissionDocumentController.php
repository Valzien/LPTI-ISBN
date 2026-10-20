<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Documents\StoreDocumentRequest;
use App\Http\Resources\SubmissionDocumentResource;
use App\Models\BookSubmission;
use App\Models\DocumentRequirement;
use App\Models\SubmissionDocument;
use App\Services\AuditLogger;
use App\Services\SubmissionDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Unggah/hapus/preview dokumen pengajuan (docs/API.md §3.2).
 *
 * Berkas tersimpan disk privat dan hanya di-stream lewat endpoint ini
 * setelah otorisasi — tidak pernah diekspos sebagai URL publik.
 */
class SubmissionDocumentController extends Controller
{
    use ApiResponse;

    /** Disk privat yang sama dengan yang dipakai SubmissionDocumentService. */
    private const DISK = 'local';

    public function __construct(
        private readonly SubmissionDocumentService $documentService,
    ) {}

    /**
     * Unggah satu berkas untuk persyaratan dokumen tertentu —
     * hanya saat pengajuan draft/perlu revisi (409 bila terkunci).
     */
    public function store(StoreDocumentRequest $request, BookSubmission $submission): JsonResponse
    {
        $file = $request->file('file');

        if (! $file instanceof UploadedFile) {
            return $this->failResponse('Berkas dokumen wajib diunggah.', 422);
        }

        /** @var DocumentRequirement $requirement */
        $requirement = DocumentRequirement::findOrFail($request->validated('document_requirement_id'));

        $document = $this->documentService->store($file, $submission, $requirement, $request->user());

        AuditLogger::log($request->user(), 'document.uploaded', $document, [
            'document_requirement_id' => $requirement->id,
            'book_submission_id' => $submission->id,
            'file_size' => $document->file_size,
        ]);

        return $this->createdResponse(
            new SubmissionDocumentResource($document->load('requirement')),
            'Dokumen berhasil diunggah.',
        );
    }

    /**
     * Hapus satu dokumen — hanya saat pengajuan masih dapat diedit.
     */
    public function destroy(
        Request $request,
        BookSubmission $submission,
        SubmissionDocument $document,
    ): JsonResponse|Response {
        // Dokumen harus benar-benar milik pengajuan rute ini (bukan dicocokkan lewat ID lain).
        abort_unless(
            $submission->user_id === $request->user()->id
                && $document->book_submission_id === $submission->id,
            404,
        );

        if (! $submission->status->isEditable()) {
            return $this->failResponse(
                'Dokumen hanya dapat dihapus saat pengajuan berstatus Draft atau Perlu Revisi.',
                409,
            );
        }

        AuditLogger::log($request->user(), 'document.deleted', $document, [
            'book_submission_id' => $submission->id,
        ]);

        $this->documentService->delete($document);

        return response()->noContent();
    }

    /**
     * Stream isi dokumen milik sendiri (inline; di-stream ulang oleh proxy
     * Next.js untuk tampilan di browser pemohon).
     */
    public function preview(Request $request, SubmissionDocument $document): JsonResponse|StreamedResponse
    {
        abort_unless($document->submission->user_id === $request->user()->id, 404);

        $disk = Storage::disk(self::DISK);

        if (! $disk->exists($document->stored_path)) {
            return $this->failResponse('Berkas dokumen tidak ditemukan di penyimpanan.', 404);
        }

        return $disk->response($document->stored_path, $document->original_filename, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
