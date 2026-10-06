<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $lgu_id
 * @property int $barangay_id
 * @property string $name
 * @property string $kind
 * @property string $category
 * @property float $latitude
 * @property float $longitude
 * @property int|null $roof_area_m2
 * @property list<string> $source_types
 * @property int|null $greywater_lpd
 * @property int|null $nonpotable_demand_lpd
 * @property string $tank_status
 * @property int|null $tank_liters
 * @property bool|null $tank_covered
 * @property bool|null $tank_working
 * @property string $data_status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Barangay $barangay
 */
#[Fillable([
    'lgu_id', 'barangay_id', 'name', 'kind', 'category', 'latitude', 'longitude', 'roof_area_m2',
    'source_types', 'greywater_lpd', 'nonpotable_demand_lpd', 'tank_status', 'tank_liters', 'tank_covered', 'tank_working', 'data_status',
])]
class Site extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'source_types' => 'array',
            'tank_covered' => 'boolean',
            'tank_working' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Barangay, $this>
     */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }
}
