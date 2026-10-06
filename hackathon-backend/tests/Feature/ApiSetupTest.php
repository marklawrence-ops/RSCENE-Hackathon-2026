<?php

use App\Models\Barangay;
use App\Models\OutageScenario;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('health endpoint responds', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok');
});

test('cors allows the configured frontend origin', function () {
    $this->withHeaders(['Origin' => 'http://localhost:3000'])
        ->getJson('/api/v1/health')
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
});

test('seeder loads all PSA barangays for Catbalogan', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Barangay::count())->toBe(57)
        ->and((int) Barangay::sum('population'))->toBe(106440)
        ->and(OutageScenario::where('slug', 'turbid-power-cut')->exists())->toBeTrue();
});

test('token login, me and logout', function () {
    $this->seed(DatabaseSeeder::class);

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => 'cdrrmo@demo.test',
        'password' => 'password',
        'device_name' => 'test',
    ])->assertOk()->assertJsonPath('user.role', 'cdrrmo')->json('token');

    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('user.email', 'cdrrmo@demo.test');

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
});

test('login rejects a wrong password', function () {
    $this->seed(DatabaseSeeder::class);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'cdrrmo@demo.test',
        'password' => 'wrong',
        'device_name' => 'test',
    ])->assertUnprocessable();
});
