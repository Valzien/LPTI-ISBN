<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'phone' => $this->phone,
            'applicant_type' => $this->applicant_type?->value,
            'applicant_type_label' => $this->applicant_type?->label(),
            'publisher_name' => $this->publisher_name,
            'address' => $this->address,
            'submissions_count' => $this->when(
                array_key_exists('submissions_count', $this->resource->getAttributes()),
                fn () => (int) $this->resource->submissions_count,
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
