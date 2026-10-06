"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { endpoints } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";
import { days, liters, num, STATUS } from "@/lib/format";
import type { BarangaySummary, Rainfall, StorageRegistry } from "@/lib/types";
import { useLguData } from "@/lib/use-lgu-data";
import { Icon, type IconName } from "../shell/icon";

const BarangayMap = dynamic(() => import("../map/barangay-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>,
});

const NO_SITES: never[] = [];
const NO_SUGGESTIONS = new Set<number>();

type Tone = "cyan" | "violet" | "green" | "amber";
const TONE: Record<Tone, { icon: string; badge: string }> = {
  cyan: { icon: "bg-brand-soft text-brand", badge: "bg-[#dff5f6] text-[#117c85]" },
  violet: { icon: "bg-[#f6ecf9] text-[#aa65c1]", badge: "bg-[#f2e4f7] text-[#7a3f8f]" },
  green: { icon: "bg-[#edf7ee] text-[#4b9f5a]", badge: "bg-[#dff2d8] text-[#2f6e2a]" },
  amber: { icon: "bg-[#faf1e3] text-[#bd7d29]", badge: "bg-[#f9ecd7] text-[#7f5214]" },
};

function quarterLabel() {
  const d = new Date();
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
}

function inCurrentQuarter(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
}

export function OverviewScreen() {
  const router = useRouter();
  const { data, error } = useLguData();
  const user = useAuthUser();
  const isStaff = user?.role === "planner" || user?.role === "cdrrmo";
  const myBarangay = user?.barangay_id && data ? (data.list.barangays.find((b) => b.id === user.barangay_id) ?? null) : null;
  const [rain, setRain] = useState<Rainfall | null>(null);
  const [registry, setRegistry] = useState<StorageRegistry | null>(null);

  const slug = data?.list.lgu.slug;
  useEffect(() => {
    if (!slug) return;
    endpoints.rainfall(slug).then(setRain).catch(() => {});
    endpoints.storage(slug).then(setRegistry).catch(() => {});
  }, [slug]);

  const colorFor = useCallback((b: BarangaySummary) => STATUS[b.metrics.status].color, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { totals, barangays } = data.list;
    const households = barangays.reduce((s, b) => s + b.metrics.households, 0);
    const reusing = barangays.reduce((s, b) => s + b.metrics.reusing_households, 0);
    return {
      greywater: totals.greywater_lpd,
      storage: totals.storage_liters,
      cover: totals.days_of_cover,
      adoption: reusing / Math.max(households, 1),
      ready: totals.status_counts.green,
      count: barangays.length,
    };
  }, [data]);

  // Action queue, computed from live data.
  const actions = useMemo(() => {
    if (!data) return [];
    const { barangays } = data.list;
    const list: { tone: Tone; icon: IconName; tag: string; title: string; detail: string; href: string }[] = [];

    if (myBarangay) {
      const row = registry?.rows.find((r) => r.barangay_id === myBarangay.id);
      const filed = row ? inCurrentQuarter(row.last_form_at) : false;
      list.push({
        tone: filed ? "green" : "amber",
        icon: "clipboard",
        tag: "YOUR BARANGAY",
        title: `${myBarangay.name}: ${days(myBarangay.metrics.days_of_cover)} of stored water, readiness ${myBarangay.metrics.readiness_score}/100`,
        detail: filed ? `Your ${quarterLabel()} form is in.` : `Your ${quarterLabel()} form isn't in yet. Filing it adds 20 readiness points.`,
        href: "/form",
      });
    }

    const smallRed = barangays.filter((b) => b.metrics.status === "red").sort((a, b) => a.population - b.population)[0];
    if (smallRed) {
      list.push({
        tone: "amber",
        icon: "storm",
        tag: "OUTAGE RISK",
        title: `${smallRed.name} runs out in under a day`,
        detail: user
          ? `${days(smallRed.metrics.days_of_cover)} of stored water. Try tanks and drum covers in the Program Designer.`
          : `${days(smallRed.metrics.days_of_cover)} of stored water. Outage Mode on the Reuse Map shows what a 3-day outage does.`,
        href: user ? "/designer" : "/map",
      });
    }

    const biggestGap = [...barangays].sort((a, b) => b.metrics.reuse_gap_lpd - a.metrics.reuse_gap_lpd)[0];
    if (biggestGap) {
      list.push({
        tone: "violet",
        icon: "people",
        tag: "ADOPTION GAP",
        title: `${biggestGap.name}: ${liters(biggestGap.metrics.reuse_gap_lpd)} of greywater a day unused`,
        detail: user
          ? `${Math.round(biggestGap.metrics.adoption_rate * 100)}% of households reuse today. Schedule the next health-worker round.`
          : `${Math.round(biggestGap.metrics.adoption_rate * 100)}% of households reuse today. The Household Guide shows how to reuse safely.`,
        href: "/map",
      });
    }

    // Operational items are for signed-in staff only.
    if (!user) return list;

    const broken = data.sites.filter((s) => s.tank.status === "installed" && s.tank.working === false);
    if (broken.length) {
      list.push({
        tone: "cyan",
        icon: "wrench",
        tag: "REPAIR",
        title: broken.length === 1 ? `${broken[0].name} tank needs repair` : `${broken.length} public tanks need repair`,
        detail: "A broken tank adds nothing to the barangay's outage reserve.",
        href: "/storage",
      });
    }

    if (registry) {
      const filed = registry.rows.filter((r) => inCurrentQuarter(r.last_form_at)).length;
      list.push({
        tone: filed === registry.rows.length ? "green" : "amber",
        icon: "clipboard",
        tag: "QUARTERLY FORMS",
        title: `${filed} of ${registry.rows.length} barangays reported this quarter`,
        detail: "Each form adds 20 readiness points and updates storage counts.",
        href: "/storage",
      });
    }
    return list;
  }, [data, registry, user, myBarangay]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
      {/* Hero */}
      <section className="relative grid overflow-hidden rounded-2xl border border-line bg-[linear-gradient(105deg,#ffffff_0%,#ffffff_53%,#eef9f9_100%)] shadow-[0_2px_7px_rgba(25,66,70,.08)] md:grid-cols-[1.1fr_.9fr]">
        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-11">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-brand">{user ? `WELCOME BACK, ${user.name.toUpperCase()}` : `${(data?.list.lgu.name ?? "Catbalogan City").toUpperCase()} · PUBLIC VIEW`}</p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-5xl">
            Every drop gets
            <br />
            <em className="text-brand not-italic">a second purpose.</em>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#687274]">
            {isStaff
              ? "Your planning tools are ready: price a program, track stored water, and run outage scenarios before typhoon season."
              : user
                ? `File ${myBarangay ? `Brgy. ${myBarangay.name}'s` : "your barangay's"} quarterly form, even offline, and see how its readiness compares across the city.`
                : "Plan safe reuse, strengthen local storage, and prepare every barangay for the next water interruption. Anyone can explore the map and the household guide."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/map" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-brand-dark">
              <Icon name="map" size={17} /> Open Reuse Map
            </Link>
            {(() => {
              const second = isStaff
                ? { href: "/designer", icon: "sliders" as const, label: "Open Program Designer" }
                : user
                  ? { href: "/form", icon: "clipboard" as const, label: `File ${quarterLabel()} form` }
                  : { href: "/login", icon: "people" as const, label: "Staff sign in" };
              return (
                <Link
                  href={second.href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#cbd2d3] bg-white px-5 text-sm font-extrabold transition hover:-translate-y-px"
                >
                  <Icon name={second.icon} size={17} /> {second.label}
                </Link>
              );
            })()}
          </div>
        </div>
        <div className="relative hidden min-h-[300px] place-items-center md:grid" aria-hidden="true">
          <div className="absolute h-[280px] w-[280px] rounded-full border border-[rgba(27,149,159,.19)]" />
          <div className="absolute h-[205px] w-[205px] rounded-full border border-[rgba(27,149,159,.19)]" />
          <div className="grid h-[142px] w-[142px] place-items-center rounded-full bg-white shadow-[0_0_0_12px_#e3f7f8]">
            <Image src="/logo.png" alt="" width={112} height={112} />
          </div>
          <FloatCard className="top-[22%] left-[6%]" icon="rain" value={rain ? `${num(rain.annual_mm)} mm` : "…"} label="rain, last 12 months" />
          <FloatCard className="right-[6%] bottom-[18%]" icon="tank" value={data ? `${data.sites.length} sites` : "…"} label="buildings & businesses mapped" />
        </div>
      </section>

      {/* Stats */}
      <SectionTitle eyebrow="NETWORK PULSE" title="Today at a glance" aside={<span className="text-xs text-muted">Live from the API · storage and adoption simulated</span>} />
      {error && !data ? (
        <p className="text-sm text-red-600">Could not load data: {error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="droplet" tone="cyan" label="Reuse potential" value={stats ? liters(stats.greywater) : "…"} detail="light greywater every day" />
          <StatCard icon="storage" tone="cyan" label="Water secured" value={stats ? liters(stats.storage) : "…"} detail={stats ? `${days(stats.cover)} of non-potable demand` : ""} />
          <StatCard icon="trend" tone="violet" label="Adoption rate" value={stats ? `${Math.round(stats.adoption * 100)}%` : "…"} detail="households reusing greywater" />
          <StatCard icon="shield" tone="green" label="Barangays ready" value={stats ? `${stats.ready} / ${stats.count}` : "…"} detail="at the 3-day target" />
        </div>
      )}

      {/* Map + actions */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
        <div>
          <SectionTitle
            eyebrow="REUSE MAP"
            title="Readiness across the city"
            aside={
              <Link href="/map" className="flex items-center gap-1 text-sm font-extrabold text-brand">
                View full map <Icon name="chevron" size={14} />
              </Link>
            }
          />
          <section className="overflow-hidden rounded-2xl border border-[#dbe1e2] bg-white shadow-[0_2px_6px_rgba(26,57,60,.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className={`rounded-xl px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${TONE.green.badge}`}>LIVE PLANNING VIEW</span>
                <strong className="text-sm">{data?.list.lgu.name ?? "…"} reuse map</strong>
              </div>
              <div className="flex gap-3 text-xs text-muted">
                {(["green", "amber", "red"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS[s].color }} />
                    {STATUS[s].label}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-[340px]">
              {data && (
                <BarangayMap
                  barangays={data.list.barangays}
                  boundaries={data.boundaries}
                  colorFor={colorFor}
                  selectedId={null}
                  onSelect={() => router.push("/map")}
                  sites={NO_SITES}
                  selectedSiteId={null}
                  onSelectSite={() => {}}
                  suggestedSiteIds={NO_SUGGESTIONS}
                  defaultBounds={data.list.lgu.default_bounds}
                  view="town"
                />
              )}
            </div>
          </section>
        </div>

        <aside>
          <SectionTitle
            eyebrow={user ? "PRIORITIES" : "HIGHLIGHTS"}
            title={user ? "Action queue" : "What the data shows"}
            aside={user && actions.length ? <span className={`rounded-xl px-2 py-0.5 text-[10px] font-extrabold ${TONE.violet.badge}`}>{actions.length} OPEN</span> : null}
          />
          <div className="divide-y divide-[#e7eaea] rounded-2xl border border-[#dde2e3] bg-white shadow-[0_2px_5px_rgba(27,56,58,.07)]">
            {actions.length === 0 && <p className="p-4 text-sm text-muted">Loading…</p>}
            {actions.map((a) => (
              <Link key={a.tag} href={a.href} className="flex items-start gap-3 p-4 transition hover:bg-[#f7fbfb]">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[a.tone].icon}`}>
                  <Icon name={a.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`inline-block rounded-xl px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${TONE[a.tone].badge}`}>{a.tag}</span>
                  <strong className="mt-1 block text-sm leading-snug">{a.title}</strong>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#5f6869]">{a.detail}</span>
                </span>
                <Icon name="chevron" className="mt-3 shrink-0 text-[#9aa3a4]" />
              </Link>
            ))}
          </div>
          {!user && (
            <div className="mt-3 rounded-2xl bg-[#eff7f7] p-4">
              <strong className="block text-sm">Planning tools for LGU and barangay staff</strong>
              <p className="mt-1 text-xs leading-relaxed text-[#5f6869]">
                The Program Designer, Storage Registry and Barangay Form open after sign-in. Households don&apos;t need an account.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-extrabold text-white hover:bg-brand-dark">
                  Sign in <Icon name="chevron" size={14} />
                </Link>
                <Link href="/guide" className="inline-flex min-h-9 items-center rounded-full border border-[#cbd2d3] bg-white px-4 text-xs font-extrabold">
                  Household guide
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3.5 flex items-end justify-between gap-3">
      <div>
        <span className="mb-1 block text-[10px] font-extrabold tracking-[0.18em] text-brand">{eyebrow}</span>
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

function StatCard({ icon, tone, label, value, detail }: { icon: IconName; tone: Tone; label: string; value: string; detail: string }) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[tone].icon}`}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <span className="block text-xs leading-snug font-bold text-[#5f6869]">{label}</span>
        <strong className="my-0.5 block truncate text-xl font-extrabold tabular-nums">{value}</strong>
        <small className="block text-[11px] leading-snug text-[#5f6869]">{detail}</small>
      </div>
    </article>
  );
}

function FloatCard({ className, icon, value, label }: { className: string; icon: IconName; value: string; label: string }) {
  return (
    <div className={`absolute flex min-w-[150px] items-center gap-2.5 rounded-xl border border-[#dde3e4] bg-white px-3.5 py-2.5 text-brand shadow-[0_3px_9px_rgba(30,65,67,.09)] ${className}`}>
      <Icon name={icon} />
      <span className="text-sm font-extrabold text-foreground">
        {value}
        <small className="block text-[10px] font-semibold text-[#7c8587]">{label}</small>
      </span>
    </div>
  );
}
