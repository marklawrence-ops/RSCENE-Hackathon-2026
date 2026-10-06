<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BarangayForm;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class BarangayFormController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'client_uuid' => ['required', 'uuid'],
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
            'period' => ['required', 'string', 'regex:/^\d{4}-(Q[1-4]|PRE-TYPHOON)$/'],
            'tanks_working' => ['required', 'integer', 'min:0', 'lte:tanks_total'],
            'tanks_total' => ['required', 'integer', 'min:0', 'max:1000'],
            'covered_drums' => ['required', 'integer', 'min:0', 'max:100000'],
            'reusing_households' => ['required', 'integer', 'min:0', 'lte:households_estimate'],
            'households_estimate' => ['required', 'integer', 'min:1', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'channel' => ['required', 'in:app,paper'],
            'submitted_at' => ['required', 'date'],
        ]);

        // Offline queues retry; the same device UUID returns the stored form instead of a duplicate.
        $existing = BarangayForm::where('client_uuid', $data['client_uuid'])->first();
        if ($existing) {
            return response()->json(['form' => self::payload($existing)]);
        }

        if ($user->role === 'barangay' && $user->barangay_id !== (int) $data['barangay_id']) {
            abort(403, 'You can only submit forms for your own barangay.');
        }

        $form = BarangayForm::create([
            ...$data,
            'user_id' => $user->id,
            'submitted_at' => Carbon::parse($data['submitted_at'])->utc(),
        ]);

        return response()->json(['form' => self::payload($form)], 201);
    }

    /**
     * @return array<string, mixed>
     */
    public static function payload(BarangayForm $form): array
    {
        return [
            'id' => $form->id,
            'client_uuid' => $form->client_uuid,
            'barangay_id' => $form->barangay_id,
            'period' => $form->period,
            'tanks_working' => $form->tanks_working,
            'tanks_total' => $form->tanks_total,
            'covered_drums' => $form->covered_drums,
            'reusing_households' => $form->reusing_households,
            'households_estimate' => $form->households_estimate,
            'notes' => $form->notes,
            'channel' => $form->channel,
            'submitted_at' => $form->submitted_at->toIso8601ZuluString(),
            'created_at' => $form->created_at?->toIso8601ZuluString(),
        ];
    }
}
