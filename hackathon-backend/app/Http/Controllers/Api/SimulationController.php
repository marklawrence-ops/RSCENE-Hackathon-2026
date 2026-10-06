<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lgu;
use App\Services\WaterModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Stateless "what if" endpoints: nothing here is saved. */
class SimulationController extends Controller
{
    public function outageRun(Request $request, Lgu $lgu): JsonResponse
    {
        $data = $request->validate([
            'scenario' => ['required', 'string', Rule::exists('outage_scenarios', 'slug')->where('lgu_id', $lgu->id)],
            'program' => ['nullable', 'array'],
            ...$this->programRules($lgu, 'program.', required: false),
        ]);

        $scenario = $lgu->outageScenarios()->where('slug', $data['scenario'])->firstOrFail();
        $program = isset($data['program']) ? $this->programInput($data['program']) : null;

        return response()->json(
            WaterModel::for($lgu)->outageRun(LguController::barangaysWithData($lgu), $scenario, $program)
        );
    }

    public function programPreview(Request $request, Lgu $lgu): JsonResponse
    {
        $data = $request->validate($this->programRules($lgu));

        return response()->json(
            WaterModel::for($lgu)->programPreview(LguController::barangaysWithData($lgu), $this->programInput($data))
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function programRules(Lgu $lgu, string $prefix = '', bool $required = true): array
    {
        $req = $required ? 'required' : 'required_with:'.rtrim($prefix, '.');

        return [
            // Missing or null means the whole LGU.
            $prefix.'barangay_ids' => ['nullable', 'array', 'max:100'],
            $prefix.'barangay_ids.*' => ['integer', Rule::exists('barangays', 'id')->where('lgu_id', $lgu->id)],
            $prefix.'public_tanks' => [$req, 'integer', 'min:0', 'max:50'],
            $prefix.'tank_liters' => [$req, 'integer', 'min:100', 'max:20000'],
            $prefix.'cards' => [$req, 'integer', 'min:0', 'max:100000'],
            $prefix.'drum_covers' => [$req, 'integer', 'min:0', 'max:100000'],
            $prefix.'adoption_rate' => [$req, 'numeric', 'min:0', 'max:1'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{barangay_ids: list<int>|null, public_tanks: int, tank_liters: int, cards: int, drum_covers: int, adoption_rate: float}
     */
    private function programInput(array $data): array
    {
        $ids = $data['barangay_ids'] ?? null;

        return [
            'barangay_ids' => is_array($ids) ? array_values(array_map('intval', $ids)) : null,
            'public_tanks' => (int) $data['public_tanks'],
            'tank_liters' => (int) $data['tank_liters'],
            'cards' => (int) $data['cards'],
            'drum_covers' => (int) $data['drum_covers'],
            'adoption_rate' => (float) $data['adoption_rate'],
        ];
    }
}
