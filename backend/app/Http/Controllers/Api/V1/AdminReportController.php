<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\BookSubmission;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan pengajuan untuk admin (docs/API.md §3.4, master prompt §5.9).
 *
 * Ekspor CSV sengaja HANYA memuat data yang diperlukan — tanpa URL dokumen
 * privat, email, catatan internal, atau kolom sensitif lain.
 */
class AdminReportController extends Controller
{
    use ApiResponse;

    /**
     * Ringkasan laporan: total & sebaran status untuk filter aktif.
     */
    public function submissions(Request $request): JsonResponse
    {
        $validated = $this->validatedFilters($request);

        $counts = $this->filteredQuery($validated)
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
            'generated_at' => now()->toIso8601String(),
            'filters' => [
                'status' => $validated['status'] ?? null,
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
            ],
            'total' => (int) $counts->sum(),
            'by_status' => $byStatus,
        ], 'Ringkasan laporan pengajuan.');
    }

    /**
     * Ekspor CSV (streaming) untuk filter yang sama dengan ringkasan.
     */
    public function submissionsCsv(Request $request): StreamedResponse
    {
        $validated = $this->validatedFilters($request);

        $query = $this->filteredQuery($validated)
            ->with('user')
            ->orderBy('id');

        AuditLogger::log($request->user(), 'report.exported', null, [
            'filters' => [
                'status' => $validated['status'] ?? null,
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
            ],
            'total' => (clone $query)->count(),
        ]);

        $namaBerkas = 'laporan-pengajuan-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($query): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            // BOM agar Excel membaca UTF-8 dengan benar.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Nomor Pengajuan',
                'Judul',
                'Subjudul',
                'Penulis Utama',
                'Penerbit',
                'Pemohon',
                'Status',
                'ISBN',
                'Tanggal Dibuat',
                'Diperbarui',
            ]);

            $query->chunkById(200, function ($rows) use ($out): void {
                foreach ($rows as $row) {
                    fputcsv($out, [
                        $row->submission_number,
                        $row->title,
                        $row->subtitle ?? '',
                        $row->main_author,
                        $row->publisher_name ?? '',
                        $row->user?->name ?? '',
                        $row->status->label(),
                        $row->isbn_number ?? '',
                        $row->created_at?->format('Y-m-d H:i'),
                        $row->updated_at?->format('Y-m-d H:i'),
                    ]);
                }
            });

            fclose($out);
        }, $namaBerkas, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'status' => ['nullable', new Enum(SubmissionStatus::class)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ], [
            'status.enum' => 'Status tidak valid.',
            'date_from.date' => 'Tanggal awal tidak valid.',
            'date_to.date' => 'Tanggal akhir tidak valid.',
            'date_to.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function filteredQuery(array $validated): Builder
    {
        return BookSubmission::query()
            ->when($validated['status'] ?? null, function (Builder $query, string $status): void {
                $query->where('status', $status);
            })
            ->when($validated['date_from'] ?? null, function (Builder $query, string $date): void {
                $query->whereDate('created_at', '>=', $date);
            })
            ->when($validated['date_to'] ?? null, function (Builder $query, string $date): void {
                $query->whereDate('created_at', '<=', $date);
            });
    }
}
