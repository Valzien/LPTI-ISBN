<?php

namespace App\Enums;

enum UserRole: string
{
    case Applicant = 'applicant';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';

    /**
     * Label tampilan dalam Bahasa Indonesia.
     */
    public function label(): string
    {
        return match ($this) {
            self::Applicant => 'Pemohon',
            self::Admin => 'Admin/Verifikator',
            self::SuperAdmin => 'Admin Utama',
        };
    }

    /**
     * Memiliki akses ke seluruh konten admin.
     */
    public function hasAdminPrivileges(): bool
    {
        return $this === self::Admin || $this === self::SuperAdmin;
    }
}
