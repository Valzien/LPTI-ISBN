<?php

namespace App\Enums;

enum ApplicantType: string
{
    case Author = 'author';
    case PublisherRep = 'publisher_rep';

    /**
     * Label tampilan dalam Bahasa Indonesia.
     */
    public function label(): string
    {
        return match ($this) {
            self::Author => 'Penulis',
            self::PublisherRep => 'Perwakilan Penerbit',
        };
    }
}
