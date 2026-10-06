<?php

use App\Models\Barangay;
use App\Models\Site;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->bangon = Barangay::where('name', 'Bangon')->firstOrFail();
});

function csvFile(string $body): string
{
    $path = tempnam(sys_get_temp_dir(), 'sites').'.csv';
    file_put_contents($path, "barangay,name,kind,category,latitude,longitude,roof_area_m2,source_types,greywater_lpd,nonpotable_demand_lpd,tank_status,tank_liters,tank_covered,tank_working\n".$body);

    return $path;
}

test('the template imports as real sites', function () {
    $this->artisan('sites:import', ['file' => database_path('data/templates/sites_import_template.csv')])
        ->assertSuccessful();

    $school = Site::where('barangay_id', $this->bangon->id)->where('name', 'Bangon Elementary School')->firstOrFail();
    expect($school->data_status)->toBe('real')
        ->and($school->tank_status)->toBe('installed')
        ->and($school->tank_liters)->toBe(1000)
        ->and($school->tank_working)->toBeTrue()
        ->and($school->source_types)->toBe(['rain', 'light_greywater', 'kitchen']);
});

test('a dry run saves nothing', function () {
    $before = Site::count();

    $this->artisan('sites:import', ['file' => database_path('data/templates/sites_import_template.csv'), '--dry-run' => true, '--replace' => true])
        ->expectsOutputToContain('Dry run')
        ->assertSuccessful();

    expect(Site::count())->toBe($before)
        ->and(Site::where('data_status', 'real')->count())->toBe(0);
});

test('replace removes simulated sites only in the barangays the file covers', function () {
    $otherBefore = Site::where('barangay_id', '!=', $this->bangon->id)->count();

    $this->artisan('sites:import', ['file' => database_path('data/templates/sites_import_template.csv'), '--replace' => true])
        ->assertSuccessful();

    expect(Site::where('barangay_id', $this->bangon->id)->pluck('data_status')->unique()->all())->toBe(['real'])
        ->and(Site::where('barangay_id', $this->bangon->id)->count())->toBe(2)
        ->and(Site::where('barangay_id', '!=', $this->bangon->id)->count())->toBe($otherBefore);
});

test('a bad file is rejected whole, with line numbers', function () {
    $file = csvFile("Bangon,Good Row,public_building,school,11.875621,124.878409,100,rain,,,none,,,\nNowhere,Bad Row,public_building,school,11.8,124.8,,,,,,,,\nBangon,Tank No Size,public_building,school,11.875621,124.878409,,,,,installed,,yes,yes\n");
    $before = Site::count();

    $this->artisan('sites:import', ['file' => $file])
        ->expectsOutputToContain("Line 3: unknown barangay 'Nowhere'")
        ->expectsOutputToContain('Line 4: an installed tank needs tank_liters')
        ->assertFailed();

    expect(Site::count())->toBe($before);
});

test('importing twice updates instead of duplicating', function () {
    $file = database_path('data/templates/sites_import_template.csv');
    $this->artisan('sites:import', ['file' => $file])->assertSuccessful();
    $count = Site::count();

    $this->artisan('sites:import', ['file' => $file])->expectsOutputToContain('0 new, 2 updated')->assertSuccessful();

    expect(Site::count())->toBe($count);
});
