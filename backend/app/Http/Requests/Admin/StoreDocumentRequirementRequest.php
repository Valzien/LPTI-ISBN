<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Pembuatan persyaratan dokumen oleh admin.
 */
class StoreDocumentRequirementRequest extends FormRequest
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
            'name' => ['required', 'string', 'min:3', 'max:150', Rule::unique('document_requirements', 'name')],
            'description' => ['nullable', 'string', 'max:1000'],
            'allowed_mime_types' => ['required', 'array', 'min:1', 'max:10'],
            'allowed_mime_types.*' => ['string', 'distinct', 'max:50', 'regex:/^[a-z0-9]+\/[a-z0-9.+-]+$/'],
            'max_file_size' => ['required', 'integer', 'min:1024', 'max:4194304'],
            'is_required' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama persyaratan wajib diisi.',
            'name.min' => 'Nama persyaratan minimal 3 karakter.',
            'name.max' => 'Nama persyaratan maksimal 150 karakter.',
            'name.unique' => 'Nama persyaratan sudah digunakan.',
            'description.max' => 'Deskripsi maksimal 1000 karakter.',
            'allowed_mime_types.required' => 'Daftar tipe berkas yang diizinkan wajib diisi.',
            'allowed_mime_types.min' => 'Minimal satu tipe berkas yang diizinkan.',
            'allowed_mime_types.max' => 'Maksimal 10 tipe berkas.',
            'allowed_mime_types.*.regex' => 'Format tipe berkas tidak valid (contoh: application/pdf).',
            'allowed_mime_types.*.distinct' => 'Tipe berkas tidak boleh duplikat.',
            'max_file_size.required' => 'Ukuran maksimum berkas wajib diisi.',
            'max_file_size.min' => 'Ukuran maksimum berkas minimal 1 KB.',
            'max_file_size.max' => 'Ukuran maksimum berkas maksimal 4 MB.',
            'is_required.required' => 'Penanda wajib/tidak wajib harus diisi.',
            'is_active.required' => 'Status aktif harus diisi.',
            'sort_order.required' => 'Urutan wajib diisi.',
            'sort_order.max' => 'Urutan maksimal 999.',
        ];
    }
}
