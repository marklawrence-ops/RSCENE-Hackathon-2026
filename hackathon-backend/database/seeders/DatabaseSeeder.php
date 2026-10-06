<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\OutageScenario;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed plan: docs/seed-plan.md. Real data first (LGU, PSA barangays), then scenarios and demo users.
     * Simulated sites, forms and rainfall are added by the backend in Phase 3.
     */
    public function run(): void
    {
        $lgu = Lgu::updateOrCreate(['slug' => 'catbalogan'], [
            'name' => 'Catbalogan City',
            'province' => 'Samar',
            'latitude' => 11.7753,
            'longitude' => 124.8829,
            'is_simulated' => false,
            'settings' => self::catbaloganSettings(),
        ]);

        $this->seedBarangays($lgu, database_path('data/catbalogan_barangays.csv'), 2020);
        $this->seedOutageScenarios($lgu);
        $this->seedDemoUsers($lgu);
    }

    /**
     * @return array<string, mixed>
     */
    public static function catbaloganSettings(): array
    {
        return [
            // Assumption, secondary source, unverified; editable per LGU.
            'liters_per_person_day' => 90.09,
            'usage_split' => ['bathing' => 0.44, 'toilet' => 0.30, 'cooking' => 0.16, 'laundry' => 0.08, 'drinking' => 0.02],
            'household_size' => 5,
            'runoff_coefficient' => 0.8,
            'drum_liters' => 200,
            'target_days_of_cover' => 3,
            'annual_rainfall_mm' => 2991,
            'costs_php' => [
                'tank_site' => ['min' => 17000, 'max' => 30000],
                'drum_cover' => ['min' => 155, 'max' => 210],
                // Assumed placeholders until the product lead confirms quotes.
                'guidance_card' => 8,
                'training_session' => 15000,
            ],
            'tariff_min_charge_php' => 175,
            'funding' => [
                'source' => 'LDRRMF 70% preparedness share (RA 10121)',
                'preparedness_share_php' => ['min' => 35000000, 'max' => 51000000],
            ],
        ];
    }

    private function seedBarangays(Lgu $lgu, string $csvPath, int $year): void
    {
        $rows = array_map('str_getcsv', file($csvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);
        array_shift($rows);

        foreach ($rows as [$name, $population, $latitude, $longitude]) {
            Barangay::updateOrCreate(['lgu_id' => $lgu->id, 'name' => $name], [
                'population' => (int) $population,
                'population_year' => $year,
                'latitude' => $latitude !== '' ? (float) $latitude : null,
                'longitude' => $longitude !== '' ? (float) $longitude : null,
                // Simulated, but stable between reseeds so the demo map does not change.
                'outage_vulnerability' => round((crc32($name) % 70) / 100 + 0.2, 2),
            ]);
        }
    }

    private function seedOutageScenarios(Lgu $lgu): void
    {
        $scenarios = [
            [
                'slug' => 'turbid-power-cut',
                'name' => 'Turbid source + power cut',
                'description' => 'The July 2026 case: heavy rain makes the main source too turbid to treat and a power-line outage stops pumping.',
                'duration_days' => 5,
                'supply_loss' => 0.9,
            ],
            [
                'slug' => 'dry-season',
                'name' => 'Dry-season spring drawdown',
                'description' => 'Springs run low after dry months; rationing cuts piped supply by about half.',
                'duration_days' => 14,
                'supply_loss' => 0.5,
            ],
            [
                'slug' => 'typhoon',
                'name' => 'Typhoon landfall',
                'description' => 'Pipes and power lines damaged citywide for several days.',
                'duration_days' => 3,
                'supply_loss' => 1.0,
            ],
        ];

        foreach ($scenarios as $scenario) {
            OutageScenario::updateOrCreate(
                ['lgu_id' => $lgu->id, 'slug' => $scenario['slug']],
                $scenario + ['affected_barangay_ids' => null],
            );
        }
    }

    private function seedDemoUsers(Lgu $lgu): void
    {
        $password = (string) config('app.demo_user_password');
        $barangay = $lgu->barangays()->where('name', 'Mercedes')->first();

        $users = [
            ['email' => 'planner@demo.test', 'name' => 'City Planner', 'role' => 'planner', 'barangay_id' => null],
            ['email' => 'cdrrmo@demo.test', 'name' => 'CDRRMO Focal Person', 'role' => 'cdrrmo', 'barangay_id' => null],
            ['email' => 'barangay@demo.test', 'name' => 'Brgy. Mercedes Secretary', 'role' => 'barangay', 'barangay_id' => $barangay?->id],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(['email' => $user['email']], $user + [
                'lgu_id' => $lgu->id,
                'password' => $password,
            ]);
        }
    }
}
