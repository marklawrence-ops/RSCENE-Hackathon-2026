<?php

namespace App\Console\Commands;

use App\Models\Lgu;
use App\Models\RainfallMonthly;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncRainfall extends Command
{
    protected $signature = 'rainfall:sync {lgu=catbalogan : LGU slug} {--months=24 : How many past months to fetch}';

    protected $description = 'Fetch monthly rainfall totals for an LGU from the Open-Meteo archive';

    public function handle(): int
    {
        $lgu = Lgu::where('slug', $this->argument('lgu'))->firstOrFail();
        $months = max(1, (int) $this->option('months'));

        // The archive lags a few days behind, so stop at the end of last month.
        $end = now()->subMonthNoOverflow()->endOfMonth();
        $start = $end->copy()->subMonthsNoOverflow($months - 1)->startOfMonth();

        $response = Http::timeout(30)->retry(2, 1000)->get('https://archive-api.open-meteo.com/v1/archive', [
            'latitude' => $lgu->latitude,
            'longitude' => $lgu->longitude,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'daily' => 'precipitation_sum',
            'timezone' => 'Asia/Manila',
        ]);

        if ($response->failed()) {
            $this->error('Open-Meteo request failed: HTTP '.$response->status());

            return self::FAILURE;
        }

        /** @var list<string> $days */
        $days = $response->json('daily.time', []);
        /** @var list<float|null> $mm */
        $mm = $response->json('daily.precipitation_sum', []);

        $totals = [];
        foreach ($days as $i => $day) {
            $key = substr($day, 0, 7);
            $totals[$key] = ($totals[$key] ?? 0) + (float) ($mm[$i] ?? 0);
        }

        foreach ($totals as $key => $total) {
            [$year, $month] = array_map('intval', explode('-', $key));
            RainfallMonthly::updateOrCreate(
                ['lgu_id' => $lgu->id, 'year' => $year, 'month' => $month],
                ['rainfall_mm' => round($total, 1), 'source' => 'open-meteo'],
            );
        }

        $this->info(sprintf('Stored %d months for %s (%s to %s).', count($totals), $lgu->name, $start->toDateString(), $end->toDateString()));

        return self::SUCCESS;
    }
}
