<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'lgu_id', 'barangay_id', 'name', 'kind', 'category', 'latitude', 'longitude', 'roof_area_m2',
    'source_types', 'greywater_lpd', 'tank_status', 'tank_liters', 'tank_covered', 'tank_working', 'data_status',
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
