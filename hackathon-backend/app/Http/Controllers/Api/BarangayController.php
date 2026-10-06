<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use App\Models\Site;
use App\Services\WaterModel;
use Illuminate\Http\JsonResponse;

class BarangayController extends Controller
{
    public function show(Barangay $barangay): JsonResponse
    {
        $barangay->load(['lgu', 'sites', 'latestForm']);
        $model = WaterModel::for($barangay->lgu);

        return response()->json([
            'barangay' => $model->barangaySummary($barangay),
            'per_person_lpd' => $model->perPersonLpd(),
            'sites' => $barangay->sites->sortBy('id')->values()->map(fn (Site $s) => $model->site($s)),
            'latest_form' => $barangay->latestForm ? BarangayFormController::payload($barangay->latestForm) : null,
            'drums_per_household_for_target' => $model->drumsPerHouseholdForTarget(),
        ]);
    }

    public function forms(Barangay $barangay): JsonResponse
    {
        return response()->json([
            'forms' => $barangay->forms()->latest('submitted_at')->get()->map(BarangayFormController::payload(...)),
        ]);
    }
}
