<?php

namespace Database\Factories;

use App\Enums\SubmissionStatus;
use App\Models\BookSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookSubmission>
 */
class BookSubmissionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'submission_number' => sprintf(
                'LPTI-ISBN-%d-%s',
                now()->year,
                str_pad((string) fake()->unique()->numberBetween(1, 99999), 5, '0', STR_PAD_LEFT),
            ),
            'user_id' => User::factory(),
            'title' => fake()->sentence(4),
            'subtitle' => null,
            'main_author' => fake()->name(),
            'additional_authors' => null,
            'editor' => null,
            'translator' => null,
            'publisher_name' => fake()->company(),
            'planned_publication_year' => now()->year + fake()->numberBetween(0, 1),
            'edition' => fake()->randomElement(['Edisi Pertama', 'Edisi Kedua', null]),
            'language' => 'Indonesia',
            'publication_format' => fake()->randomElement(['Cetak', 'Digital', 'Cetak & Digital']),
            'synopsis' => fake()->paragraph(),
            'page_count' => fake()->numberBetween(50, 400),
            'book_size' => fake()->randomElement(['14 x 20 cm', '15 x 23 cm', '21 x 29,7 cm']),
            'notes' => null,
            'status' => SubmissionStatus::Draft->value,
            'isbn_number' => null,
            'isbn_assigned_at' => null,
            'isbn_source_note' => null,
        ];
    }

    public function withStatus(SubmissionStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status->value,
        ]);
    }
}
