<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Body pencatatan ISBN yang sudah sah ditetapkan pihak berwenang.
 *
 * Sistem HIDUP PERNAH menghasilkan nomor — hanya mencatat nomor yang
 * sudah ada beserta tanggal dan sumbernya (master prompt §2 & §5.7).
 */
class RecordIsbnRequest extends FormRequest
{
    /**
     * Middleware route 'admin' sudah menjamin role; ini defense in depth.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAdminPrivileges() ?? false;
    }

    /**
     * Normalisasi sebelum validasi: ISBN disimpan dalam bentuk digit murni
     * (tanpa strip/spasi) sehingga "978-602-1234-56-7" dan "9786021234567"
     * dianggap nomor yang sama untuk aturan unique.
     */
    protected function prepareForValidation(): void
    {
        $isbn = $this->input('isbn_number');

        if (is_string($isbn)) {
            $this->merge([
                'isbn_number' => preg_replace('/[-\s]/', '', $isbn) ?? $isbn,
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $submission = $this->route('submission');

        return [
            'isbn_number' => [
                'required',
                'string',
                'max:30',
                // ISBN-10 (10 digit, boleh diakhiri X) atau ISBN-13 (13 digit);
                // tanda pisah spasi/garis diperbolehkan saat input.
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $digits = preg_replace('/[-\s]/', '', (string) $value);

                    if (! is_string($digits) || preg_match('/^(\d{9}[\dXx]|\d{13})$/', $digits) !== 1) {
                        $fail('Format nomor ISBN tidak valid. Gunakan ISBN-10 atau ISBN-13 (contoh: 978-602-1234-56-7).');
                    }
                },
                Rule::unique('book_submissions', 'isbn_number')->ignore($submission),
            ],
            'isbn_assigned_at' => ['required', 'date', 'before_or_equal:+1 day'],
            'isbn_source_note' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'isbn_number.required' => 'Nomor ISBN wajib diisi.',
            'isbn_number.string' => 'Nomor ISBN tidak valid.',
            'isbn_number.max' => 'Nomor ISBN maksimal 30 karakter.',
            'isbn_number.unique' => 'Nomor ISBN ini sudah tercatat pada pengajuan lain.',
            'isbn_assigned_at.required' => 'Tanggal penetapan ISBN wajib diisi.',
            'isbn_assigned_at.date' => 'Tanggal penetapan ISBN tidak valid.',
            'isbn_assigned_at.before_or_equal' => 'Tanggal penetapan ISBN tidak boleh jauh di masa depan.',
            'isbn_source_note.required' => 'Sumber/keterangan penerbitan ISBN wajib diisi.',
            'isbn_source_note.string' => 'Sumber/keterangan penerbitan ISBN tidak valid.',
            'isbn_source_note.min' => 'Sumber/keterangan penerbitan ISBN minimal 3 karakter.',
            'isbn_source_note.max' => 'Sumber/keterangan penerbitan ISBN maksimal 1000 karakter.',
        ];
    }
}
