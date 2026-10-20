<?php

use App\Http\Controllers\Api\V1\AdminAuditLogController;
use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminDocumentController;
use App\Http\Controllers\Api\V1\AdminDocumentRequirementController;
use App\Http\Controllers\Api\V1\AdminReportController;
use App\Http\Controllers\Api\V1\AdminSubmissionController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DocumentRequirementController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SubmissionController;
use App\Http\Controllers\Api\V1\SubmissionDocumentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — prefix /api/v1 (docs/API.md)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::put('me', [AuthController::class, 'update']);
        Route::post('logout', [AuthController::class, 'logout']);

        // Pengajuan & dokumen (docs/API.md §3.2 — Tahap 5).
        Route::get('document-requirements', [DocumentRequirementController::class, 'index']);

        Route::get('submissions', [SubmissionController::class, 'index']);
        Route::get('submissions/stats', [SubmissionController::class, 'stats']);
        Route::post('submissions', [SubmissionController::class, 'store']);
        Route::get('submissions/{submission}', [SubmissionController::class, 'show']);
        Route::put('submissions/{submission}', [SubmissionController::class, 'update']);
        Route::delete('submissions/{submission}', [SubmissionController::class, 'destroy']);
        Route::post('submissions/{submission}/submit', [SubmissionController::class, 'submit']);
        Route::post('submissions/{submission}/resubmit', [SubmissionController::class, 'resubmit']);
        Route::get('submissions/{submission}/history', [SubmissionController::class, 'history']);
        Route::post('submissions/{submission}/documents', [SubmissionDocumentController::class, 'store']);
        Route::delete('submissions/{submission}/documents/{document}', [SubmissionDocumentController::class, 'destroy']);
        Route::get('documents/{document}/preview', [SubmissionDocumentController::class, 'preview']);

        // Notifikasi dalam aplikasi (docs/API.md §3.3 — Tahap 7).
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::patch('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead']);

        // Verifikasi admin (docs/API.md §3.4 — Tahap 6): wajib role admin.
        Route::prefix('admin')->middleware('admin')->group(function () {
            Route::get('dashboard', [AdminDashboardController::class, 'index']);
            Route::get('submissions', [AdminSubmissionController::class, 'index']);
            Route::get('submissions/{submission}', [AdminSubmissionController::class, 'show']);
            Route::post('submissions/{submission}/start-review', [AdminSubmissionController::class, 'startReview']);
            Route::post('submissions/{submission}/request-revision', [AdminSubmissionController::class, 'requestRevision']);
            Route::post('submissions/{submission}/approve', [AdminSubmissionController::class, 'approve']);
            Route::post('submissions/{submission}/reject', [AdminSubmissionController::class, 'reject']);
            Route::post('submissions/{submission}/record-isbn', [AdminSubmissionController::class, 'recordIsbn']);
            Route::patch('documents/{document}/review', [AdminDocumentController::class, 'review']);
            Route::get('documents/{document}/download', [AdminDocumentController::class, 'download']);

            // Notifikasi, laporan, audit, pemohon, persyaratan & akun
            // (docs/API.md §3.4 — Tahap 7).
            Route::get('pemohon', [AdminUserController::class, 'applicants']);
            Route::get('reports/submissions', [AdminReportController::class, 'submissions']);
            Route::get('reports/submissions.csv', [AdminReportController::class, 'submissionsCsv']);
            Route::get('audit-log', [AdminAuditLogController::class, 'index']);
            Route::apiResource('document-requirements', AdminDocumentRequirementController::class)
                ->except(['show']);
            Route::apiResource('users', AdminUserController::class)
                ->only(['index', 'store', 'show', 'update', 'destroy'])
                ->middleware('super_admin');
        });
    });
});
