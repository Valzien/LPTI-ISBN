<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Enums\ApplicantType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Endpoint publik untuk calon pemohon.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:30'],
            'applicant_type' => ['required', new Enum(ApplicantType::class)],
            'publisher_name' => ['nullable', 'string', 'max:255', 'required_if:applicant_type,publisher_rep'],
            'address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap wajib diisi.',
            'name.max' => 'Nama lengkap maksimal 255 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'password.min' => 'Password minimal 8 karakter.',
            'applicant_type.required' => 'Jenis pemohon wajib dipilih.',
            'applicant_type.enum' => 'Jenis pemohon tidak valid.',
            'publisher_name.required_if' => 'Nama penerbit wajib diisi untuk perwakilan penerbit.',
            'phone.max' => 'Nomor telepon maksimal 30 karakter.',
            'address.max' => 'Alamat maksimal 1000 karakter.',
        ];
    }
}
