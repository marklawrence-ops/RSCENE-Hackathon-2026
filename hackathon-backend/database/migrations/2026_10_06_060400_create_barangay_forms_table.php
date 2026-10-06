<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangay_forms', function (Blueprint $table) {
            $table->id();
            // Generated on the device so re-sending an offline form is idempotent.
            $table->uuid('client_uuid')->unique();
            $table->foreignId('barangay_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // e.g. 2026-Q4 or 2026-PRE-TYPHOON
            $table->string('period');
            $table->unsignedSmallInteger('tanks_working');
            $table->unsignedSmallInteger('tanks_total');
            $table->unsignedInteger('covered_drums');
            $table->unsignedInteger('reusing_households');
            $table->unsignedInteger('households_estimate');
            $table->text('notes')->nullable();
            // app | paper
            $table->string('channel')->default('app');
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index(['barangay_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangay_forms');
    }
};
