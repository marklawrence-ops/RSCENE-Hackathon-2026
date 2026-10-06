<?php

namespace App\Console\Commands;

use App\Models\BarangayForm;
use App\Models\Lgu;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Removes barangay forms filed by the demo accounts (…@demo.test), so a rehearsed form demo can be
 * shown again with the same readiness jump. Seeded forms and forms filed by real accounts are kept.
 */
#[Signature('demo:reset
    {--lgu=catbalogan : LGU slug}
    {--force : Skip the confirmation prompt}')]
#[Description('Delete barangay forms filed by the demo accounts, keeping seeded and real forms')]
class DemoReset extends Command
{
    public function handle(): int
    {
        $lgu = Lgu::where('slug', $this->option('lgu'))->first();
        if (! $lgu) {
            $this->error("No LGU with slug '{$this->option('lgu')}'.");

            return self::FAILURE;
        }

        $demoUserIds = User::where('email', 'like', '%@demo.test')->pluck('id');
        $forms = BarangayForm::with('barangay')
            ->whereIn('user_id', $demoUserIds)
            ->whereIn('barangay_id', $lgu->barangays()->select('id'))
            ->orderBy('submitted_at')
            ->get();

        if ($forms->isEmpty()) {
            $this->info('No forms filed by demo accounts. Nothing to reset.');

            return self::SUCCESS;
        }

        $this->table(
            ['Barangay', 'Period', 'Channel', 'Submitted'],
            $forms->map(fn (BarangayForm $f) => [$f->barangay->name, $f->period, $f->channel, $f->submitted_at->toDateTimeString()])->all(),
        );

        if (! $this->option('force') && ! $this->confirm("Delete these {$forms->count()} form(s)?", true)) {
            $this->line('Nothing deleted.');

            return self::SUCCESS;
        }

        BarangayForm::whereIn('id', $forms->pluck('id'))->delete();
        $this->info("Deleted {$forms->count()} form(s) filed by demo accounts. Seeded and real forms are untouched.");

        return self::SUCCESS;
    }
}
