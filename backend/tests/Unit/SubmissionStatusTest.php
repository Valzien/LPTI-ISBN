<?php

namespace Tests\Unit;

use App\Enums\SubmissionStatus;
use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

/**
 * Uji matriks transisi status pengajuan (master prompt §4).
 *
 * Peta transisi adalah satu-satunya sumber kebenaran perubahan status, jadi
 * unit test ini mengunci setiap sisi matriks: siapa yang boleh, ke mana saja,
 * dan status mana yang bersifat final.
 */
class SubmissionStatusTest extends TestCase
{
    public function test_applicant_can_submit_draft_and_resubmit_revision(): void
    {
        $this->assertTrue(SubmissionStatus::Draft->canTransitionTo(SubmissionStatus::Submitted, UserRole::Applicant));
        $this->assertTrue(SubmissionStatus::NeedsRevision->canTransitionTo(SubmissionStatus::Resubmitted, UserRole::Applicant));
    }

    public function test_applicant_cannot_perform_admin_transitions(): void
    {
        $this->assertFalse(SubmissionStatus::Draft->canTransitionTo(SubmissionStatus::UnderReview, UserRole::Applicant));
        $this->assertFalse(SubmissionStatus::Submitted->canTransitionTo(SubmissionStatus::UnderReview, UserRole::Applicant));
        $this->assertFalse(SubmissionStatus::Submitted->canTransitionTo(SubmissionStatus::Rejected, UserRole::Applicant));
        $this->assertFalse(SubmissionStatus::UnderReview->canTransitionTo(SubmissionStatus::ApprovedForProcessing, UserRole::Applicant));
        $this->assertFalse(SubmissionStatus::ApprovedForProcessing->canTransitionTo(SubmissionStatus::IsbnAssigned, UserRole::Applicant));
    }

    public function test_admin_can_review_and_decide_but_not_submit(): void
    {
        foreach ([UserRole::Admin, UserRole::SuperAdmin] as $role) {
            $this->assertTrue(SubmissionStatus::Submitted->canTransitionTo(SubmissionStatus::UnderReview, $role));
            $this->assertTrue(SubmissionStatus::Resubmitted->canTransitionTo(SubmissionStatus::UnderReview, $role));
            $this->assertTrue(SubmissionStatus::UnderReview->canTransitionTo(SubmissionStatus::NeedsRevision, $role));
            $this->assertTrue(SubmissionStatus::UnderReview->canTransitionTo(SubmissionStatus::ApprovedForProcessing, $role));
            $this->assertTrue(SubmissionStatus::UnderReview->canTransitionTo(SubmissionStatus::Rejected, $role));
            $this->assertTrue(SubmissionStatus::ApprovedForProcessing->canTransitionTo(SubmissionStatus::IsbnAssigned, $role));

            $this->assertFalse(SubmissionStatus::Draft->canTransitionTo(SubmissionStatus::Submitted, $role));
            $this->assertFalse(SubmissionStatus::NeedsRevision->canTransitionTo(SubmissionStatus::Resubmitted, $role));
        }
    }

    public function test_invalid_status_jumps_are_refused(): void
    {
        $this->assertFalse(SubmissionStatus::Draft->canTransitionTo(SubmissionStatus::ApprovedForProcessing, UserRole::Admin));
        $this->assertFalse(SubmissionStatus::Submitted->canTransitionTo(SubmissionStatus::ApprovedForProcessing, UserRole::Admin));
        $this->assertFalse(SubmissionStatus::Submitted->canTransitionTo(SubmissionStatus::IsbnAssigned, UserRole::Admin));
        $this->assertFalse(SubmissionStatus::Draft->canTransitionTo(SubmissionStatus::Draft, UserRole::Admin));
    }

    public function test_final_statuses_have_no_further_transitions(): void
    {
        foreach ([UserRole::Applicant, UserRole::Admin, UserRole::SuperAdmin] as $role) {
            foreach (SubmissionStatus::cases() as $target) {
                $this->assertFalse(SubmissionStatus::IsbnAssigned->canTransitionTo($target, $role));
                $this->assertFalse(SubmissionStatus::Rejected->canTransitionTo($target, $role));
            }
        }
    }

    public function test_only_draft_and_needs_revision_are_editable(): void
    {
        $this->assertTrue(SubmissionStatus::Draft->isEditable());
        $this->assertTrue(SubmissionStatus::NeedsRevision->isEditable());

        foreach ([
            SubmissionStatus::Submitted,
            SubmissionStatus::UnderReview,
            SubmissionStatus::Resubmitted,
            SubmissionStatus::ApprovedForProcessing,
            SubmissionStatus::IsbnAssigned,
            SubmissionStatus::Rejected,
        ] as $status) {
            $this->assertFalse($status->isEditable(), $status->value.' seharusnya terkunci.');
        }
    }

    public function test_every_status_has_indonesian_label(): void
    {
        $labels = [
            'draft' => 'Draft',
            'submitted' => 'Diajukan',
            'under_review' => 'Dalam Verifikasi',
            'needs_revision' => 'Perlu Revisi',
            'resubmitted' => 'Diajukan Ulang',
            'approved_for_processing' => 'Disetujui untuk Diproses',
            'isbn_assigned' => 'ISBN Ditetapkan',
            'rejected' => 'Ditolak',
        ];

        $this->assertCount(count($labels), SubmissionStatus::cases());

        foreach ($labels as $value => $label) {
            $this->assertSame($label, SubmissionStatus::from($value)->label());
        }
    }
}
