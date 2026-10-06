<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lgus', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('province');
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            // Per-LGU assumptions: usage split, litres per person per day, runoff, costs, tariff, funding.
            $table->json('settings');
            $table->boolean('is_simulated')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lgus');
    }
};
