<?php

namespace App\Http\Requests\Api\V1\Submissions;

use App\Enums\UserRole;
use App\Models\BookSubmission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSubmissionRequest extends FormRequest
{
    /**
     * Hanya pemohon (role applicant) yang boleh membuat pengajuan —
     * admin/super_admin mengelola pengajuan lewat endpoint /admin (Tahap 6).
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null || $user->role !== UserRole::Applicant) {
            return false;
        }

        return $user->can('create', BookSubmission::class);
    }

    /**
     * Field buku sesuai kolom book_submissions (docs/DATABASE.md).
     * Kolom status, submission_number, dan isbn tidak pernah datang dari input.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'main_author' => ['required', 'string', 'max:255'],
            'additional_authors' => ['nullable', 'string', 'max:1000'],
            'editor' => ['nullable', 'string', 'max:255'],
            'translator' => ['nullable', 'string', 'max:255'],
            'publisher_name' => ['required', 'string', 'max:255'],
            'planned_publication_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'edition' => ['nullable', 'string', 'max:255'],
            'language' => ['required', 'string', 'max:255'],
            'publication_format' => ['required', 'string', 'max:255'],
            'synopsis' => ['nullable', 'string', 'max:10000'],
            'page_count' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'book_size' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * Pesan validasi Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul buku wajib diisi.',
            'title.max' => 'Judul buku maksimal 255 karakter.',
            'subtitle.max' => 'Subjudul maksimal 255 karakter.',
            'main_author.required' => 'Penulis utama wajib diisi.',
            'main_author.max' => 'Penulis utama maksimal 255 karakter.',
            'additional_authors.max' => 'Penulis tambahan maksimal 1000 karakter.',
            'editor.max' => 'Nama editor maksimal 255 karakter.',
            'translator.max' => 'Nama penerjemah maksimal 255 karakter.',
            'publisher_name.required' => 'Nama penerbit wajib diisi.',
            'publisher_name.max' => 'Nama penerbit maksimal 255 karakter.',
            'planned_publication_year.integer' => 'Tahun terbit terencana harus berupa angka.',
            'planned_publication_year.min' => 'Tahun terbit terencana tidak valid.',
            'planned_publication_year.max' => 'Tahun terbit terencana maksimal 2100.',
            'edition.max' => 'Edisi maksimal 255 karakter.',
            'language.required' => 'Bahasa buku wajib diisi.',
            'language.max' => 'Bahasa buku maksimal 255 karakter.',
            'publication_format.required' => 'Format terbitan wajib diisi.',
            'publication_format.max' => 'Format terbitan maksimal 255 karakter.',
            'synopsis.max' => 'Sinopsis maksimal 10000 karakter.',
            'page_count.integer' => 'Jumlah halaman harus berupa angka.',
            'page_count.min' => 'Jumlah halaman minimal 1.',
            'page_count.max' => 'Jumlah halaman maksimal 100000.',
            'book_size.max' => 'Ukuran buku maksimal 255 karakter.',
            'notes.max' => 'Catatan maksimal 5000 karakter.',
        ];
    }
}
