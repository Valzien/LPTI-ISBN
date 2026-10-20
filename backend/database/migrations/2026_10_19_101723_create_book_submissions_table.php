<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('book_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_number')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('main_author');
            $table->text('additional_authors')->nullable();
            $table->string('editor')->nullable();
            $table->string('translator')->nullable();
            $table->string('publisher_name');
            $table->unsignedSmallInteger('planned_publication_year')->nullable();
            $table->string('edition')->nullable();
            $table->string('language');
            $table->string('publication_format');
            $table->text('synopsis')->nullable();
            $table->unsignedInteger('page_count')->nullable();
            $table->string('book_size')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->string('isbn_number')->nullable()->unique();
            $table->timestamp('isbn_assigned_at')->nullable();
            $table->text('isbn_source_note')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('book_submissions');
    }
};
