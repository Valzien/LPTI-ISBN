<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Submissions\StoreSubmissionRequest;
use App\Http\Requests\Api\V1\Submissions\UpdateSubmissionRequest;
use App\Http\Resources\BookSubmissionResource;
use App\Http\Resources\SubmissionStatusHistoryResource;
use App\Models\BookSubmission;
use App\Services\AuditLogger;
use App\Services\SubmissionDocumentService;
use App\Services\SubmissionNumberGenerator;
use App\Services\SubmissionStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Enum;

/**
 * Pengajuan buku milik pemohon (docs/API.md §3.2).
 *
 * Seluruh endpoint menerapkan anti-enumeration: pengajuan milik orang lain
 * selalu membalas 404, bukan 403.
 */
class SubmissionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SubmissionStatusService $statusService,
        private readonly SubmissionDocumentService $documentService,
        private readonly SubmissionNumberGenerator $numberGenerator,
    ) {}

    /**
     * Daftar pengajuan milik sendiri — filter status, q (judul/nomor/penulis),
     * rentang tanggal; berpaginasi.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', new Enum(SubmissionStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ], [
            'status.enum' => 'Status tidak valid.',
            'q.max' => 'Kata kunci pencarian maksimal 100 karakter.',
            'date_from.date' => 'Tanggal awal tidak valid.',
            'date_to.date' => 'Tanggal akhir tidak valid.',
        ]);

        $query = BookSubmission::query()
            ->where('user_id', $request->user()->id)
            ->when($validated['status'] ?? null, function ($query, string $status) {
                $query->where('status', $status);
            })
            ->when($validated['q'] ?? null, function ($query, string $keyword) {
                $like = '%'.$keyword.'%';

                $query->where(function ($inner) use ($like) {
                    $inner->whereRaw('LOWER(title) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(submission_number) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(main_author) LIKE LOWER(?)', [$like]);
                });
            })
            ->when($validated['date_from'] ?? null, function ($query, string $date) {
                $query->whereDate('created_at', '>=', $date);
            })
            ->when($validated['date_to'] ?? null, function ($query, string $date) {
                $query->whereDate('created_at', '<=', $date);
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
     * Ringkasan pengajuan milik sendiri untuk dashboard pemohon
     * (master prompt §5.5): jumlah per status + notifikasi belum dibaca.
     */
    public function stats(Request $request): JsonResponse
    {
        $counts = BookSubmission::query()
            ->where('user_id', $request->user()->id)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byStatus = collect(SubmissionStatus::cases())
            ->map(fn (SubmissionStatus $status): array => [
                'status' => $status->value,
                'label' => $status->label(),
                'total' => (int) ($counts[$status->value] ?? 0),
            ])
            ->values();

        return $this->successResponse([
            'total' => (int) $counts->sum(),
            'by_status' => $byStatus,
            'unread_notifications' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Buat pengajuan baru: status draft + nomor pengajuan digenerate sistem.
     */
    public function store(StoreSubmissionRequest $request): JsonResponse
    {
        $validated = $request->safe()->all();

        $submission = DB::transaction(function () use ($request, $validated) {
            // Status & submission_number di-set eksplisit — tidak mass-assignable.
            $submission = new BookSubmission($validated);
            $submission->user_id = $request->user()->id;
            $submission->status = SubmissionStatus::Draft;
            $submission->submission_number = $this->numberGenerator->generate();
            $submission->save();

            $this->statusService->recordInitial($submission, $request->user());

            return $submission;
        });

        AuditLogger::log($request->user(), 'submission.created', $submission);

        return $this->createdResponse(new BookSubmissionResource($submission), 'Pengajuan berhasil dibuat.');
    }

    /**
     * Detail pengajuan milik sendiri lengkap dengan dokumen & histori status.
     */
    public function show(Request $request, BookSubmission $submission): JsonResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 404);

        $submission->load([
            'documents' => fn ($query) => $query->orderByDesc('created_at'),
            'documents.requirement',
            'statusHistories.actor',
        ]);

        return $this->successResponse(new BookSubmissionResource($submission));
    }

    /**
     * Ubah data buku — hanya saat draft/perlu revisi (409 bila terkunci;
     * 404 bila bukan milik — ditangani UpdateSubmissionRequest::authorize()).
     */
    public function update(UpdateSubmissionRequest $request, BookSubmission $submission): JsonResponse
    {
        $submission->update($request->safe()->all());

        AuditLogger::log($request->user(), 'submission.updated', $submission);

        return $this->successResponse(new BookSubmissionResource($submission), 'Pengajuan berhasil diperbarui.');
    }

    /**
     * Hapus pengajuan — hanya status draft (hard delete + seluruh berkas dokumen).
     */
    public function destroy(Request $request, BookSubmission $submission): JsonResponse|Response
    {
        abort_unless($submission->user_id === $request->user()->id, 404);

        if ($submission->status !== SubmissionStatus::Draft) {
            return $this->failResponse('Hanya pengajuan berstatus Draft yang dapat dihapus.', 409);
        }

        AuditLogger::log($request->user(), 'submission.deleted', $submission);

        $this->documentService->deleteFilesFor($submission);
        $submission->delete();

        return response()->noContent();
    }

    /**
     * Ajukan draft → submitted; 422 bila dokumen wajib belum lengkap.
     */
    public function submit(Request $request, BookSubmission $submission): JsonResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 404);

        $target = SubmissionStatus::Submitted;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Pengajuan hanya dapat diajukan dari status Draft (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        $missing = $this->documentService->missingRequiredRequirements($submission);

        if ($missing->isNotEmpty()) {
            $names = $missing->pluck('name');

            return $this->failResponse(
                'Dokumen wajib belum lengkap: '.$names->implode(', ').'.',
                422,
                ['documents' => $names->all()],
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user())) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan berhasil diajukan dan menunggu verifikasi admin.',
        );
    }

    /**
     * Ajukan ulang needs_revision → resubmitted.
     */
    public function resubmit(Request $request, BookSubmission $submission): JsonResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 404);

        $target = SubmissionStatus::Resubmitted;

        if (! $submission->status->canTransitionTo($target, $request->user()->role)) {
            return $this->failResponse(
                'Pengajuan hanya dapat diajukan ulang dari status Perlu Revisi (status saat ini: '.$submission->status->label().').',
                403,
            );
        }

        if (! $this->statusService->transition($submission, $target, $request->user())) {
            return $this->failResponse('Transisi status tidak diizinkan.', 403);
        }

        return $this->successResponse(
            new BookSubmissionResource($submission),
            'Pengajuan berhasil diajukan ulang.',
        );
    }

    /**
     * Riwayat status (timeline) pengajuan milik sendiri.
     */
    public function history(Request $request, BookSubmission $submission): JsonResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 404);

        return $this->successResponse(
            SubmissionStatusHistoryResource::collection(
                $submission->statusHistories()->with('actor')->get(),
            ),
        );
    }
}
