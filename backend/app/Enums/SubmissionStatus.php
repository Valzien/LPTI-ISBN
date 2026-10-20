<?php

namespace App\Enums;

/**
 * Status pengajuan ISBN dan peta transisi yang sah.
 *
 * Peta transisi di bawah adalah SATU-SATUNYA sumber kebenaran untuk
 * mengubah status pengajuan (master prompt §4: admin tidak boleh
 * mengubah status secara sembarangan; validasi transisi di backend).
 */
enum SubmissionStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case NeedsRevision = 'needs_revision';
    case Resubmitted = 'resubmitted';
    case ApprovedForProcessing = 'approved_for_processing';
    case IsbnAssigned = 'isbn_assigned';
    case Rejected = 'rejected';

    /**
     * Label tampilan dalam Bahasa Indonesia.
     */
    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Diajukan',
            self::UnderReview => 'Dalam Verifikasi',
            self::NeedsRevision => 'Perlu Revisi',
            self::Resubmitted => 'Diajukan Ulang',
            self::ApprovedForProcessing => 'Disetujui untuk Diproses',
            self::IsbnAssigned => 'ISBN Ditetapkan',
            self::Rejected => 'Ditolak',
        };
    }

    /**
     * Status yang boleh diedit langsung oleh pemohon.
     *
     * @return array<int, self>
     */
    public static function editableStatuses(): array
    {
        return [self::Draft, self::NeedsRevision];
    }

    public function isEditable(): bool
    {
        return in_array($this, self::editableStatuses(), true);
    }

    public function isTerminal(): bool
    {
        return $this === self::IsbnAssigned || $this === self::Rejected;
    }

    /**
     * Peta transisi yang sah beserta peran yang boleh melakukannya.
     *
     * @return array<string, array<int, UserRole>>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [
                self::Submitted->value => [UserRole::Applicant],
            ],
            self::Submitted => [
                self::UnderReview->value => [UserRole::Admin, UserRole::SuperAdmin],
            ],
            self::UnderReview => [
                self::NeedsRevision->value => [UserRole::Admin, UserRole::SuperAdmin],
                self::ApprovedForProcessing->value => [UserRole::Admin, UserRole::SuperAdmin],
                self::Rejected->value => [UserRole::Admin, UserRole::SuperAdmin],
            ],
            self::NeedsRevision => [
                self::Resubmitted->value => [UserRole::Applicant],
            ],
            self::Resubmitted => [
                self::UnderReview->value => [UserRole::Admin, UserRole::SuperAdmin],
            ],
            self::ApprovedForProcessing => [
                self::IsbnAssigned->value => [UserRole::Admin, UserRole::SuperAdmin],
            ],
            self::IsbnAssigned, self::Rejected => [],
        };
    }

    /**
     * Apakah transisi dari status ini ke $target sah untuk peran $actorRole?
     */
    public function canTransitionTo(self $target, UserRole $actorRole): bool
    {
        $allowedRoles = $this->allowedTransitions()[$target->value] ?? [];

        return in_array($actorRole, $allowedRoles, true);
    }
}
