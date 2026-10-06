<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

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
