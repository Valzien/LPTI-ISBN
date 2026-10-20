<?php

namespace App\Models;

use App\Enums\SubmissionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmissionStatusHistory extends Model
{
    public const UPDATED_AT = null;

    /**
     * Attributes yang boleh diisi massal.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'previous_status',
        'new_status',
        'note',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'previous_status' => SubmissionStatus::class,
            'new_status' => SubmissionStatus::class,
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(BookSubmission::class, 'book_submission_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
