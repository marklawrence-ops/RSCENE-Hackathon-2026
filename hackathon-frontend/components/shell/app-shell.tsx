"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { User } from "@/lib/types";
import { Icon, type IconName } from "./icon";

const NAV: { href: string; label: string; icon: IconName; match?: string }[] = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/map", label: "Reuse Network", icon: "map" },
  { href: "/map?outage=1", label: "Outage Mode", icon: "storm", match: "never" },
  { href: "/designer", label: "Program Designer", icon: "sliders" },
  { href: "/storage", label: "Storage Registry", icon: "storage" },
  { href: "/form", label: "Barangay Form", icon: "clipboard" },
  { href: "/guide", label: "Household Guide", icon: "book" },
];

const BOTTOM: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "grid" },
  { href: "/map", label: "Network", icon: "map" },
  { href: "/designer", label: "Plan", icon: "sliders" },
  { href: "/form", label: "Form", icon: "clipboard" },
];

// Signed-in user saved by the barangay form (localStorage), read without a hydration mismatch.
function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function readUser(): string | null {
  try {
    return localStorage.getItem("cwnp.user");
  } catch {
    return null;
  }
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border-[3px] border-[#e7f7f8] bg-[linear-gradient(145deg,#d9a3eb,#b86fd0)] text-brand-ink">
        <Icon name="droplet" size={19} />
      </div>
      <div className="leading-none">
        <strong className={`block text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-foreground"}`}>agos</strong>
        <small className={`mt-1 block text-[9px] font-bold tracking-[0.16em] ${light ? "text-white/80" : "text-brand"}`}>CIRCULAR WATER</small>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const rawUser = useSyncExternalStore(subscribeStorage, readUser, () => null);
  const user = rawUser ? (JSON.parse(rawUser) as User) : null;

  return (
    <div className="flex h-full flex-col px-4 pt-6 pb-4">
      <Link href="/" onClick={onNavigate} className="px-1">
        <Logo />
      </Link>
      <p className="mx-3 mt-9 mb-2.5 text-[10px] font-extrabold tracking-[0.18em] text-[#92999a]">PLANNING PORTAL</p>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.match !== "never" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? "bg-[#eaf7f8] text-[#137e88]" : "text-[#667072] hover:bg-[#f1f8f8] hover:text-[#177f88]"
              }`}
            >
              <Icon name={item.icon} className={active ? "text-brand" : ""} />
              {item.label}
              {active && <i className="absolute top-1/2 -right-4 h-6 w-[3px] -translate-y-1/2 rounded-l bg-[#4bcbd6]" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-[#f0f4f5] p-4">
        <span className="mb-2.5 grid h-8 w-8 place-items-center rounded-lg bg-white text-brand">
          <Icon name="book" size={18} />
        </span>
        <strong className="block text-sm">Safety guidance</strong>
        <p className="mt-1 mb-2.5 text-xs leading-relaxed text-[#7d8789]">Non-potable reuse rules for households and field teams.</p>
        <Link href="/guide" onClick={onNavigate} className="flex items-center gap-1 text-xs font-extrabold text-brand">
          Open guide <Icon name="chevron" size={13} />
        </Link>
      </div>

      <div className="-mx-4 mt-4 grid grid-cols-[36px_1fr] items-center gap-2.5 border-t border-[#e6e9ea] px-4 pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d6a3e5] text-xs font-extrabold text-brand-ink">
          {user ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : <Icon name="people" size={16} />}
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-xs">{user ? user.name : "Public view"}</strong>
          {user ? (
            <small className="block text-[11px] text-[#7d8789] capitalize">{user.role === "cdrrmo" ? "CDRRMO" : user.role}</small>
          ) : (
            <Link href="/form" onClick={onNavigate} className="block text-[11px] font-bold text-brand">
              Sign in to submit forms
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const WEATHER: [number, string][] = [
  [0, "Clear"],
  [3, "Cloudy"],
  [48, "Fog"],
  [57, "Drizzle"],
  [67, "Rain"],
  [77, "Rain"],
  [82, "Showers"],
  [99, "Thunderstorm"],
];

function Weather() {
  const [now, setNow] = useState<{ t: number; label: string } | null>(null);
  useEffect(() => {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=11.7753&longitude=124.8829&current=temperature_2m,weather_code&timezone=Asia%2FManila";
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const code = j.current.weather_code as number;
        setNow({ t: Math.round(j.current.temperature_2m), label: (WEATHER.find(([max]) => code <= max) ?? [0, "Weather"])[1] });
      })
      .catch(() => {});
  }, []);
  if (!now) return null;
  return (
    <div className="hidden items-center gap-2 border-l border-white/30 pl-4 sm:flex" title="Open-Meteo, Catbalogan">
      <Icon name="rain" size={18} />
      <span className="text-sm leading-tight font-bold">
        {now.t}°C<small className="block text-[11px] font-medium text-white/75">{now.label}</small>
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-dvh bg-white print:block print:h-auto">
      <aside className="hidden w-[252px] shrink-0 border-r border-[#e4e7e8] bg-white shadow-[3px_0_14px_rgba(32,63,66,.04)] lg:block print:hidden">
        <Sidebar />
      </aside>

      {/* Phone / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-[2000] lg:hidden print:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] max-w-[85vw] bg-white shadow-[15px_0_35px_rgba(29,61,64,.13)]">
            <button className="absolute top-5 right-3 p-2 text-[#667072]" aria-label="Close menu" onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 bg-[linear-gradient(100deg,#6bdbe2_0%,#3eabb5_52%,#397e87_100%)] px-4 text-white sm:px-6 print:hidden">
          <button className="-ml-1 p-1 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="leading-tight">
            <span className="block text-[10px] font-extrabold tracking-[0.16em] text-white/75">ACTIVE LGU</span>
            <span className="text-sm font-bold">Catbalogan City</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Weather />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto print:overflow-visible">{children}</main>

        <nav aria-label="Mobile navigation" className="grid h-16 shrink-0 grid-cols-5 border-t border-[#e1e5e6] bg-white shadow-[0_-2px_7px_rgba(28,56,58,.06)] lg:hidden print:hidden">
          {BOTTOM.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-brand" : "text-[#616b6d]"}`}>
                <Icon name={item.icon} size={21} />
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#616b6d]">
            <Icon name="menu" size={21} />
            More
          </button>
        </nav>
      </div>
    </div>
  );
}
