<?php

use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\Site;
use App\Models\User;
use App\Services\WaterModel;
use App\Support\Boundaries;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->lgu = Lgu::where('slug', 'catbalogan')->firstOrFail();
});

/** A barangay with no tanks and a known number of covered drums. */
function barangayWithDrums(Lgu $lgu, int $population, int $drums): Barangay
{
    $b = Barangay::create(['lgu_id' => $lgu->id, 'name' => 'Test '.Str::random(5), 'population' => $population, 'population_year' => 2020]);
    $b->forms()->create([
        'client_uuid' => (string) Str::uuid(), 'period' => '2026-Q3', 'tanks_working' => 0, 'tanks_total' => 0,
        'covered_drums' => $drums, 'reusing_households' => 40, 'households_estimate' => 200,
        'channel' => 'paper', 'submitted_at' => now(),
    ]);

    return $b->load(['sites', 'latestForm']);
}

test('per-person figures match the concept doc', function () {
    expect(WaterModel::for($this->lgu)->perPersonLpd())
        ->toBe(['greywater' => 46.8, 'flushing' => 27.0, 'nonpotable' => 34.2]);
});

test('a 3-day target needs 3 drums per household of 5', function () {
    expect(WaterModel::for($this->lgu)->drumsPerHouseholdForTarget())->toBe(3);
});

test('days of cover is storage over non-potable demand', function () {
    // 1,000 people × 34.23 L = 34,234 L/day; 171 drums × 200 L = 34,200 L ≈ 1.0 day.
    $b = barangayWithDrums($this->lgu, 1000, 171);
    $m = WaterModel::for($this->lgu)->metrics($b);

    expect($m['nonpotable_demand_lpd'])->toBe(34234)
        ->and($m['storage_liters'])->toBe(34200)
        ->and($m['days_of_cover'])->toBe(1.0)
        ->and($m['status'])->toBe('amber')
        ->and($m['adoption_rate'])->toBe(0.2)
        // 50 × (1/3) + 30 × (0.2/0.5) + 0 (form is not for the current quarter) = 28.7
        ->and($m['readiness_score'])->toBe(29);
});

test('reuse gap subtracts greywater already reused by households', function () {
    $b = barangayWithDrums($this->lgu, 1000, 0);
    $m = WaterModel::for($this->lgu)->metrics($b);

    // 46,847 L potential − 40 households × 5 × 46.85 L × 0.4 reuse fraction.
    expect($m['greywater_lpd'])->toBe(46847)
        ->and($m['reuse_gap_lpd'])->toBe(43099);
});

test('rain yield uses the last 12 months of Open-Meteo rainfall', function () {
    $model = WaterModel::for($this->lgu);
    $site = new Site(['roof_area_m2' => 100]);

    expect($model->annualRainMm())->toBeGreaterThan(1500)
        ->and($model->rainYieldLpd($site))->toBe((int) round($model->annualRainMm() * 100 * 0.8 / 365));
});

test('barangay list covers all 57 barangays with a mix of statuses', function () {
    $res = $this->getJson('/api/v1/lgus/catbalogan/barangays')->assertOk();

    expect($res->json('barangays'))->toHaveCount(57)
        ->and($res->json('totals.population'))->toBe(106440)
        ->and($res->json('barangays.0.location'))->not->toBeNull()
        ->and($res->json('totals.status_counts.green'))->toBeGreaterThan(0)
        ->and($res->json('totals.status_counts.red'))->toBeGreaterThan(0);
});

test('barangay detail includes sites and the latest form', function () {
    $id = Barangay::where('name', 'Bangon')->value('id');

    $this->getJson("/api/v1/barangays/{$id}")
        ->assertOk()
        ->assertJsonPath('barangay.name', 'Bangon')
        ->assertJsonPath('per_person_lpd.nonpotable', 34.2)
        ->assertJsonPath('latest_form.period', '2026-Q3')
        ->assertJsonCount(2, 'sites');
});

test('installed tanks report how long they keep the building running', function () {
    $sites = $this->getJson('/api/v1/lgus/catbalogan/sites?kind=public_building')->assertOk()->json('sites');
    $installed = collect($sites)->firstWhere('tank.status', 'installed');

    expect($installed['tank']['days_of_cover'])->toBe(round(1000 / $installed['nonpotable_demand_lpd'], 1));
});

test('school kitchen water is matched to safe discharge', function () {
    $school = Site::where('category', 'school')->firstOrFail();
    $matches = collect($this->getJson("/api/v1/sites/{$school->id}/matches")->assertOk()->json('matches'));

    expect($matches->firstWhere('source', 'kitchen'))->toMatchArray(['use' => 'none', 'decision' => 'discharge'])
        ->and($matches->where('source', 'rain')->pluck('decision')->unique()->all())->toBe(['reuse'])
        ->and($matches->pluck('use'))->not->toContain('drinking');
});

test('demo program turns Bangon from red to green', function () {
    $id = Barangay::where('name', 'Bangon')->value('id');

    $res = $this->postJson('/api/v1/lgus/catbalogan/program-preview', [
        'barangay_ids' => [$id], 'public_tanks' => 5, 'tank_liters' => 1000,
        'cards' => 60, 'drum_covers' => 80, 'adoption_rate' => 0.3,
    ])->assertOk();

    expect($res->json('barangays.0'))->toMatchArray(['status_before' => 'red', 'status_after' => 'green'])
        ->and($res->json('liters_secured'))->toBe(21000)
        ->and($res->json('cost_php.min'))->toBeLessThan($res->json('cost_php.max'))
        ->and($res->json('share_of_funding'))->toBeLessThan(0.01);
});

test('outage run gets better with the demo program', function () {
    $id = Barangay::where('name', 'Bangon')->value('id');
    $program = ['barangay_ids' => [$id], 'public_tanks' => 5, 'tank_liters' => 1000, 'cards' => 60, 'drum_covers' => 80, 'adoption_rate' => 0.3];

    $before = $this->postJson('/api/v1/lgus/catbalogan/outage-runs', ['scenario' => 'turbid-power-cut'])->assertOk();
    $after = $this->postJson('/api/v1/lgus/catbalogan/outage-runs', ['scenario' => 'turbid-power-cut', 'program' => $program])->assertOk();

    $row = fn ($res) => collect($res->json('results'))->firstWhere('barangay_id', $id);

    expect($row($before)['outcome'])->toBe('fails')
        ->and($row($before)['suggested_site_id'])->not->toBeNull()
        ->and($row($after)['outcome'])->toBe('holds')
        ->and(array_sum($before->json('summary')))->toBe(57);
});

test('outage run rejects an unknown scenario', function () {
    $this->postJson('/api/v1/lgus/catbalogan/outage-runs', ['scenario' => 'nope'])->assertUnprocessable();
});

test('storage registry totals match its rows', function () {
    $res = $this->getJson('/api/v1/lgus/catbalogan/storage')->assertOk();

    expect($res->json('rows'))->toHaveCount(57)
        ->and($res->json('totals.storage_liters'))->toBe(collect($res->json('rows'))->sum('storage_liters'))
        ->and($res->json('totals.public_tanks'))->toBe(5);
});

test('boundaries cover every barangay and every site sits inside its own barangay', function () {
    $res = $this->getJson('/api/v1/lgus/catbalogan/boundaries')
        ->assertOk()
        ->assertHeader('Cache-Control', 'max-age=86400, public');

    $features = collect($res->json('features'));
    expect($features)->toHaveCount(57)
        ->and($features->pluck('properties.barangay_id')->filter()->unique())->toHaveCount(57);

    foreach (Site::with('barangay')->get() as $site) {
        $rings = Boundaries::rings('catbalogan', $site->barangay->name);
        expect(Boundaries::contains($rings, $site->latitude, $site->longitude))->toBeTrue("{$site->name} is outside {$site->barangay->name}");
    }
    foreach (Barangay::all() as $b) {
        expect(Boundaries::contains(Boundaries::rings('catbalogan', $b->name), $b->latitude, $b->longitude))->toBeTrue("{$b->name} point is outside its boundary");
    }
});

test('rainfall, scenarios, lgus and reuse rules are public', function () {
    $this->getJson('/api/v1/lgus/catbalogan/rainfall')->assertOk()->assertJsonPath('data_status', 'real');
    $this->getJson('/api/v1/lgus/catbalogan/outage-scenarios')->assertOk()->assertJsonCount(3, 'scenarios');
    $this->getJson('/api/v1/lgus')->assertOk()
        ->assertJsonPath('lgus.0.slug', 'catbalogan')
        ->assertJsonPath('lgus.0.default_bounds', [[11.735, 124.815], [11.91, 124.935]]);
    $this->getJson('/api/v1/reuse-rules')->assertOk()->assertJsonCount(6, 'rules');
});

describe('barangay forms', function () {
    function formPayload(int $barangayId, array $overrides = []): array
    {
        return [
            'client_uuid' => (string) Str::uuid(), 'barangay_id' => $barangayId, 'period' => '2026-Q4',
            'tanks_working' => 1, 'tanks_total' => 2, 'covered_drums' => 140, 'reusing_households' => 40,
            'households_estimate' => 300, 'notes' => null, 'channel' => 'app', 'submitted_at' => '2026-10-06T03:00:00Z',
            ...$overrides,
        ];
    }

    test('submitting needs a token', function () {
        $this->postJson('/api/v1/barangay-forms', formPayload(1))->assertUnauthorized();
    });

    test('a re-sent offline form is stored once', function () {
        $user = User::where('email', 'barangay@demo.test')->firstOrFail();
        $payload = formPayload($user->barangay_id);

        $this->actingAs($user)->postJson('/api/v1/barangay-forms', $payload)->assertCreated();
        $this->actingAs($user)->postJson('/api/v1/barangay-forms', $payload)->assertOk()->assertJsonPath('form.client_uuid', $payload['client_uuid']);

        expect($this->getJson("/api/v1/barangays/{$user->barangay_id}/forms")->json('forms'))->toHaveCount(2); // seed + new
    });

    test('a current-quarter form adds 20 readiness points', function () {
        $user = User::where('email', 'barangay@demo.test')->firstOrFail();
        $before = $this->getJson("/api/v1/barangays/{$user->barangay_id}")->json('barangay.metrics.readiness_score');

        $this->actingAs($user)->postJson('/api/v1/barangay-forms', formPayload($user->barangay_id, [
            'period' => WaterModel::currentPeriod(), 'submitted_at' => now()->toIso8601String(),
        ]))->assertCreated();

        expect($this->getJson("/api/v1/barangays/{$user->barangay_id}")->json('barangay.metrics.readiness_score'))
            ->toBeGreaterThanOrEqual($before + 15);
    });

    test('barangay users can only submit for their own barangay', function () {
        $user = User::where('email', 'barangay@demo.test')->firstOrFail();
        $other = Barangay::where('id', '!=', $user->barangay_id)->value('id');

        $this->actingAs($user)->postJson('/api/v1/barangay-forms', formPayload($other))->assertForbidden();
    });

    test('cdrrmo can encode a paper form for any barangay', function () {
        $user = User::where('email', 'cdrrmo@demo.test')->firstOrFail();

        $this->actingAs($user)->postJson('/api/v1/barangay-forms', formPayload(5, ['channel' => 'paper']))->assertCreated();
    });

    test('staff cannot file for a barangay in another LGU', function () {
        $user = User::where('email', 'cdrrmo@demo.test')->firstOrFail();
        $otherLgu = Lgu::create(['slug' => 'other-town', 'name' => 'Other Town', 'province' => 'Samar', 'latitude' => 11.6, 'longitude' => 125.0, 'settings' => []]);
        $outside = Barangay::create(['lgu_id' => $otherLgu->id, 'name' => 'Outside', 'population' => 500, 'population_year' => 2020]);

        $this->actingAs($user)->postJson('/api/v1/barangay-forms', formPayload($outside->id, ['channel' => 'paper']))->assertForbidden();
        expect($outside->forms()->count())->toBe(0);
    });

    test('invalid counts are rejected', function () {
        $user = User::where('email', 'cdrrmo@demo.test')->firstOrFail();

        $this->actingAs($user)
            ->postJson('/api/v1/barangay-forms', formPayload(5, ['reusing_households' => 400, 'period' => 'Q4']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reusing_households', 'period']);
    });
});

test('settings expose the water-district base tariff for tariff-equivalent values', function () {
    $this->getJson('/api/v1/lgus/catbalogan/barangays')
        ->assertOk()
        ->assertJsonPath('settings.tariff.min_charge_php', 200)
        ->assertJsonPath('settings.tariff.min_m3', 10)
        ->assertJsonPath('settings.tariff.php_per_m3', 22.15);
});
