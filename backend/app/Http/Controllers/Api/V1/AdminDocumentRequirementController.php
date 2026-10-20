<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDocumentRequirementRequest;
use App\Http\Requests\Admin\UpdateDocumentRequirementRequest;
use App\Http\Resources\DocumentRequirementResource;
use App\Models\DocumentRequirement;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Kelola persyaratan dokumen (aktif/nonaktif, urutan, MIME & ukuran) —
 * docs/API.md §3.4. Persyaratan yang sudah dipakai dokumen pengajuan tidak
 * boleh dihapus; nonaktifkan saja agar riwayat tetap utuh.
 */
class AdminDocumentRequirementController extends Controller
{
    use ApiResponse;

    /**
     * Seluruh persyaratan (aktif & nonaktif), urut sesuai tampilan.
     */
    public function index(): JsonResponse
    {
        $requirements = DocumentRequirement::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return $this->successResponse(DocumentRequirementResource::collection($requirements));
    }

    public function store(StoreDocumentRequirementRequest $request): JsonResponse
    {
        $requirement = DocumentRequirement::create($request->validated());

        AuditLogger::log($request->user(), 'document_requirement.created', $requirement, [
            'name' => $requirement->name,
        ]);

        return $this->createdResponse(
            new DocumentRequirementResource($requirement),
            'Persyaratan dokumen berhasil dibuat.',
        );
    }

    public function update(UpdateDocumentRequirementRequest $request, DocumentRequirement $documentRequirement): JsonResponse
    {
        $documentRequirement->update($request->validated());

        AuditLogger::log($request->user(), 'document_requirement.updated', $documentRequirement, [
            'name' => $documentRequirement->name,
            'is_active' => $documentRequirement->is_active,
        ]);

        return $this->successResponse(
            new DocumentRequirementResource($documentRequirement),
            'Persyaratan dokumen berhasil diperbarui.',
        );
    }

    public function destroy(Request $request, DocumentRequirement $documentRequirement): JsonResponse|Response
    {
        if ($documentRequirement->documents()->exists()) {
            return $this->failResponse(
                'Persyaratan masih dipakai pada dokumen pengajuan — nonaktifkan alih-alih menghapus.',
                409,
            );
        }

        $nama = $documentRequirement->name;

        $documentRequirement->delete();

        AuditLogger::log($request->user(), 'document_requirement.deleted', null, [
            'name' => $nama,
        ]);

        return response()->noContent();
    }
}
