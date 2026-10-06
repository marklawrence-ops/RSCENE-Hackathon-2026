<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('population');
            $table->unsignedSmallInteger('population_year');
            $table->unsignedInteger('households')->nullable();
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            // Baseline outage exposure from 0 to 1 (simulated until the pilot), used to colour the map.
            $table->decimal('outage_vulnerability', 3, 2)->default(0.5);
            $table->timestamps();

            $table->unique(['lgu_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangays');
    }
};
