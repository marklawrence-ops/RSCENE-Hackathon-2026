<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('lgu_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('barangay_id')->nullable()->after('lgu_id')->constrained()->nullOnDelete();
            // planner | cdrrmo | barangay
            $table->string('role')->default('barangay')->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('barangay_id');
            $table->dropConstrainedForeignId('lgu_id');
            $table->dropColumn('role');
        });
    }
};
