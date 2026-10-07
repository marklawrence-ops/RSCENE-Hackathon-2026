<?php

namespace App\Services;

use App\Models\Barangay;
use App\Models\BarangayForm;
use App\Models\Lgu;
use App\Models\OutageScenario;
use App\Models\Site;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Every formula in the concept doc ("Data and model"), per LGU.
 * Barangays passed in must have `sites` and `latestForm` loaded.
 */
class WaterModel
{
    // Usage split shares (concept doc): greywater = bathing + laundry, flushing = toilet, rain may serve toilet + laundry.
    private const GREYWATER_SHARE = 0.52;

    private const FLUSHING_SHARE = 0.30;

    private const NONPOTABLE_SHARE = 0.38;

    private float $lpd;

    private int $householdSize;

    private int $drumLiters;

    private float $targetDays;

    private float $runoff;

    private float $annualRainMm;

    private float $reuseFraction;

    /** @var array{min_charge_php: float, min_m3: float, php_per_m3: float} */
    private array $tariff;

    public function __construct(private Lgu $lgu)
    {
        $s = $lgu->settings;

        $this->lpd = (float) ($s['liters_per_person_day'] ?? 90.09);
        $this->householdSize = (int) ($s['household_size'] ?? 5);
        $this->drumLiters = (int) ($s['drum_liters'] ?? 200);
        $this->targetDays = (float) ($s['target_days_of_cover'] ?? 3);
        $this->runoff = (float) ($s['runoff_coefficient'] ?? 0.8);
        $this->reuseFraction = (float) ($s['reuse_fraction'] ?? 0.4);
        $this->tariff = [
            'min_charge_php' => (float) ($s['tariff_min_charge_php'] ?? 200),
            'min_m3' => (float) ($s['tariff_min_m3'] ?? 10),
            'php_per_m3' => (float) ($s['tariff_php_per_m3'] ?? 22.15),
        ];
        $this->annualRainMm = $this->lastTwelveMonthsRain() ?? (float) ($s['annual_rainfall_mm'] ?? 2991);
    }

    public static function for(Lgu $lgu): self
    {
        return new self($lgu);
    }

    public function annualRainMm(): float
    {
        return $this->annualRainMm;
    }

    /**
     * @return array{greywater: float, flushing: float, nonpotable: float}
     */
    public function perPersonLpd(): array
    {
        return [
            'greywater' => round(self::GREYWATER_SHARE * $this->lpd, 1),
            'flushing' => round(self::FLUSHING_SHARE * $this->lpd, 1),
            'nonpotable' => round(self::NONPOTABLE_SHARE * $this->lpd, 1),
        ];
    }

    /**
     * @return array{liters_per_person_day: float, household_size: int, drum_liters: int, target_days_of_cover: float, reuse_fraction: float, tariff: array{min_charge_php: float, min_m3: float, php_per_m3: float}}
     */
    public function publicSettings(): array
    {
        return [
            'liters_per_person_day' => $this->lpd,
            'household_size' => $this->householdSize,
            'drum_liters' => $this->drumLiters,
            'target_days_of_cover' => $this->targetDays,
            'reuse_fraction' => $this->reuseFraction,
            'tariff' => $this->tariff,
        ];
    }

    public function status(float $days): string
    {
        return match (true) {
            $days >= $this->targetDays => 'green',
            $days >= 1 => 'amber',
            default => 'red',
        };
    }

    public static function currentPeriod(): string
    {
        return now()->year.'-Q'.now()->quarter;
    }

    public function households(Barangay $b): int
    {
        return $b->latestForm?->households_estimate ?: (int) max(1, round($b->population / $this->householdSize));
    }

    public function nonpotableDemand(Barangay $b): float
    {
        return $b->population * self::NONPOTABLE_SHARE * $this->lpd;
    }

    /** Litres in working public tanks plus covered household drums. */
    public function storageLiters(Barangay $b): int
    {
        $tanks = $b->sites
            ->filter(fn (Site $s) => $s->tank_status === 'installed' && $s->tank_working)
            ->sum('tank_liters');

        return (int) $tanks + ($b->latestForm->covered_drums ?? 0) * $this->drumLiters;
    }

    /**
     * @return array<string, mixed>
     */
    public function metrics(Barangay $b, float $extraStorage = 0, ?float $adoptionOverride = null): array
    {
        $form = $b->latestForm;
        $households = $this->households($b);
        $reusing = $adoptionOverride !== null
            ? (int) round($households * $adoptionOverride)
            : min($form->reusing_households ?? 0, $households);
        $adoption = $reusing / $households;

        $greywater = $b->population * self::GREYWATER_SHARE * $this->lpd;
        $greywaterPerHousehold = $this->householdSize * self::GREYWATER_SHARE * $this->lpd;
        $nonpotable = $this->nonpotableDemand($b);
        $storage = $this->storageLiters($b) + $extraStorage;
        $days = round($storage / $nonpotable, 1);
        $formIsCurrent = $form instanceof BarangayForm && $form->period === self::currentPeriod();

        return [
            'greywater_lpd' => (int) round($greywater),
            'flushing_demand_lpd' => (int) round($b->population * self::FLUSHING_SHARE * $this->lpd),
            'nonpotable_demand_lpd' => (int) round($nonpotable),
            'reusing_households' => $reusing,
            'households' => $households,
            'adoption_rate' => round($adoption, 3),
            // A reusing household reuses only part of its greywater (reuse_fraction, assumed).
            'reuse_gap_lpd' => (int) round(max(0, $greywater - $reusing * $greywaterPerHousehold * $this->reuseFraction)),
            'storage_liters' => (int) round($storage),
            'days_of_cover' => $days,
            'readiness_score' => (int) round(
                50 * min($days / $this->targetDays, 1) + 30 * min($adoption / 0.5, 1) + ($formIsCurrent ? 20 : 0)
            ),
            'status' => $this->status($days),
            'data_status' => [
                'population' => 'real',
                'storage' => 'simulated',
                'adoption' => 'simulated',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function barangaySummary(Barangay $b): array
    {
        return [
            'id' => $b->id,
            'name' => $b->name,
            'population' => $b->population,
            'population_year' => $b->population_year,
            'location' => $b->latitude !== null ? ['lat' => $b->latitude, 'lng' => $b->longitude] : null,
            'outage_vulnerability' => $b->outage_vulnerability,
            'metrics' => $this->metrics($b),
        ];
    }

    public function rainYieldLpd(Site $site): ?int
    {
        if (! $site->roof_area_m2) {
            return null;
        }

        // mm × m² = litres; × runoff coefficient; averaged per day over the last year.
        return (int) round($this->annualRainMm * $site->roof_area_m2 * $this->runoff / 365);
    }

    /**
     * @return array<string, mixed>
     */
    public function site(Site $site): array
    {
        $tankDays = $site->tank_status === 'installed' && $site->tank_liters && $site->nonpotable_demand_lpd
            ? round($site->tank_liters / $site->nonpotable_demand_lpd, 1)
            : null;

        return [
            'id' => $site->id,
            'barangay_id' => $site->barangay_id,
            'name' => $site->name,
            'kind' => $site->kind,
            'category' => $site->category,
            'location' => ['lat' => $site->latitude, 'lng' => $site->longitude],
            'roof_area_m2' => $site->roof_area_m2,
            'source_types' => $site->source_types,
            'greywater_lpd' => $site->greywater_lpd,
            'rain_yield_lpd' => $this->rainYieldLpd($site),
            'nonpotable_demand_lpd' => $site->nonpotable_demand_lpd,
            'tank' => [
                'status' => $site->tank_status,
                'liters' => $site->tank_liters,
                'covered' => $site->tank_covered,
                'working' => $site->tank_working,
                // How long a full tank keeps this building's toilets and cleaning running.
                'days_of_cover' => $tankDays,
            ],
            'data_status' => $site->data_status,
        ];
    }

    /**
     * Source-to-use matching for one site.
     *
     * @return list<array<string, mixed>>
     */
    public function matches(Site $site): array
    {
        /** @var list<array{source: string, label: string, allowed: list<string>, storage: string, default_decision: string}> $rules */
        $rules = config('reuse.rules');
        /** @var array<string, string> $uses */
        $uses = config('reuse.uses');
        $rules = collect($rules)->keyBy('source');

        // Uses that make sense where the water is produced.
        $siteUses = $site->kind === 'business'
            ? ['cleaning', 'landscaping', 'floor_cleaning', 'plants']
            : ['flushing', 'floor_washing', 'plants', 'subsurface_watering', 'floor_cleaning'];

        $matches = [];
        foreach ($site->source_types as $source) {
            $rule = $rules->get($source);
            if (! $rule) {
                continue;
            }

            $liters = match ($source) {
                'rain' => $this->rainYieldLpd($site) ?? 0,
                'light_greywater', 'wash_water' => $site->greywater_lpd ?? 0,
                'condensate' => 20,
                default => 0,
            };

            $allowed = array_values(array_intersect($rule['allowed'], $siteUses));
            if ($allowed === []) {
                $matches[] = $this->match($source, $rule['label'], 'none', 'discharge', 0, $rule['storage'], $uses);

                continue;
            }

            foreach ($allowed as $use) {
                $matches[] = $this->match($source, $rule['label'], $use, $rule['default_decision'], $liters, $rule['storage'], $uses);
            }
        }

        return $matches;
    }

    /**
     * @param  array<string, string>  $uses
     * @return array<string, mixed>
     */
    private function match(string $source, string $label, string $use, string $decision, int $liters, string $storage, array $uses): array
    {
        return [
            'source' => $source,
            'use' => $use,
            'decision' => $decision,
            'liters_per_day' => $liters,
            'reason' => __(config('reuse.reasons.'.$decision), [
                'source' => $label,
                'use' => strtolower($uses[$use] ?? $use),
            ]),
            'safety_note' => $storage === 'none' ? 'Never reuse.' : ucfirst($storage).'. Never for drinking.',
        ];
    }

    /**
     * @param  Collection<int, Barangay>  $barangays
     * @param  array{barangay_ids: list<int>|null, public_tanks: int, tank_liters: int, cards: int, drum_covers: int, adoption_rate: float}  $input
     * @return array<string, mixed>
     */
    public function programPreview(Collection $barangays, array $input): array
    {
        $targets = $input['barangay_ids'] === null
            ? $barangays
            : $barangays->whereIn('id', $input['barangay_ids']);
        $count = max($targets->count(), 1);

        $tanks = $input['public_tanks'] * $targets->count();
        $liters = $tanks * $input['tank_liters'] + $input['drum_covers'] * $this->drumLiters;
        $extraPerBarangay = $liters / $count;

        $rows = $targets->map(function (Barangay $b) use ($extraPerBarangay, $input) {
            $before = $this->metrics($b);
            $after = $this->metrics($b, $extraPerBarangay, $input['adoption_rate']);

            return [
                'id' => $b->id,
                'days_before' => $before['days_of_cover'],
                'days_after' => $after['days_of_cover'],
                'status_before' => $before['status'],
                'status_after' => $after['status'],
                'greywater_reused_lpd_before' => $before['greywater_lpd'] - $before['reuse_gap_lpd'],
                'greywater_reused_lpd_after' => $after['greywater_lpd'] - $after['reuse_gap_lpd'],
            ];
        })->values();

        $costs = (array) ($this->lgu->settings['costs_php'] ?? []);
        $tankCost = (array) ($costs['tank_site'] ?? ['min' => 17000, 'max' => 30000]);
        $coverCost = (array) ($costs['drum_cover'] ?? ['min' => 155, 'max' => 210]);
        $cardCost = (float) ($costs['guidance_card'] ?? 8);
        $training = $tanks + $input['cards'] > 0 ? (float) ($costs['training_session'] ?? 15000) : 0;
        // Bigger tanks cost more; 1,000 L is the quoted size.
        $sizeFactor = max(1, $input['tank_liters'] / 1000);

        $cost = fn (string $k) => (int) round(
            $tanks * (float) $tankCost[$k] * $sizeFactor
            + $input['drum_covers'] * (float) $coverCost[$k]
            + $input['cards'] * $cardCost
            + $training
        );
        $costPhp = ['min' => $cost('min'), 'max' => $cost('max')];

        $funding = (array) ($this->lgu->settings['funding'] ?? []);
        $share = (array) ($funding['preparedness_share_php'] ?? ['min' => 35000000]);
        $rollout = (array) ($this->lgu->settings['rollout_per_year_php'] ?? ['min' => 900000, 'max' => 1700000]);

        return [
            'cost_php' => $costPhp,
            'liters_secured' => (int) $liters,
            'days_of_cover' => [
                'before' => round((float) $rows->avg('days_before'), 1),
                'after' => round((float) $rows->avg('days_after'), 1),
            ],
            'phases' => [
                ['phase' => 1, 'label' => "Pilot, {$targets->count()} ".Str::plural('barangay', $targets->count()).', 6 months', 'cost_php' => $costPhp, 'tanks' => $tanks, 'drum_covers' => $input['drum_covers'], 'cards' => $input['cards']],
                ['phase' => 2, 'label' => 'Citywide rollout, per year (years 2–3)', 'cost_php' => ['min' => (int) $rollout['min'], 'max' => (int) $rollout['max']], 'tanks' => 2 * $barangays->count(), 'drum_covers' => 0, 'cards' => 0],
            ],
            'funding_tag' => (string) ($funding['source'] ?? 'LDRRMF outside the 30% Quick Response Fund (RA 10121)'),
            'share_of_funding' => round($costPhp['max'] / max((float) $share['min'], 1), 4),
            'barangays' => $rows->all(),
        ];
    }

    /**
     * @param  Collection<int, Barangay>  $barangays
     * @param  array{barangay_ids: list<int>|null, public_tanks: int, tank_liters: int, cards: int, drum_covers: int, adoption_rate: float}|null  $program
     * @return array<string, mixed>
     */
    public function outageRun(Collection $barangays, OutageScenario $scenario, ?array $program = null): array
    {
        $extra = [];
        if ($program !== null) {
            $targets = $program['barangay_ids'] === null ? $barangays : $barangays->whereIn('id', $program['barangay_ids']);
            $liters = $program['public_tanks'] * $targets->count() * $program['tank_liters'] + $program['drum_covers'] * $this->drumLiters;
            foreach ($targets as $b) {
                $extra[$b->id] = $liters / max($targets->count(), 1);
            }
        }

        $affected = $scenario->affected_barangay_ids;

        $results = $barangays->map(function (Barangay $b) use ($extra, $affected, $scenario) {
            $storage = $this->storageLiters($b) + ($extra[$b->id] ?? 0);
            // Storage only has to replace the share of piped supply that is lost.
            $draw = max($this->nonpotableDemand($b) * $scenario->supply_loss, 1);
            $days = round($storage / $draw, 1);
            $isAffected = $affected === null || in_array($b->id, $affected, true);

            $outcome = match (true) {
                ! $isAffected, $days >= $scenario->duration_days => 'holds',
                $days >= 1 => 'partial',
                default => 'fails',
            };

            return [
                'barangay_id' => $b->id,
                'days_of_cover' => $days,
                'shortfall_liters' => $isAffected ? (int) round(max(0, $scenario->duration_days * $draw - $storage)) : 0,
                'outcome' => $outcome,
                'status' => ['holds' => 'green', 'partial' => 'amber', 'fails' => 'red'][$outcome],
                'suggested_site_id' => $outcome === 'holds' ? null : $this->bestCandidateSite($b)?->id,
            ];
        })->values();

        return [
            'scenario' => $this->scenario($scenario),
            'results' => $results->all(),
            'summary' => [
                'holds' => $results->where('outcome', 'holds')->count(),
                'partial' => $results->where('outcome', 'partial')->count(),
                'fails' => $results->where('outcome', 'fails')->count(),
            ],
        ];
    }

    /** The candidate roof that would catch the most rain. */
    public function bestCandidateSite(Barangay $b): ?Site
    {
        return $b->sites
            ->where('kind', 'public_building')
            ->where('tank_status', 'candidate')
            ->sortByDesc('roof_area_m2')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function scenario(OutageScenario $s): array
    {
        return [
            'id' => $s->id,
            'slug' => $s->slug,
            'name' => $s->name,
            'description' => $s->description,
            'duration_days' => $s->duration_days,
            'supply_loss' => $s->supply_loss,
        ];
    }

    /**
     * @param  Collection<int, Barangay>  $barangays
     * @return array<string, mixed>
     */
    public function storageRegistry(Collection $barangays): array
    {
        $rows = $barangays->map(function (Barangay $b) {
            $tanks = $b->sites->where('tank_status', 'installed');

            return [
                'barangay_id' => $b->id,
                'name' => $b->name,
                'public_tanks' => [
                    'count' => $tanks->count(),
                    'working' => $tanks->where('tank_working', true)->count(),
                    'covered' => $tanks->where('tank_covered', true)->count(),
                    'liters' => (int) $tanks->where('tank_working', true)->sum('tank_liters'),
                ],
                'covered_drums' => $b->latestForm->covered_drums ?? 0,
                'storage_liters' => $this->storageLiters($b),
                'days_of_cover' => round($this->storageLiters($b) / $this->nonpotableDemand($b), 1),
                'drums_per_household_for_target' => $this->drumsPerHouseholdForTarget(),
                'last_form_at' => $b->latestForm?->submitted_at?->toIso8601ZuluString(),
                'data_status' => 'simulated',
            ];
        })->values();

        $demand = $barangays->sum(fn (Barangay $b) => $this->nonpotableDemand($b));

        return [
            'rows' => $rows->all(),
            'totals' => [
                'public_tanks' => $rows->sum('public_tanks.count'),
                'covered_drums' => $rows->sum('covered_drums'),
                'storage_liters' => $rows->sum('storage_liters'),
                'days_of_cover' => round($rows->sum('storage_liters') / max($demand, 1), 2),
            ],
        ];
    }

    /** Drums a household needs to hold the target days of non-potable use (about 3 for 3 days). */
    public function drumsPerHouseholdForTarget(): int
    {
        $householdDemand = $this->householdSize * self::NONPOTABLE_SHARE * $this->lpd;

        return (int) ceil($householdDemand * $this->targetDays / $this->drumLiters);
    }

    private function lastTwelveMonthsRain(): ?float
    {
        $months = $this->lgu->rainfall()->orderByDesc('year')->orderByDesc('month')->limit(12)->pluck('rainfall_mm');

        return $months->count() === 12 ? (float) $months->sum() : null;
    }
}
