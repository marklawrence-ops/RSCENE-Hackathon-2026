<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\BarangayForm;
use App\Models\Lgu;
use App\Models\Site;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * SIMULATED data, labelled as such in the API: public buildings, businesses, tanks and last quarter's forms.
 * Deterministic (hash of names), so every reseed gives the same demo state.
 */
class DemoDataSeeder extends Seeder
{
    /** Pilot tanks already in place: [barangay, site category, working]. */
    private const INSTALLED_TANKS = [
        ['Poblacion 3', 'school', true],
        ['Canlapwas', 'school', true],
        ['Mercedes', 'school', true],
        ['San Andres', 'barangay_hall', true],
        ['Guindaponan', 'school', false],
    ];

    private const BUSINESS_BARANGAYS = [
        'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4', 'Poblacion 5', 'Poblacion 6', 'Poblacion 7',
        'Poblacion 8', 'Poblacion 9', 'Poblacion 10', 'Poblacion 11', 'Poblacion 12', 'Poblacion 13',
        'Canlapwas', 'Mercedes', 'Maulong', 'San Andres', 'Guindaponan',
    ];

    public function run(): void
    {
        $lgu = Lgu::where('slug', 'catbalogan')->firstOrFail();

        // Simulated rows are rebuilt from scratch so tweaks to this file always apply.
        Site::where('lgu_id', $lgu->id)->where('data_status', 'simulated')->delete();
        BarangayForm::whereIn('barangay_id', $lgu->barangays()->select('id'))->where('notes', 'Simulated seed form')->delete();

        foreach ($lgu->barangays()->orderBy('id')->get() as $barangay) {
            $this->seedPublicBuildings($lgu, $barangay);
            if (in_array($barangay->name, self::BUSINESS_BARANGAYS, true)) {
                $this->seedBusiness($lgu, $barangay);
            }
            $this->seedLastQuarterForm($barangay);
        }
    }

    private function seedPublicBuildings(Lgu $lgu, Barangay $b): void
    {
        $pupils = (int) min(1500, max(60, $b->population * 0.15));

        $buildings = [
            ['category' => 'barangay_hall', 'name' => "Brgy. {$b->name} Hall", 'roof' => [60, 150], 'demand' => [150, 300], 'sources' => ['rain', 'light_greywater']],
            ['category' => 'school', 'name' => "{$b->name} Elementary School", 'roof' => [200, 600], 'demand' => [$pupils * 3, $pupils * 4], 'sources' => ['rain', 'light_greywater', 'kitchen']],
        ];
        if ($b->population >= 3000) {
            $buildings[] = ['category' => 'health_center', 'name' => "{$b->name} Health Center", 'roof' => [100, 220], 'demand' => [300, 500], 'sources' => ['rain', 'condensate']];
        }

        foreach ($buildings as $building) {
            $key = $b->name.$building['category'];
            $installed = collect(self::INSTALLED_TANKS)->first(fn ($t) => $t[0] === $b->name && $t[1] === $building['category']);

            Site::create([
                'lgu_id' => $lgu->id,
                'barangay_id' => $b->id,
                'name' => $building['name'],
                'kind' => 'public_building',
                'category' => $building['category'],
                ...$this->near($lgu, $b, $key),
                'roof_area_m2' => $this->between($key.'roof', ...$building['roof']),
                'source_types' => $building['sources'],
                'greywater_lpd' => (int) round($this->between($key.'demand', ...$building['demand']) * 0.6),
                'nonpotable_demand_lpd' => $this->between($key.'demand', ...$building['demand']),
                'tank_status' => $installed ? 'installed' : 'candidate',
                'tank_liters' => $installed ? 1000 : null,
                'tank_covered' => $installed ? true : null,
                'tank_working' => $installed ? $installed[2] : null,
                'data_status' => 'simulated',
            ]);
        }
    }

    private function seedBusiness(Lgu $lgu, Barangay $b): void
    {
        $types = [
            ['laundromat', 'Laundry Shop', [1500, 3000], ['wash_water']],
            ['carwash', 'Carwash', [2000, 5000], ['wash_water']],
            ['hotel', 'Pension House', [1000, 4000], ['light_greywater', 'condensate']],
        ];
        [$category, $label, $range, $sources] = $types[crc32($b->name) % 3];
        $key = $b->name.$category;

        Site::create([
            'lgu_id' => $lgu->id,
            'barangay_id' => $b->id,
            'name' => "{$b->name} {$label}",
            'kind' => 'business',
            'category' => $category,
            ...$this->near($lgu, $b, $key),
            'roof_area_m2' => $category === 'carwash' ? null : $this->between($key.'roof', 80, 300),
            'source_types' => $sources,
            'greywater_lpd' => $this->between($key.'gw', ...$range),
            'nonpotable_demand_lpd' => null,
            'tank_status' => 'none',
            'data_status' => 'simulated',
        ]);
    }

    private function seedLastQuarterForm(Barangay $b): void
    {
        $households = (int) max(1, round($b->population / 5));
        // Small upland and island barangays keep more drums; town barangays rely on piped water.
        $drumsPerHousehold = $b->population < 1000
            ? 0.4 + $this->rand($b->name.'drums') * 2.4
            : 0.05 + $this->rand($b->name.'drums') * 0.35;
        $tanks = Site::where('barangay_id', $b->id)->where('tank_status', 'installed');

        BarangayForm::create([
            'client_uuid' => (string) Str::uuid(),
            'barangay_id' => $b->id,
            'period' => '2026-Q3',
            'tanks_working' => (clone $tanks)->where('tank_working', true)->count(),
            'tanks_total' => $tanks->count(),
            'covered_drums' => (int) round($households * $drumsPerHousehold),
            'reusing_households' => (int) round($households * (0.02 + $this->rand($b->name.'adopt') * 0.13)),
            'households_estimate' => $households,
            'notes' => 'Simulated seed form',
            'channel' => 'paper',
            'submitted_at' => now()->setDate(2026, 9, 20 + (int) ($this->rand($b->name.'day') * 10))->setTime(9, 0),
        ]);
    }

    /**
     * @return array{latitude: float, longitude: float}
     */
    private function near(Lgu $lgu, Barangay $b, string $key): array
    {
        $lat = $b->latitude ?? $lgu->latitude;
        $lng = $b->longitude ?? $lgu->longitude;

        return [
            'latitude' => round($lat + ($this->rand($key.'lat') - 0.5) * 0.003, 6),
            'longitude' => round($lng + ($this->rand($key.'lng') - 0.5) * 0.003, 6),
        ];
    }

    private function between(string $key, int|float $min, int|float $max): int
    {
        return (int) round($min + $this->rand($key) * ($max - $min));
    }

    /** Stable pseudo-random number in [0, 1). */
    private function rand(string $key): float
    {
        return (crc32($key) % 10000) / 10000;
    }
}
