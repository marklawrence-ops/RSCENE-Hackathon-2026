<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $client_uuid
 * @property int $barangay_id
 * @property int|null $user_id
 * @property string $period
 * @property int $tanks_working
 * @property int $tanks_total
 * @property int $covered_drums
 * @property int $reusing_households
 * @property int $households_estimate
 * @property string|null $notes
 * @property string $channel
 * @property Carbon $submitted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'client_uuid', 'barangay_id', 'user_id', 'period', 'tanks_working', 'tanks_total', 'covered_drums',
    'reusing_households', 'households_estimate', 'notes', 'channel', 'submitted_at',
])]
class BarangayForm extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
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
