<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $lgu_id
 * @property string $slug
 * @property string $name
 * @property string $description
 * @property int $duration_days
 * @property float $supply_loss
 * @property list<int>|null $affected_barangay_ids
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['lgu_id', 'slug', 'name', 'description', 'duration_days', 'supply_loss', 'affected_barangay_ids'])]
class OutageScenario extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'supply_loss' => 'float',
            'affected_barangay_ids' => 'array',
        ];
    }
}
