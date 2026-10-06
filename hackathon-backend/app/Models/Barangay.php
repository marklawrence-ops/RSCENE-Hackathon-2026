<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $lgu_id
 * @property string $name
 * @property int $population
 * @property int $population_year
 * @property int|null $households
 * @property float|null $latitude
 * @property float|null $longitude
 * @property float $outage_vulnerability
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Lgu $lgu
 * @property-read Collection<int, Site> $sites
 * @property-read BarangayForm|null $latestForm
 */
#[Fillable(['lgu_id', 'name', 'population', 'population_year', 'households', 'latitude', 'longitude', 'outage_vulnerability'])]
class Barangay extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'outage_vulnerability' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Lgu, $this>
     */
    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }

    /**
     * @return HasMany<Site, $this>
     */
    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }

    /**
     * @return HasMany<BarangayForm, $this>
     */
    public function forms(): HasMany
    {
        return $this->hasMany(BarangayForm::class);
    }

    /**
     * @return HasOne<BarangayForm, $this>
     */
    public function latestForm(): HasOne
    {
        return $this->hasOne(BarangayForm::class)->latestOfMany('submitted_at');
    }
}
