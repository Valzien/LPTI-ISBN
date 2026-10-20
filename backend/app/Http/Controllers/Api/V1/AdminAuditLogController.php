<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Log audit aktivitas sensitif (docs/API.md §3.4, master prompt §5.9).
 *
 * Menampilkan aktor, aksi, entitas, metadata aman, dan waktu — tanpa
 * password/token/isi dokumen (master prompt §9).
 */
class AdminAuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'actor_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ], [
            'action.max' => 'Aksi maksimal 100 karakter.',
            'actor_user_id.exists' => 'Aktor tidak ditemukan.',
            'date_from.date' => 'Tanggal awal tidak valid.',
            'date_to.date' => 'Tanggal akhir tidak valid.',
            'date_to.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
        ]);

        $paginator = AuditLog::query()
            ->with('actor')
            ->when($validated['action'] ?? null, function ($query, string $action): void {
                $query->where('action', $action);
            })
            ->when($validated['actor_user_id'] ?? null, function ($query, int $actorId): void {
                $query->where('actor_user_id', $actorId);
            })
            ->when($validated['date_from'] ?? null, function ($query, string $date): void {
                $query->whereDate('created_at', '>=', $date);
            })
            ->when($validated['date_to'] ?? null, function ($query, string $date): void {
                $query->whereDate('created_at', '<=', $date);
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return $this->paginatedResponse(
            $paginator->through(fn (AuditLog $log) => new AuditLogResource($log)),
        );
    }
}
