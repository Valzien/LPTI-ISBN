<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentRequirementResource;
use App\Models\DocumentRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Daftar persyaratan dokumen AKTIF untuk form unggah pemohon.
 * (Kelolaan admin: CRUD /admin/document-requirements — Tahap 6.)
 */
class DocumentRequirementController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $requirements = DocumentRequirement::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return $this->successResponse(DocumentRequirementResource::collection($requirements));
    }
}
