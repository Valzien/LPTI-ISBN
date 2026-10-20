<?php

namespace App\Models;

use App\Enums\SubmissionStatus;
use Database\Factories\BookSubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookSubmission extends Model
{
    /** @use HasFactory<BookSubmissionFactory> */
    use HasFactory;

    /**
     * Attributes yang boleh diisi massal dari input pemohon.
     * Kolom status, nomor pengajuan, dan ISBN sengaja tidak di sini —
     * hanya diisi eksplisit oleh sistem/layanan yang berwenang.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'subtitle',
        'main_author',
        'additional_authors',
        'editor',
        'translator',
        'publisher_name',
        'planned_publication_year',
        'edition',
        'language',
        'publication_format',
        'synopsis',
        'page_count',
        'book_size',
        'notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SubmissionStatus::class,
            'planned_publication_year' => 'integer',
            'page_count' => 'integer',
            'isbn_assigned_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SubmissionDocument::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(SubmissionStatusHistory::class)->orderBy('created_at');
    }
}
