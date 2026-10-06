<?php

use App\Models\BarangayForm;
use App\Models\User;
use App\Services\WaterModel;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
});

/** Files a current-quarter form for the user's own barangay through the API, as the phone does. */
function fileForm(User $user): void
{
    test()->actingAs($user)->postJson('/api/v1/barangay-forms', [
        'client_uuid' => (string) Str::uuid(), 'barangay_id' => $user->barangay_id, 'period' => WaterModel::currentPeriod(),
        'tanks_working' => 1, 'tanks_total' => 1, 'covered_drums' => 811, 'reusing_households' => 300,
        'households_estimate' => 2456, 'notes' => null, 'channel' => 'app', 'submitted_at' => now()->toIso8601String(),
    ])->assertCreated();
}

test('demo reset removes forms filed by demo accounts and the readiness jump comes back', function () {
    $user = User::where('email', 'barangay@demo.test')->firstOrFail();
    $readiness = fn () => $this->getJson("/api/v1/barangays/{$user->barangay_id}")->json('barangay.metrics.readiness_score');
    $seeded = BarangayForm::count();
    $before = $readiness();

    fileForm($user);
    expect($readiness())->toBeGreaterThan($before);

    $this->artisan('demo:reset', ['--force' => true])->assertSuccessful();

    expect(BarangayForm::count())->toBe($seeded)
        ->and($readiness())->toBe($before);

    // Filing again after the reset gives the same jump as the first time.
    fileForm($user);
    expect($readiness())->toBeGreaterThan($before);
});

test('demo reset keeps seeded forms and forms filed by real accounts', function () {
    $demo = User::where('email', 'barangay@demo.test')->firstOrFail();
    $real = User::factory()->create(['role' => 'barangay', 'lgu_id' => $demo->lgu_id, 'barangay_id' => $demo->barangay_id]);
    fileForm($real);
    $count = BarangayForm::count();

    $this->artisan('demo:reset', ['--force' => true])->expectsOutputToContain('Nothing to reset')->assertSuccessful();

    expect(BarangayForm::count())->toBe($count);
});
