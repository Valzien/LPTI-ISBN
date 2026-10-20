<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionStatusHistoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'previous_status' => $this->previous_status?->value,
            'previous_status_label' => $this->previous_status?->label(),
            'new_status' => $this->new_status->value,
            'new_status_label' => $this->new_status->label(),
            'note' => $this->note,
            'actor_name' => $this->actor?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
