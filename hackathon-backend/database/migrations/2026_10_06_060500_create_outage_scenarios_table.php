<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outage_scenarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained()->cascadeOnDelete();
            $table->string('slug');
            $table->string('name');
            $table->text('description');
            $table->unsignedSmallInteger('duration_days');
            // Share of piped supply lost, from 0 to 1.
            $table->decimal('supply_loss', 3, 2);
            // Null means every barangay is affected.
            $table->json('affected_barangay_ids')->nullable();
            $table->timestamps();

            $table->unique(['lgu_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outage_scenarios');
    }
};
