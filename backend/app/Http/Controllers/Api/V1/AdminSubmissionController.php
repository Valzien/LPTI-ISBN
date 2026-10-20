<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RecordIsbnRequest;
use App\Http\Requests\Admin\RejectSubmissionRequest;
use App\Http\Requests\Admin\RequestRevisionRequest;
use App\Http\Resources\BookSubmissionResource;
use App\Models\BookSubmission;
use App\Services\AuditLogger;
use App\Services\SubmissionStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

/**
 * Verifikasi pengajuan oleh admin/verifikator (docs/API.md §3.4).
 *
 * Seluruh perubahan status melewati SubmissionStatusService — peta transisi
 * tunggal di SubmissionStatus::allowedTransitions() (master prompt §4).
 */
class AdminSubmissionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SubmissionStatusService $statusService,
    ) {}

    /**
     * Seluruh pengajuan — filter status, q (judul/nomor/penulis/nama pemohon),
     * rentang tanggal, user_id; berpaginasi.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', new Enum(SubmissionStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ], [
            'status.enum' => 'Status tidak valid.',
            'q.max' => 'Kata kunci pencarian maksimal 100 karakter.',
            'date_from.date' => 'Tanggal awal tidak valid.',
            'date_to.date' => 'Tanggal akhir tidak valid.',
            'user_id.exists' => 'Pemohon tidak ditemukan.',
        ]);

        $query = BookSubmission::query()
            ->with('user')
            ->when($validated['status'] ?? null, function ($query, string $status) {
                $query->where('status', $status);
            })
            ->when($validated['q'] ?? null, function ($query, string $keyword) {
                $like = '%'.$keyword.'%';

                $query->where(function ($inner) use ($like) {
                    $inner->whereRaw('LOWER(title) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(submission_number) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(main_author) LIKE LOWER(?)', [$like])
                        ->orWhereHas('user', fn ($user) => $user->whereRaw('LOWER(name) LIKE LOWER(?)', [$like]));
                });
            })
            ->when($validated['date_from'] ?? null, function ($query, string $date) {
                $query->whereDate('created_at', '>=', $date);
            })
            ->when($validated['date_to'] ?? null, function ($query, string $date) {
                $query->whereDate('created_at', '<=', $date);
            })
            ->when($validated['user_id'] ?? null, function ($query, int $userId) {
                $query->where('user_id', $userId);
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        return $this->paginatedResponse(
            $query->through(fn (BookSubmission $submission) => new BookSubmissionResource($submission)),
        );
    }

    /**
     * Detail pengajuan: data buku, profil pemohon, dokumen, histori status.
     */
    public function show(BookSubmission $submission): JsonResponse
    {
        $submission->load([
            'user',
            'documents' => fn ($query) => $query->orderByDesc('created_at'),
            'documents.requirement',
            'statusHistories.actor',
        ]);

        return $this->successResponse(new BookSubmissionResource($submission));
    }

    /**
     * submitted/resubmitted → under_review (mulai pemeriksaan).
     */
    public function startReview(Request $request, BookSubmission $submission): JsonResponse
    {
        $target = SubmissionStatus::UnderReview;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Mulai verifikasi hanya dapat dilakukan dari status Diajukan atau Diajukan Ulang (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user())) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan masuk dalam pemeriksaan.',
        );
    }

    /**
     * under_review → needs_revision; catatan revisi WAJIB (dilihat pemohon).
     */
    public function requestRevision(RequestRevisionRequest $request, BookSubmission $submission): JsonResponse
    {
        $target = SubmissionStatus::NeedsRevision;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Permintaan revisi hanya dapat dilakukan dari status Dalam Verifikasi (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user(), $request->validated('note'))) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan dikembalikan ke pemohon untuk revisi.',
        );
    }

    /**
     * under_review → approved_for_processing (disetujui untuk diproses —
     * BUKAN berarti nomor ISBN resmi sudah terbit).
     */
    public function approve(Request $request, BookSubmission $submission): JsonResponse
    {
        $target = SubmissionStatus::ApprovedForProcessing;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Persetujuan hanya dapat dilakukan dari status Dalam Verifikasi (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user())) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan disetujui untuk diproses.',
        );
    }

    /**
     * under_review → rejected; alasan WAJIB (tersimpan di histori, dilihat pemohon).
     */
    public function reject(RejectSubmissionRequest $request, BookSubmission $submission): JsonResponse
    {
        $target = SubmissionStatus::Rejected;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Penolakan hanya dapat dilakukan dari status Dalam Verifikasi (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user(), $request->validated('reason'))) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan ditolak.',
        );
    }

    /**
     * approved_for_processing → isbn_assigned; mencatat nomor ISBN yang sudah
     * sah ditetapkan pihak berwenang — sistem TIDAK PERNAH menghasilkan
     * nomor ISBN sendiri (master prompt §2).
     */
    public function recordIsbn(RecordIsbnRequest $request, BookSubmission $submission): JsonResponse
    {
        $target = SubmissionStatus::IsbnAssigned;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Pencatatan ISBN hanya dapat dilakukan dari status Disetujui untuk Diproses (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        $validated = $request->safe()->all();

        // Kolom ISBN diisi eksplisit (tidak mass-assignable) lalu disimpan
        // bersamaan oleh transition() dalam satu UPDATE.
        $submission->isbn_number = $validated['isbn_number'];
        $submission->isbn_assigned_at = $validated['isbn_assigned_at'];
        $submission->isbn_source_note = $validated['isbn_source_note'];

        if (! $this->statusService->transition($submission, $target, $request->user())) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        AuditLogger::log($request->user(), 'submission.isbn_recorded', $submission, [
            'isbn_number' => $submission->isbn_number,
        ]);

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Nomor ISBN berhasil dicatat.',
        );
    }
}
