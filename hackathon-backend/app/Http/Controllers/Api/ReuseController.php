<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Site;
use App\Services\WaterModel;
use Illuminate\Http\JsonResponse;

class ReuseController extends Controller
{
    public function rules(): JsonResponse
    {
        return response()->json([
            'rules' => config('reuse.rules'),
            'uses' => config('reuse.uses'),
            'storage_rules' => config('reuse.storage_rules'),
        ]);
    }

    public function matches(Site $site): JsonResponse
    {
        $site->load('barangay.lgu');

        return response()->json([
            'site_id' => $site->id,
            'matches' => WaterModel::for($site->barangay->lgu)->matches($site),
        ]);
    }
}
