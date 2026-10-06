<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per place that produces or stores water: public buildings (with or without a tank) and listed businesses.
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained()->cascadeOnDelete();
            $table->foreignId('barangay_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // public_building | business
            $table->string('kind');
            // school | barangay_hall | health_center | gym | market | laundromat | carwash | hotel
            $table->string('category');
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->unsignedInteger('roof_area_m2')->nullable();
            // Subset of: rain, light_greywater, wash_water, condensate
            $table->json('source_types');
            $table->unsignedInteger('greywater_lpd')->nullable();
            // none | candidate | installed
            $table->string('tank_status')->default('none');
            $table->unsignedInteger('tank_liters')->nullable();
            $table->boolean('tank_covered')->nullable();
            $table->boolean('tank_working')->nullable();
            // real | assumed | simulated
            $table->string('data_status')->default('simulated');
            $table->timestamps();

            $table->index(['lgu_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sites');
    }
};
