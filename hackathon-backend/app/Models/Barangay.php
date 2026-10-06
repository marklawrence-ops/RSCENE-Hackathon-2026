<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
}
