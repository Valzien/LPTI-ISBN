<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookSubmissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Relasi (user, documents, status_histories) hanya muncul bila sudah
     * di-eager-load oleh controller — mencegah query N+1.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'submission_number' => $this->submission_number,
            'user_id' => $this->user_id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_editable' => $this->status->isEditable(),
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'main_author' => $this->main_author,
            'additional_authors' => $this->additional_authors,
            'editor' => $this->editor,
            'translator' => $this->translator,
            'publisher_name' => $this->publisher_name,
            'planned_publication_year' => $this->planned_publication_year,
            'edition' => $this->edition,
            'language' => $this->language,
            'publication_format' => $this->publication_format,
            'synopsis' => $this->synopsis,
            'page_count' => $this->page_count,
            'book_size' => $this->book_size,
            'notes' => $this->notes,
            'isbn_number' => $this->isbn_number,
            'isbn_assigned_at' => $this->isbn_assigned_at?->toIso8601String(),
            'isbn_source_note' => $this->isbn_source_note,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'user' => new UserResource($this->whenLoaded('user')),
            'documents' => SubmissionDocumentResource::collection($this->whenLoaded('documents')),
            'status_histories' => SubmissionStatusHistoryResource::collection($this->whenLoaded('statusHistories')),
        ];
    }
}
