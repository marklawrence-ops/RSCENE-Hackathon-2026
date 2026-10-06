<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\BarangayFormController;
use App\Http\Controllers\Api\LguController;
use App\Http\Controllers\Api\ReuseController;
use App\Http\Controllers\Api\SimulationController;
use Illuminate\Support\Facades\Route;

// Contract: docs/api-contract.md. Everything lives under /api/v1.
Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'env' => app()->environment(),
        'time' => now()->toIso8601String(),
    ]));

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    // Public reads: the map, scores and registry are public information.
    Route::get('/lgus', [LguController::class, 'index']);
    Route::get('/lgus/{lgu:slug}/barangays', [LguController::class, 'barangays']);
    Route::get('/lgus/{lgu:slug}/sites', [LguController::class, 'sites']);
    Route::get('/lgus/{lgu:slug}/outage-scenarios', [LguController::class, 'outageScenarios']);
    Route::get('/lgus/{lgu:slug}/storage', [LguController::class, 'storage']);
    Route::get('/lgus/{lgu:slug}/rainfall', [LguController::class, 'rainfall']);
    Route::get('/lgus/{lgu:slug}/boundaries', [LguController::class, 'boundaries']);
    Route::get('/barangays/{barangay}', [BarangayController::class, 'show']);
    Route::get('/barangays/{barangay}/forms', [BarangayController::class, 'forms']);
    Route::get('/reuse-rules', [ReuseController::class, 'rules']);
    Route::get('/sites/{site}/matches', [ReuseController::class, 'matches']);

    // Stateless what-ifs (POST because they take a program body; nothing is saved).
    Route::middleware('throttle:120,1')->group(function () {
        Route::post('/lgus/{lgu:slug}/outage-runs', [SimulationController::class, 'outageRun']);
        Route::post('/lgus/{lgu:slug}/program-preview', [SimulationController::class, 'programPreview']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/barangay-forms', [BarangayFormController::class, 'store']);
    });
});
