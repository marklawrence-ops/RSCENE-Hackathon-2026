<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $lgu_id
 * @property int $year
 * @property int $month
 * @property float $rainfall_mm
 * @property string $source
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
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
