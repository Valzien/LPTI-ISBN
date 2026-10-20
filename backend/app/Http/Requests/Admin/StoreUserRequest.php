<?php

namespace App\Http\Requests\Admin;

use App\Enums\ApplicantType;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * Pembuatan akun baru oleh admin utama (super_admin).
 */
class StoreUserRequest extends FormRequest
{
    /**
     * Middleware route 'super_admin' sudah menjamin role; ini defense in depth.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'role' => ['required', new Enum(UserRole::class)],
            'phone' => ['nullable', 'string', 'max:30'],
            'applicant_type' => ['nullable', new Enum(ApplicantType::class)],
            'publisher_name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'name.min' => 'Nama minimal 3 karakter.',
            'name.max' => 'Nama maksimal 255 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan akun lain.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'role.required' => 'Role wajib dipilih.',
            'role.enum' => 'Role tidak valid.',
            'phone.max' => 'Nomor telepon maksimal 30 karakter.',
            'applicant_type.enum' => 'Jenis pemohon tidak valid.',
            'publisher_name.max' => 'Nama penerbit maksimal 255 karakter.',
            'address.max' => 'Alamat maksimal 1000 karakter.',
        ];
    }
}
