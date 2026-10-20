<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Notifikasi dalam aplikasi (tabel `notifications`, kanal database).
 * Hanya memaparkan kolom aman — nama kelas PHP internal tidak diikutsertakan.
 */
class NotificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $data */
        $data = $this->data;

        return [
            'id' => $this->id,
            'title' => $data['title'] ?? null,
            'message' => $data['message'] ?? null,
            'submission_id' => $data['submission_id'] ?? null,
            'submission_number' => $data['submission_number'] ?? null,
            'status' => $data['status'] ?? null,
            'status_label' => $data['status_label'] ?? null,
            'is_read' => $this->read_at !== null,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
