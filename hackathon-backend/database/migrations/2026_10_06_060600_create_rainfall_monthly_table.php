<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rainfall_monthly', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->decimal('rainfall_mm', 7, 1);
            // open-meteo | seed
            $table->string('source');
            $table->timestamps();

            $table->unique(['lgu_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rainfall_monthly');
    }
};
