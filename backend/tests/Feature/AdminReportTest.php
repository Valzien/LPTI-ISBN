<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithApi;
use Tests\TestCase;

/**
 * Uji laporan admin: ringkasan, filter tanggal/status, ekspor CSV privat,
 * validasi, otorisasi, dan pencatatan audit ekspor — Tahap 8.
 */
class AdminReportTest extends TestCase
{
    use InteractsWithApi, RefreshDatabase;

    public function test_summary_counts_every_submission_not_only_own(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();

        $this->submissionFor($owner, SubmissionStatus::Draft);
        $this->submissionFor($owner, SubmissionStatus::Submitted);
        $this->submissionFor($this->admin(), SubmissionStatus::Rejected);

        $response = $this->getJson('/api/v1/admin/reports/submissions')->assertOk();

        $this->assertSame(3, $response->json('data.total'));
        $this->assertCount(8, $response->json('data.by_status'));
        $this->assertSame('Ringkasan laporan pengajuan.', $response->json('meta.message'));

        $totals = collect($response->json('data.by_status'))->pluck('total', 'status');
        $this->assertSame(1, $totals['draft']);
        $this->assertSame(1, $totals['submitted']);
        $this->assertSame(1, $totals['rejected']);
    }

    public function test_summary_applies_status_and_date_filters(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();

        $this->submissionFor($owner, SubmissionStatus::Draft, [
            'created_at' => now()->subDays(10),
        ]);
        $this->submissionFor($owner, SubmissionStatus::Submitted);

        $this->getJson('/api/v1/admin/reports/submissions?status=submitted')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/v1/admin/reports/submissions?date_from='.now()->subDay()->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/v1/admin/reports/submissions?date_to='.now()->subDays(5)->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('data.total', 1);
    }

    public function test_summary_rejects_invalid_filter_combinations(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/reports/submissions?status=bukan-status')
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'Status tidak valid.');

        $this->getJson('/api/v1/admin/reports/submissions?date_from=2026-10-10&date_to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonPath('errors.date_to.0', 'Tanggal akhir tidak boleh sebelum tanggal awal.');
    }

    public function test_report_endpoints_are_admin_only(): void
    {
        $this->actingAsApplicant();

        $this->getJson('/api/v1/admin/reports/submissions')->assertForbidden();

        $this->get('/api/v1/admin/reports/submissions.csv')->assertForbidden();
    }

    public function test_csv_export_downloads_filtered_rows_as_utf8_csv(): void
    {
        $this->actingAsAdmin();
        Storage::fake('local');

        $owner = $this->applicant();
        $inScope = $this->submissionFor($owner, SubmissionStatus::Draft, [
            'title' => 'Judul Dengan Koma, Serta Tanda "Petik"',
        ]);
        $this->submissionFor($owner, SubmissionStatus::Submitted, [
            'title' => 'Tidak Ikut Ekspor',
        ]);

        $response = $this->get('/api/v1/admin/reports/submissions.csv?status=draft');

        $response->assertOk()
            ->assertDownload('laporan-pengajuan-'.now()->format('Y-m-d').'.csv')
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('Nomor Pengajuan', $content);
        $this->assertStringContainsString($inScope->submission_number, $content);
        $this->assertStringContainsString('Judul Dengan Koma', $content);
        $this->assertStringContainsString($owner->name, $content);
        $this->assertStringNotContainsString('Tidak Ikut Ekspor', $content);
        $this->assertSame(1, substr_count($content, "\n") - 1);
    }

    public function test_csv_export_never_leaks_private_or_sensitive_columns(): void
    {
        $this->actingAsAdmin();
        Storage::fake('local');

        $owner = $this->applicant(['address' => 'Jalan Rahasia Nomor 42']);
        $submission = $this->submissionFor($owner, SubmissionStatus::ApprovedForProcessing, [
            'isbn_number' => null,
            'synopsis' => 'Sinopsis internal yang tidak perlu ikut ekspor.',
            'notes' => 'Catatan internal pemohon.',
        ]);
        $document = $this->documentFor($submission, $this->pdfRequirement());

        $content = $this->get('/api/v1/admin/reports/submissions.csv')->streamedContent();

        $this->assertStringContainsString($submission->submission_number, $content);
        $this->assertStringNotContainsString($owner->email, $content);
        $this->assertStringNotContainsString('Jalan Rahasia', $content);
        $this->assertStringNotContainsString($document->stored_path, $content);
        $this->assertStringNotContainsString('Sinopsis internal', $content);
        $this->assertStringNotContainsString('Catatan internal pemohon', $content);
    }

    public function test_csv_export_writes_audit_log_with_filters(): void
    {
        $admin = $this->actingAsAdmin();
        $this->submissionFor($this->applicant(), SubmissionStatus::Draft);

        $this->get('/api/v1/admin/reports/submissions.csv?status=draft&date_from=2026-01-01')->assertOk();

        $audit = AuditLog::query()->where('action', 'report.exported')->firstOrFail();

        $this->assertSame($admin->id, $audit->actor_user_id);
        $this->assertSame('draft', $audit->metadata['filters']['status']);
        $this->assertSame('2026-01-01', $audit->metadata['filters']['date_from']);
        $this->assertSame(1, $audit->metadata['total']);
    }

    public function test_summary_and_csv_share_the_same_filter_semantics(): void
    {
        $this->actingAsAdmin();
        $owner = $this->applicant();

        foreach (SubmissionStatus::cases() as $index => $status) {
            $this->submissionFor($owner, $status, ['created_at' => now()->subDays($index)]);
        }

        $dateFrom = now()->subDays(2)->format('Y-m-d');

        $summary = $this->getJson('/api/v1/admin/reports/submissions?date_from='.$dateFrom)
            ->assertOk()
            ->json();

        $rows = $this->get('/api/v1/admin/reports/submissions.csv?date_from='.$dateFrom)->streamedContent();

        $this->assertSame(3, $summary['data']['total']);
        $this->assertSame(3, substr_count($rows, "\n") - 1);
    }
}
