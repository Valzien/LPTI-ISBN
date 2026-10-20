<?php

namespace App\Http\Requests\Api\V1\Documents;

use App\Models\BookSubmission;
use App\Models\DocumentRequirement;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    private ?DocumentRequirement $requirement = null;

    /**
     * Urutan pemeriksaan:
     * 1. Pengajuan bukan milik sendiri → 404 (anti-enumeration).
     * 2. Status terkunci → 409 (konflik state; dokumen hanya saat
     *    Draft/Perlu Revisi).
     */
    public function authorize(): bool
    {
        $submission = $this->route('submission');

        abort_unless(
            $submission instanceof BookSubmission
                && $submission->user_id === $this->user()?->id,
            404,
        );

        abort_if(
            ! $submission->status->isEditable(),
            409,
            'Dokumen hanya dapat diunggah saat pengajuan berstatus Draft atau Perlu Revisi.',
        );

        return $this->user() !== null;
    }

    /**
     * Validasi mengikuti konfigurasi persyaratan dokumen yang dipilih
     * (allowed_mime_types & max_file_size dari tabel document_requirements).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $requirement = $this->requirement();

        $rules = [
            'document_requirement_id' => [
                'required',
                Rule::exists('document_requirements', 'id')->where('is_active', true),
            ],
            'file' => ['required', 'file'],
        ];

        if ($requirement !== null) {
            $rules['file'][] = 'max:'.intdiv($requirement->max_file_size, 1024);

            // mimetypes membaca KONTEN berkas (bukan ekstensi yang dikirim).
            $rules['file'][] = 'mimetypes:'.implode(',', $requirement->allowed_mime_types);
        } else {
            $rules['file'][] = 'max:4096';
        }

        return $rules;
    }

    /**
     * Pesan validasi Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $messages = [
            'document_requirement_id.required' => 'Jenis dokumen wajib dipilih.',
            'document_requirement_id.exists' => 'Jenis dokumen tidak valid atau sudah tidak aktif.',
            'file.required' => 'Berkas dokumen wajib diunggah.',
            'file.file' => 'Berkas tidak valid.',
            'file.mimetypes' => 'Tipe berkas tidak diizinkan untuk persyaratan dokumen ini.',
        ];

        $requirement = $this->requirement();

        if ($requirement !== null) {
            $messages['file.max'] = sprintf(
                'Ukuran berkas maksimal %s MB.',
                ceil($requirement->max_file_size / 1048576),
            );
        }

        return $messages;
    }

    /**
     * Ambil persyaratan dari input document_requirement_id (sekali query).
     */
    private function requirement(): ?DocumentRequirement
    {
        if ($this->requirement !== null) {
            return $this->requirement;
        }

        $id = (int) $this->input('document_requirement_id');

        if ($id <= 0) {
            return null;
        }

        return $this->requirement = DocumentRequirement::find($id);
    }
}
