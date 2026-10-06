<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

#[Table('rainfall_monthly')]
#[Fillable(['lgu_id', 'year', 'month', 'rainfall_mm', 'source'])]
class RainfallMonthly extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rainfall_mm' => 'float',
        ];
    }
}
