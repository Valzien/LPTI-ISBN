<?php

namespace App\Models;

use App\Enums\DocumentReviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmissionDocument extends Model
{
    /**
     * Attributes yang boleh diisi massal.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'review_status',
        'admin_note',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'review_status' => DocumentReviewStatus::class,
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(BookSubmission::class, 'book_submission_id');
    }

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(DocumentRequirement::class, 'document_requirement_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
