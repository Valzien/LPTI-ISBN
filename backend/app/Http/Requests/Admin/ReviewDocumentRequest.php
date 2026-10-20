<?php

namespace App\Http\Requests\Admin;

use App\Enums\DocumentReviewStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

/**
 * Body pemeriksaan satu dokumen: hasil pemeriksaan + catatan admin (opsional).
 */
class ReviewDocumentRequest extends FormRequest
{
    /**
     * Middleware route 'admin' sudah menjamin role; ini defense in depth.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAdminPrivileges() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'review_status' => ['required', new Enum(DocumentReviewStatus::class)],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'review_status.required' => 'Hasil pemeriksaan dokumen wajib dipilih.',
            'review_status.enum' => 'Hasil pemeriksaan dokumen tidak valid.',
            'admin_note.string' => 'Catatan admin tidak valid.',
            'admin_note.max' => 'Catatan admin maksimal 1000 karakter.',
        ];
    }
}
