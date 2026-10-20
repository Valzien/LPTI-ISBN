<?php

namespace App\Services;

use App\Models\BookSubmission;
use Illuminate\Support\Facades\DB;

/**
 * Pembuat nomor pengajuan internal sistem.
 *
 * Format: LPTI-ISBN-<tahun>-<urutan 5 digit>, contoh LPTI-ISBN-2026-00001.
 * Nomor ini BUKAN nomor ISBN — hanya nomor registrasi pengajuan.
 */
class SubmissionNumberGenerator
{
    private const PREFIX = 'LPTI-ISBN';

    public function generate(): string
    {
        return DB::transaction(function () {
            $year = now()->year;
            $prefix = sprintf('%s-%d-', self::PREFIX, $year);

            $latest = BookSubmission::query()
                ->where('submission_number', 'like', $prefix.'%')
                ->orderByDesc('submission_number')
                ->lockForUpdate()
                ->value('submission_number');

            $sequence = $latest === null
                ? 1
                : ((int) substr($latest, strlen($prefix))) + 1;

            return $prefix.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
        });
    }
}
