<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Body permintaan revisi admin: catatan revisi wajib —
 * menjadi satu-satunya panduan pemohon dalam memperbaiki pengajuan.
 */
class RequestRevisionRequest extends FormRequest
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
            'note' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'note.required' => 'Catatan revisi wajib diisi.',
            'note.string' => 'Catatan revisi tidak valid.',
            'note.min' => 'Catatan revisi minimal 5 karakter.',
            'note.max' => 'Catatan revisi maksimal 2000 karakter.',
        ];
    }
}
