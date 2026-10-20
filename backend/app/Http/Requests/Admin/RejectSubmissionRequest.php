<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Body penolakan pengajuan: alasan wajib —
 * tersimpan di histori status dan dilihat pemohon.
 */
class RejectSubmissionRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan penolakan wajib diisi.',
            'reason.string' => 'Alasan penolakan tidak valid.',
            'reason.min' => 'Alasan penolakan minimal 5 karakter.',
            'reason.max' => 'Alasan penolakan maksimal 2000 karakter.',
        ];
    }
}
