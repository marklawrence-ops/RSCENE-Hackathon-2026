<?php

namespace App\Console\Commands;

use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\Site;
use App\Support\Boundaries;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Loads real public buildings, tanks and businesses (e.g. the City Engineering survey) from a CSV.
 * Template: database/data/templates/sites_import_template.csv. Nothing changes without running it,
 * and --dry-run checks a file without writing anything.
 */
class ImportSites extends Command
{
    protected $signature = 'sites:import
        {file : Path to the CSV}
        {--lgu=catbalogan : LGU slug}
        {--replace : Remove SIMULATED sites in the barangays this file covers}
        {--dry-run : Check the file and report, without saving}';

    protected $description = 'Import real public buildings, tanks and businesses from a CSV';

    private const KINDS = ['public_building', 'business'];

    private const TANK_STATUSES = ['none', 'candidate', 'installed'];

    private const SOURCES = ['rain', 'light_greywater', 'wash_water', 'condensate', 'kitchen', 'toilet'];

    public function handle(): int
    {
        $lgu = Lgu::where('slug', $this->option('lgu'))->first();
        if (! $lgu) {
            $this->error("No LGU with slug '{$this->option('lgu')}'.");

            return self::FAILURE;
        }

        $path = (string) $this->argument('file');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $barangays = $lgu->barangays()->get()->keyBy(fn (Barangay $b) => mb_strtolower($b->name));
        [$rows, $errors, $warnings] = $this->parse($path, $lgu, $barangays);

        foreach ($warnings as $w) {
            $this->warn($w);
        }
        if ($errors !== []) {
            foreach ($errors as $e) {
                $this->error($e);
            }
            $this->error(count($errors).' problem(s) found. Nothing was imported.');

            return self::FAILURE;
        }

        $barangayIds = collect($rows)->pluck('barangay_id')->unique()->values();
        $toRemove = $this->option('replace')
            ? Site::where('lgu_id', $lgu->id)->whereIn('barangay_id', $barangayIds)->where('data_status', 'simulated')->count()
            : 0;

        if ($this->option('dry-run')) {
            $this->info(sprintf('Dry run: %d row(s) are valid across %d barangay(s).%s Nothing was saved.',
                count($rows), $barangayIds->count(), $this->option('replace') ? " {$toRemove} simulated site(s) would be removed." : ''));

            return self::SUCCESS;
        }

        $created = $updated = 0;
        DB::transaction(function () use ($rows, $lgu, $barangayIds, &$created, &$updated) {
            if ($this->option('replace')) {
                Site::where('lgu_id', $lgu->id)->whereIn('barangay_id', $barangayIds)->where('data_status', 'simulated')->delete();
            }
            foreach ($rows as $row) {
                $site = Site::updateOrCreate(
                    ['lgu_id' => $lgu->id, 'barangay_id' => $row['barangay_id'], 'name' => $row['name']],
                    $row + ['lgu_id' => $lgu->id, 'data_status' => 'real'],
                );
                $site->wasRecentlyCreated ? $created++ : $updated++;
            }
        });

        $this->info(sprintf('Imported %d site(s): %d new, %d updated.%s',
            count($rows), $created, $updated, $this->option('replace') ? " Removed {$toRemove} simulated site(s)." : ''));

        return self::SUCCESS;
    }

    /**
     * @param  Collection<string, Barangay>  $barangays
     * @return array{0: list<array<string, mixed>>, 1: list<string>, 2: list<string>}
     */
    private function parse(string $path, Lgu $lgu, Collection $barangays): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return [[], ["Could not open {$path}"], []];
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), fgetcsv($handle) ?: []);
        $required = ['barangay', 'name', 'kind', 'category', 'latitude', 'longitude'];
        $missing = array_diff($required, $header);
        if ($missing !== []) {
            fclose($handle);

            return [[], ['Missing column(s): '.implode(', ', $missing)], []];
        }

        $rows = $errors = $warnings = [];
        $line = 1;
        while (($cells = fgetcsv($handle)) !== false) {
            $line++;
            if ($cells === [null] || implode('', array_map('strval', $cells)) === '') {
                continue;
            }
            $r = array_combine($header, array_pad(array_map(fn ($c) => trim((string) $c), $cells), count($header), ''));
            $at = "Line {$line}";

            $barangay = $barangays->get(mb_strtolower($r['barangay']));
            if (! $barangay) {
                $errors[] = "{$at}: unknown barangay '{$r['barangay']}'.";

                continue;
            }
            if ($r['name'] === '') {
                $errors[] = "{$at}: name is empty.";
            }
            if (! in_array($r['kind'], self::KINDS, true)) {
                $errors[] = "{$at}: kind must be ".implode(' or ', self::KINDS).'.';
            }
            if (! is_numeric($r['latitude']) || ! is_numeric($r['longitude'])) {
                $errors[] = "{$at}: latitude and longitude must be numbers.";

                continue;
            }

            $lat = (float) $r['latitude'];
            $lng = (float) $r['longitude'];
            $rings = Boundaries::rings($lgu->slug, $barangay->name);
            if ($rings !== [] && ! Boundaries::contains($rings, $lat, $lng)) {
                $warnings[] = "{$at}: {$r['name']} lies outside Brgy. {$barangay->name}'s boundary. Check the coordinates.";
            }

            $sources = array_values(array_filter(array_map('trim', explode('|', $r['source_types'] ?? ''))));
            if ($sources === []) {
                $sources = $r['kind'] === 'business' ? ['wash_water'] : ['rain'];
            }
            if ($bad = array_diff($sources, self::SOURCES)) {
                $errors[] = "{$at}: unknown source type(s) ".implode(', ', $bad).'.';
            }

            $tank = ($r['tank_status'] ?? '') !== '' ? $r['tank_status'] : 'none';
            if (! in_array($tank, self::TANK_STATUSES, true)) {
                $errors[] = "{$at}: tank_status must be ".implode(', ', self::TANK_STATUSES).'.';
            }
            if ($tank === 'installed' && ! ctype_digit($r['tank_liters'] ?? '')) {
                $errors[] = "{$at}: an installed tank needs tank_liters (a whole number).";
            }

            $rows[] = [
                'barangay_id' => $barangay->id,
                'name' => $r['name'],
                'kind' => $r['kind'],
                'category' => $r['category'] !== '' ? $r['category'] : ($r['kind'] === 'business' ? 'business' : 'public_building'),
                'latitude' => round($lat, 6),
                'longitude' => round($lng, 6),
                'roof_area_m2' => $this->intOrNull($r['roof_area_m2'] ?? ''),
                'source_types' => $sources,
                'greywater_lpd' => $this->intOrNull($r['greywater_lpd'] ?? ''),
                'nonpotable_demand_lpd' => $this->intOrNull($r['nonpotable_demand_lpd'] ?? ''),
                'tank_status' => $tank,
                'tank_liters' => $tank === 'installed' ? $this->intOrNull($r['tank_liters'] ?? '') : null,
                'tank_covered' => $tank === 'installed' ? $this->yes($r['tank_covered'] ?? '') : null,
                'tank_working' => $tank === 'installed' ? $this->yes($r['tank_working'] ?? '') : null,
            ];
        }
        fclose($handle);

        return [$rows, $errors, $warnings];
    }

    private function intOrNull(string $v): ?int
    {
        return $v !== '' && is_numeric($v) ? (int) round((float) $v) : null;
    }

    private function yes(string $v): bool
    {
        return in_array(strtolower($v), ['yes', 'y', 'true', '1'], true);
    }
}
