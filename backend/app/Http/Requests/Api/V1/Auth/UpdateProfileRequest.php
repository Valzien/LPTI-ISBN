<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Enums\ApplicantType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Pengguna hanya dapat memperbarui profilnya sendiri.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
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
            'applicant_type.required' => 'Jenis pemohon wajib dipilih.',
            'applicant_type.enum' => 'Jenis pemohon tidak valid.',
            'publisher_name.required_if' => 'Nama penerbit wajib diisi untuk perwakilan penerbit.',
            'phone.max' => 'Nomor telepon maksimal 30 karakter.',
            'address.max' => 'Alamat maksimal 1000 karakter.',
        ];
    }
}
