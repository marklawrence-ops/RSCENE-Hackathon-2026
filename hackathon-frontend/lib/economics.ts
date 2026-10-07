import type { LguSettings } from "./types";

// Peso values use the water district's published base tariff (before VAT). They are TARIFF EQUIVALENTS:
// what the freed treated water would cost a household at that rate, not the utility's own savings.
export type Tariff = { min_charge_php: number; min_m3: number; php_per_m3: number };

// Catbalogan Water District, 1/2" domestic connection (LWUA Region 8 rates as of June 30, 2023).
const DEFAULT_TARIFF: Tariff = { min_charge_php: 200, min_m3: 10, php_per_m3: 22.15 };
const GREYWATER_SHARE = 0.52; // bathing + laundry, the same split the backend uses

export const tariffOf = (s: LguSettings): Tariff => s.tariff ?? DEFAULT_TARIFF;

/** Litres a day → cubic metres a year. */
export const m3PerYear = (litersPerDay: number) => (litersPerDay * 365) / 1000;

/** Peso value of that water a year at the per-m³ rate (tariff equivalent). */
export const tariffEquivalent = (litersPerDay: number, t: Tariff) => m3PerYear(litersPerDay) * t.php_per_m3;

/** Monthly bill on the base tariff for a given use (the 11–20 m³ step covers a typical household). */
const bill = (m3: number, t: Tariff) => t.min_charge_php + Math.max(0, m3 - t.min_m3) * t.php_per_m3;

/** A typical household's monthly bill before and after reusing its share of rinse water. */
export function householdSaving(s: LguSettings) {
  const t = tariffOf(s);
  const useM3 = (s.household_size * s.liters_per_person_day * 30) / 1000;
  const reuseM3 = (s.household_size * s.liters_per_person_day * GREYWATER_SHARE * s.reuse_fraction * 30) / 1000;
  const before = bill(useM3, t);
  const after = bill(useM3 - reuseM3, t);
  return { useM3, reuseM3, before, after, perMonth: before - after, perYear: (before - after) * 12 };
}
