<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\OutageScenario;
use App\Models\RainfallMonthly;
use App\Models\Site;
use App\Services\WaterModel;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LguController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'lgus' => Lgu::orderBy('id')->get()->map(fn (Lgu $lgu) => self::lguPayload($lgu)),
        ]);
    }

    public function barangays(Lgu $lgu): JsonResponse
    {
        $model = WaterModel::for($lgu);
        $barangays = self::barangaysWithData($lgu);
        $summaries = $barangays->map(fn (Barangay $b) => $model->barangaySummary($b));

        $storage = $summaries->sum('metrics.storage_liters');
        $demand = $summaries->sum('metrics.nonpotable_demand_lpd');

        return response()->json([
            'lgu' => self::lguPayload($lgu),
            'settings' => $model->publicSettings(),
            'totals' => [
                'population' => $summaries->sum('population'),
                'greywater_lpd' => $summaries->sum('metrics.greywater_lpd'),
                'storage_liters' => $storage,
                'days_of_cover' => round($storage / max($demand, 1), 2),
                'status_counts' => [
                    'green' => $summaries->where('metrics.status', 'green')->count(),
                    'amber' => $summaries->where('metrics.status', 'amber')->count(),
                    'red' => $summaries->where('metrics.status', 'red')->count(),
                ],
            ],
            'barangays' => $summaries->values(),
        ]);
    }

    public function sites(Request $request, Lgu $lgu): JsonResponse
    {
        $request->validate(['kind' => ['nullable', Rule::in(['public_building', 'business'])]]);
        $model = WaterModel::for($lgu);

        $sites = $lgu->sites()
            ->when($request->query('kind'), fn ($q, $kind) => $q->where('kind', $kind))
            ->orderBy('id')
            ->get();

        return response()->json(['sites' => $sites->map(fn (Site $s) => $model->site($s))]);
    }

    public function outageScenarios(Lgu $lgu): JsonResponse
    {
        $model = WaterModel::for($lgu);

        return response()->json([
            'scenarios' => $lgu->outageScenarios()->orderBy('id')->get()->map(fn (OutageScenario $s) => $model->scenario($s)),
        ]);
    }

    public function storage(Lgu $lgu): JsonResponse
    {
        return response()->json(WaterModel::for($lgu)->storageRegistry(self::barangaysWithData($lgu)));
    }

    public function rainfall(Lgu $lgu): JsonResponse
    {
        $months = $lgu->rainfall()->orderBy('year')->orderBy('month')->get();

        return response()->json([
            'months' => $months->map(fn (RainfallMonthly $m) => [
                'year' => $m->year,
                'month' => $m->month,
                'rainfall_mm' => $m->rainfall_mm,
                'source' => $m->source,
            ]),
            'annual_mm' => round(WaterModel::for($lgu)->annualRainMm()),
            'data_status' => $months->contains('source', 'open-meteo') ? 'real' : 'assumed',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function lguPayload(Lgu $lgu): array
    {
        return [
            'id' => $lgu->id,
            'slug' => $lgu->slug,
            'name' => $lgu->name,
            'province' => $lgu->province,
            'center' => ['lat' => $lgu->latitude, 'lng' => $lgu->longitude],
            'is_simulated' => $lgu->is_simulated,
        ];
    }

    /**
     * @return Collection<int, Barangay>
     */
    public static function barangaysWithData(Lgu $lgu): Collection
    {
        return $lgu->barangays()->with(['sites', 'latestForm'])->orderBy('id')->get();
    }
}
