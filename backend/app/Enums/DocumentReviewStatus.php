<?php

namespace App\Enums;

enum DocumentReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /**
     * Label tampilan dalam Bahasa Indonesia.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu Pemeriksaan',
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
        };
    }
}
