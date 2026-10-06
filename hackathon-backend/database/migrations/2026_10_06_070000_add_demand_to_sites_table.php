<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            // The building's own flushing and cleaning use, so a tank can show "keeps toilets running N days".
            $table->unsignedInteger('nonpotable_demand_lpd')->nullable()->after('greywater_lpd');
        });
    }

    public function down(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->dropColumn('nonpotable_demand_lpd');
        });
    }
};
