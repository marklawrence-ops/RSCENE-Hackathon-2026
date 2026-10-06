<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string $province
 * @property float $latitude
 * @property float $longitude
 * @property array<string, mixed> $settings
 * @property bool $is_simulated
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['slug', 'name', 'province', 'latitude', 'longitude', 'settings', 'is_simulated'])]
class Lgu extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'settings' => 'array',
            'is_simulated' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Barangay, $this>
     */
    public function barangays(): HasMany
    {
        return $this->hasMany(Barangay::class);
    }

    /**
     * @return HasMany<Site, $this>
     */
    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }

    /**
     * @return HasMany<OutageScenario, $this>
     */
    public function outageScenarios(): HasMany
    {
        return $this->hasMany(OutageScenario::class);
    }

    /**
     * @return HasMany<RainfallMonthly, $this>
     */
    public function rainfall(): HasMany
    {
        return $this->hasMany(RainfallMonthly::class);
    }
}
