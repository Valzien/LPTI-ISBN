<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

/**
 * Pencatat aktivitas sensitif ke tabel audit_logs.
 *
 * Dilarang menyimpan password, token, atau isi dokumen di metadata
 * (master prompt §9).
 */
class AuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata  hanya data aman (id, status lama/baru, dsb.)
     */
    public static function log(
        ?User $actor,
        string $action,
        ?Model $entity = null,
        array $metadata = [],
    ): AuditLog {
        return AuditLog::create([
            'actor_user_id' => $actor?->getKey(),
            'action' => $action,
            'entity_type' => $entity?->getMorphClass(),
            'entity_id' => $entity?->getKey(),
            'metadata' => $metadata === [] ? null : $metadata,
            'ip_address' => Request::ip(),
        ]);
    }
}
