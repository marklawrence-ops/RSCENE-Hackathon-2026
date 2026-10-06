<?php

namespace App\Support;

/**
 * Barangay boundary polygons per LGU, stored as GeoJSON in database/data/boundaries/{slug}.geojson.
 * Catbalogan: PSA/NAMRIA boundaries (PSGC Q4 2023) via faeldon/philippines-json-maps (MIT).
 */
class Boundaries
{
    /** @var array<string, array<string, mixed>|null> */
    private static array $cache = [];

    /**
     * @return array<string, mixed>|null
     */
    public static function geojson(string $lguSlug): ?array
    {
        if (! array_key_exists($lguSlug, self::$cache)) {
            $path = database_path("data/boundaries/{$lguSlug}.geojson");
            /** @var array<string, mixed>|null $data */
            $data = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
            self::$cache[$lguSlug] = $data;
        }

        return self::$cache[$lguSlug];
    }

    /**
     * Outer rings of a barangay's polygon(s) as [lng, lat] points.
     *
     * @return list<list<array{0: float, 1: float}>>
     */
    public static function rings(string $lguSlug, string $barangayName): array
    {
        /** @var list<array{properties: array{name: string}, geometry: array{type: string, coordinates: array<mixed>}}> $features */
        $features = self::geojson($lguSlug)['features'] ?? [];

        foreach ($features as $feature) {
            if ($feature['properties']['name'] !== $barangayName) {
                continue;
            }
            $geometry = $feature['geometry'];
            /** @var list<list<list<array{0: float, 1: float}>>> $polygons */
            $polygons = $geometry['type'] === 'Polygon' ? [$geometry['coordinates']] : $geometry['coordinates'];

            return array_map(fn (array $polygon) => $polygon[0], $polygons);
        }

        return [];
    }

    /**
     * @param  list<list<array{0: float, 1: float}>>  $rings
     */
    public static function contains(array $rings, float $lat, float $lng): bool
    {
        foreach ($rings as $ring) {
            $inside = false;
            for ($i = 0, $k = count($ring) - 1; $i < count($ring); $k = $i++) {
                [$xi, $yi] = $ring[$i];
                [$xk, $yk] = $ring[$k];
                if (($yi > $lat) !== ($yk > $lat) && $lng < ($xk - $xi) * ($lat - $yi) / ($yk - $yi) + $xi) {
                    $inside = ! $inside;
                }
            }
            if ($inside) {
                return true;
            }
        }

        return false;
    }

    /**
     * A stable pseudo-random point inside the barangay, or null if it has no polygon.
     *
     * @return array{latitude: float, longitude: float}|null
     */
    public static function pointInside(string $lguSlug, string $barangayName, string $seed): ?array
    {
        $rings = self::rings($lguSlug, $barangayName);
        if ($rings === []) {
            return null;
        }

        $points = array_merge(...$rings);
        $lngs = array_column($points, 0);
        $lats = array_column($points, 1);
        if ($lngs === [] || $lats === []) {
            return null;
        }
        [$minLng, $maxLng, $minLat, $maxLat] = [min($lngs), max($lngs), min($lats), max($lats)];

        for ($try = 0; $try < 500; $try++) {
            $lat = $minLat + self::unit($seed.'lat'.$try) * ($maxLat - $minLat);
            $lng = $minLng + self::unit($seed.'lng'.$try) * ($maxLng - $minLng);
            if (self::contains($rings, $lat, $lng)) {
                return ['latitude' => round($lat, 6), 'longitude' => round($lng, 6)];
            }
        }

        return null;
    }

    private static function unit(string $key): float
    {
        return (crc32($key) % 100000) / 100000;
    }
}
