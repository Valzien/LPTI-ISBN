<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookSubmissionResource;
use App\Models\BookSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Ringkasan dashboard admin (docs/API.md §3.4, master prompt §5.6).
 *
 * Seluruh angka dihitung langsung dari database — bukan angka dummy.
 */
class AdminDashboardController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        /** @var Collection<string, int> $counts jumlah per status */
        $counts = BookSubmission::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $jumlah = fn (SubmissionStatus $status): int => (int) ($counts[$status->value] ?? 0);

        $byStatus = collect(SubmissionStatus::cases())
            ->map(fn (SubmissionStatus $status): array => [
                'status' => $status->value,
                'label' => $status->label(),
                'total' => $jumlah($status),
            ])
            ->values();

        $recent = BookSubmission::query()
            ->with('user')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->take(10)
            ->get();

        return $this->successResponse([
            'total' => (int) $counts->sum(),
            'needs_check' => $jumlah(SubmissionStatus::Submitted) + $jumlah(SubmissionStatus::Resubmitted),
            'under_review' => $jumlah(SubmissionStatus::UnderReview),
            'needs_revision' => $jumlah(SubmissionStatus::NeedsRevision),
            'finished' => $jumlah(SubmissionStatus::IsbnAssigned) + $jumlah(SubmissionStatus::Rejected),
            'by_status' => $byStatus,
            'recent' => BookSubmissionResource::collection($recent),
        ]);
    }
}
