"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { num } from "@/lib/format";
import { Icon } from "./icon";

// Live weather for Catbalogan from Open-Meteo (free, no key). Tap for a 4-day rain outlook
// and what that rain means for AGOS: water a roof can catch, and turbid-source risk.
const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=11.7753&longitude=124.8829" +
  "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max" +
  "&forecast_days=4&timezone=Asia%2FManila";

const REFRESH_MS = 30 * 60 * 1000;
// Typical household roof and runoff share (same 0.8 the backend uses for roofs).
const HOUSEHOLD_ROOF_M2 = 40;
const RUNOFF = 0.8;
// A day this wet can turn the main source turbid, as in July 2026.
const HEAVY_RAIN_MM = 50;

// WMO weather codes → label.
const CODES: [number, string][] = [
  [0, "Clear"],
  [2, "Partly cloudy"],
  [3, "Cloudy"],
  [48, "Fog"],
  [57, "Drizzle"],
  [67, "Rain"],
  [77, "Rain"],
  [82, "Showers"],
  [99, "Thunderstorm"],
];
const label = (code: number) => (CODES.find(([max]) => code <= max) ?? [0, "Weather"])[1];
const isWet = (code: number) => code >= 51;

type Day = { date: string; code: number; max: number; min: number; rain: number; chance: number | null };
type Data = { temp: number; feels: number; humidity: number; code: number; days: Day[]; at: Date };

type Raw = {
  current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
  };
};

function parse(j: Raw): Data {
  const d = j.daily;
  return {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    humidity: Math.round(j.current.relative_humidity_2m),
    code: j.current.weather_code,
    days: d.time.map((date, i) => ({
      date,
      code: d.weather_code[i],
      max: Math.round(d.temperature_2m_max[i]),
      min: Math.round(d.temperature_2m_min[i]),
      rain: d.precipitation_sum[i] ?? 0,
      chance: d.precipitation_probability_max[i],
    })),
    at: new Date(),
  };
}

const dayName = (date: string, i: number) =>
  i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "short", timeZone: "Asia/Manila" });

export function Weather() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(URL)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j: Raw) => !cancelled && setData(parse(j)))
        .catch(() => {}); // Offline or blocked: keep the last reading, or show nothing.
    load();
    const id = window.setInterval(load, REFRESH_MS);
    window.addEventListener("online", load);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", load);
    };
  }, []);

  // Close on outside tap or Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!data) return null;

  const totalRain = data.days.reduce((s, d) => s + d.rain, 0);
  const roofLiters = totalRain * HOUSEHOLD_ROOF_M2 * RUNOFF;
  const heavy = data.days.find((d) => d.rain >= HEAVY_RAIN_MM);

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Weather in Catbalogan: ${data.temp}°C, ${label(data.code)}. Show rain outlook`}
        className="flex items-center gap-2 rounded-xl py-1 pr-1 pl-2 transition hover:bg-white/15 sm:border-l sm:border-white/30 sm:pl-4"
      >
        <Icon name={isWet(data.code) ? "rain" : "droplet"} size={18} />
        <span className="text-left text-sm leading-tight font-bold">
          {data.temp}°C<small className="block text-[11px] font-medium text-white/75">{label(data.code)}</small>
        </span>
        {heavy && <span className="h-2 w-2 rounded-full bg-[#ffd27a]" aria-hidden />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Catbalogan weather and rain outlook"
          className="absolute top-full right-0 z-[3000] mt-2 w-[min(340px,calc(100vw-1.5rem))] rounded-2xl border border-black/5 bg-white p-4 text-foreground shadow-[0_12px_32px_rgba(20,60,64,.18)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-brand">CATBALOGAN NOW</p>
              <p className="mt-1 text-3xl leading-none font-extrabold tabular-nums">{data.temp}°C</p>
              <p className="mt-1 text-xs text-[#5f6869]">
                {label(data.code)} · feels like {data.feels}°C · humidity {data.humidity}%
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-[#667072] hover:bg-zinc-100" aria-label="Close weather">
              <Icon name="close" size={18} />
            </button>
          </div>

          <ul className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {data.days.map((d, i) => (
              <li key={d.date} className={`rounded-xl px-1 py-2 ${d.rain >= HEAVY_RAIN_MM ? "bg-[#f8e8cf]" : "bg-[#f1f8f8]"}`}>
                <p className="text-[11px] font-bold">{dayName(d.date, i)}</p>
                <p className="mt-1 text-[11px] text-[#5f6869]">
                  {d.max}° / {d.min}°
                </p>
                <p className="mt-1 text-sm font-extrabold text-[#1d6870] tabular-nums">{Math.round(d.rain)} mm</p>
                {d.chance !== null && <p className="text-[10px] text-[#5f6869]">{d.chance}% chance</p>}
              </li>
            ))}
          </ul>

          <div className="mt-3 rounded-xl bg-[#eaf7f8] px-3 py-2.5 text-xs leading-snug">
            <p className="font-extrabold text-[#137e88]">Rain to catch</p>
            <p className="mt-0.5 text-[#44514f]">
              About <strong>{Math.round(totalRain)} mm</strong> expected in 4 days. A {HOUSEHOLD_ROOF_M2} m² roof could fill about{" "}
              <strong>{num(roofLiters)} L</strong>, or {Math.floor(roofLiters / 200)} covered 200 L drums.
            </p>
          </div>

          {heavy && (
            <div className="mt-2 rounded-xl bg-[#f8e8cf] px-3 py-2.5 text-xs leading-snug">
              <p className="font-extrabold text-[#8c5a17]">Heavy rain {dayName(heavy.date, data.days.indexOf(heavy)).toLowerCase()}</p>
              <p className="mt-0.5 text-[#5c4a2e]">
                {Math.round(heavy.rain)} mm can make the main source turbid, as in July 2026.{" "}
                <Link href="/map?outage=1" onClick={() => setOpen(false)} className="font-bold text-[#8c5a17] underline">
                  Check Outage Mode
                </Link>
              </p>
            </div>
          )}

          <p className="mt-3 text-[10px] text-[#7d8789]">
            Open-Meteo forecast · updated {data.at.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
          </p>
        </div>
      )}
    </div>
  );
}
