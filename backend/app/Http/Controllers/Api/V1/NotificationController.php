<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/**
 * Notifikasi dalam aplikasi milik pengguna yang sedang login
 * (docs/API.md §3.3, master prompt §5.8).
 */
class NotificationController extends Controller
{
    use ApiResponse;

    /**
     * Daftar notifikasi milik sendiri — berpaginasi, opsional hanya yang
     * belum dibaca (`unread=1`).
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'unread' => ['nullable', 'boolean'],
        ], [
            'unread.boolean' => 'Filter belum dibaca tidak valid.',
        ]);

        $query = $request->user()->notifications();

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        $paginator = $query->paginate(15)->withQueryString();

        return $this->paginatedResponse(
            $paginator->through(
                fn (DatabaseNotification $notification) => new NotificationResource($notification),
            ),
        );
    }

    /**
     * Tandai satu notifikasi milik sendiri sebagai sudah dibaca
     * (notifikasi milik orang lain selalu 404).
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->first();

        if ($notification === null) {
            return $this->failResponse('Notifikasi tidak ditemukan.', 404);
        }

        if ($notification->read_at === null) {
            $notification->markAsRead();
        }

        return $this->successResponse(
            new NotificationResource($notification),
            'Notifikasi ditandai sudah dibaca.',
        );
    }

    /**
     * Tandai seluruh notifikasi milik sendiri sebagai sudah dibaca.
     */
    public function readAll(Request $request): JsonResponse
    {
        $diperbarui = $request->user()->unreadNotifications()->update([
            'read_at' => now(),
        ]);

        return $this->successResponse(
            ['marked' => $diperbarui],
            'Semua notifikasi ditandai sudah dibaca.',
        );
    }
}
