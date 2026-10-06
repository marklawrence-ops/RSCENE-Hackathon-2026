"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, endpoints, getToken } from "@/lib/api";
import { signOutLocally, useAuthUser } from "@/lib/auth";
import { days, num, STATUS } from "@/lib/format";
import { kv, outbox, type QueuedForm, type SentForm } from "@/lib/offline-store";
import type { BarangayFormInput, BarangaySummary, User } from "@/lib/types";
import { LoginCard } from "../auth/login-card";

type CachedBarangay = { id: number; name: string; households: number; population?: number };
type Snapshot = { name: string; readiness: number; days: number };

// What the API receives: the queued item minus the outbox bookkeeping.
const toPayload = (q: QueuedForm): BarangayFormInput => ({
  client_uuid: q.client_uuid,
  barangay_id: q.barangay_id,
  period: q.period,
  tanks_working: q.tanks_working,
  tanks_total: q.tanks_total,
  covered_drums: q.covered_drums,
  reusing_households: q.reusing_households,
  households_estimate: q.households_estimate,
  notes: q.notes,
  channel: q.channel,
  submitted_at: q.submitted_at,
});

const currentQuarter = () => {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
};

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export default function FormScreen() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const user = useAuthUser();
  const [barangays, setBarangays] = useState<CachedBarangay[]>([]);
  const [queue, setQueue] = useState<QueuedForm[]>([]);
  const [sent, setSent] = useState<SentForm[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "wait" | "error"; text: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const syncLock = useRef(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem("cwnp.formIntroSeen") !== "1";
    } catch {
      return true;
    }
  });
  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem("cwnp.formIntroSeen", "1");
    } catch {
      // Not remembered; it shows again next time.
    }
  };

  const refreshLists = useCallback(async () => {
    setQueue(await outbox.all());
    setSent((await kv.get<SentForm[]>("sent")) ?? []);
  }, []);

  const showSnapshot = useCallback(async (barangayId: number) => {
    try {
      const d = await endpoints.barangay(barangayId);
      const m = d.barangay.metrics;
      setSnapshot({ name: d.barangay.name, readiness: m.readiness_score, days: m.days_of_cover });
    } catch {
      // Offline or failed: the snapshot is a nice-to-have.
    }
  }, []);

  /** Sends every pending form. Safe to call often: one run at a time, and the API ignores repeats. */
  const syncAll = useCallback(async () => {
    if (syncLock.current || !getToken()) return;
    syncLock.current = true;
    setSyncing(true);
    let sentCount = 0;
    let lastBarangay: number | null = null;
    try {
      for (const item of await outbox.all()) {
        if (item.status === "failed") continue;
        try {
          const { form } = await endpoints.submitForm(toPayload(item));
          await outbox.remove(item.client_uuid);
          const history = (await kv.get<SentForm[]>("sent")) ?? [];
          await kv.set("sent", [{ ...form, barangay_name: item.barangay_name, synced_at: new Date().toISOString() }, ...history].slice(0, 10));
          sentCount++;
          lastBarangay = form.barangay_id;
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            signOutLocally();
            setNotice({ tone: "error", text: "Your sign-in expired. Sign in again; your forms are still saved on this phone." });
            break;
          }
          if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
            const detail = Object.values(e.errors ?? {})[0]?.[0] ?? e.message;
            await outbox.put({ ...item, status: "failed", error: detail });
            continue;
          }
          break; // Network or server trouble: keep the rest queued and try again later.
        }
      }
    } finally {
      syncLock.current = false;
      setSyncing(false);
      await refreshLists();
    }
    if (sentCount > 0) {
      setNotice({ tone: "ok", text: `Synced ${sentCount} form${sentCount > 1 ? "s" : ""}.` });
      if (lastBarangay) showSnapshot(lastBarangay);
    }
  }, [refreshLists, showSnapshot]);

  // Load the outbox, cached barangays, and try to sync on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshLists();
      const cached = await kv.get<CachedBarangay[]>("barangays");
      if (!cancelled && cached) setBarangays(cached);
      try {
        const { lgus } = await endpoints.lgus();
        const list = await endpoints.barangays(lgus[0].slug);
        const fresh = list.barangays.map((b: BarangaySummary) => ({ id: b.id, name: b.name, households: b.metrics.households, population: b.population }));
        await kv.set("barangays", fresh);
        if (!cancelled) setBarangays(fresh);
      } catch {
        // Offline: the cached list (if any) is used.
      }
      if (!cancelled) syncAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLists, syncAll]);

  // Sync when the connection comes back, and every 30 s while there is work.
  useEffect(() => {
    if (online) syncAll();
  }, [online, syncAll]);
  useEffect(() => {
    if (queue.every((q) => q.status === "failed")) return;
    const t = setInterval(() => navigator.onLine && syncAll(), 30_000);
    return () => clearInterval(t);
  }, [queue, syncAll]);

  if (!user) {
    return (
      <LoginCard
        notice={notice}
        eyebrow="BARANGAY FORM"
        intro="Sign in once while online. After that the form works offline."
        onDone={() => {
          setNotice(null);
          syncAll();
        }}
      />
    );
  }

  const signOut = () => {
    endpoints.logout().catch(() => {});
    signOutLocally();
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">OFFLINE FIELD UPDATE</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Barangay Form</h1>
          <p className="mt-1 text-sm text-muted">Four numbers, once a quarter and once before typhoon season. About 2 minutes.</p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
          role="status"
        >
          {online ? "● Online: forms send right away" : "⚡ Offline: forms are saved on this phone"}
        </span>
      </div>

      {showIntro && (
        <section className="mt-4 rounded-2xl border border-brand/25 bg-[#eff7f7] p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-extrabold">How this form works</h2>
            <button onClick={dismissIntro} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand shadow-sm">
              Got it
            </button>
          </div>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Fill in 4 numbers", "Tanks, covered drums and households reusing water. Estimates are fine; no names are collected."],
              ["2", "Tap Save", "The form is kept on this phone first, so it works without signal."],
              ["3", "It sends itself", "When the phone is back online the form is sent and your barangay's readiness updates."],
            ].map(([n, title, text]) => (
              <li key={n} className="flex gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">{n}</span>
                <span className="text-sm">
                  <strong className="block font-extrabold">{title}</strong>
                  <span className="text-[#5f6869]">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {notice && (
        <p
          className={`mt-4 rounded-xl p-3 text-sm font-medium ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-900" : notice.tone === "wait" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"}`}
          role="status"
        >
          {notice.text}
        </p>
      )}

      {snapshot && (
        <div className="mt-3 rounded-2xl border border-brand/30 bg-brand/5 p-3 text-sm">
          <p className="font-extrabold">Brgy. {snapshot.name} after your form</p>
          <p className="text-[#4f5a5c]">
            Readiness {snapshot.readiness}/100 · stored water covers {days(snapshot.days)}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <FormCard
          user={user}
          barangays={barangays}
          onQueued={async (item) => {
            await outbox.put(item);
            await refreshLists();
            setNotice(
              navigator.onLine
                ? { tone: "wait", text: "Saved. Sending now…" }
                : { tone: "wait", text: "Saved on this phone. It will send by itself when you are back online. You can close the app." },
            );
            if (navigator.onLine) syncAll();
          }}
        />

        <aside className="space-y-3 lg:sticky lg:top-4">
          <section className="rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold">
                Waiting to send <span className="tabular-nums">({queue.length})</span>
              </h2>
              <button
                onClick={syncAll}
                disabled={!online || syncing || queue.length === 0}
                className="rounded-full border border-black/15 px-3 py-1 text-xs font-bold disabled:opacity-40"
              >
                {syncing ? "Sending…" : "⟳ Send now"}
              </button>
            </div>
            {queue.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nothing waiting. Every saved form has been sent.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {queue.map((q) => (
                  <li key={q.client_uuid} className="flex items-start justify-between gap-2">
                    <span>
                      <strong className="font-bold">{q.barangay_name}</strong> · {q.period}
                      {q.status === "failed" ? (
                        <span className="block text-xs text-red-600">Not accepted: {q.error}</span>
                      ) : (
                        <span className="block text-xs text-[#94601b]">Saved on this phone, sends when online</span>
                      )}
                    </span>
                    {q.status === "failed" && (
                      <button
                        onClick={async () => {
                          await outbox.remove(q.client_uuid);
                          await refreshLists();
                        }}
                        className="shrink-0 text-xs font-bold text-red-600 underline"
                      >
                        Discard
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sent.length > 0 && (
            <section className="rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
              <h2 className="text-sm font-extrabold">Sent from this phone</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {sent.map((s) => (
                  <li key={s.client_uuid} className="flex justify-between gap-2">
                    <span>
                      <span style={{ color: STATUS.green.ink }}>✓</span> {s.barangay_name} · {s.period}
                    </span>
                    <span className="text-xs text-muted">{new Date(s.synced_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl bg-[#f2f5f6] p-4 text-xs leading-relaxed text-[#4f5a5c]">
            <h2 className="text-sm font-extrabold text-foreground">Tips</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Ask your barangay health workers: they see the drums and the homes on their usual visits.</li>
              <li>A rough count is fine. Round to the nearest 10 if you are unsure.</li>
              <li>Fill it in again before typhoon season so the CDRRMO plans with fresh numbers.</li>
            </ul>
          </section>

          <p className="text-center text-xs text-muted">
            Signed in as {user.name} ·{" "}
            <button onClick={signOut} className="font-bold underline">
              Sign out
            </button>
          </p>
        </aside>
      </div>
    </div>
  );
}

type Values = { tanks_working: string; tanks_total: string; covered_drums: string; reusing_households: string; households_estimate: string };

const EMPTY: Values = { tanks_working: "", tanks_total: "", covered_drums: "", reusing_households: "", households_estimate: "" };
const draftKey = (barangayId: number | null, period: string) => (barangayId ? `cwnp.draft.${barangayId}.${period}` : null);

function loadDraft(key: string | null): Values {
  if (!key) return EMPTY;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Values>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function saveDraft(key: string | null, values: Values) {
  if (!key) return;
  try {
    if (Object.values(values).every((v) => v === "")) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Storage blocked: the draft lasts until the page closes.
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
type Field = keyof Values | "barangay";

// Liters a public tank holds, for the live preview only (the server uses each tank's real size).
const PREVIEW_TANK_LITERS = 1000;
const DRUM_LITERS = 200;
const NONPOTABLE_LPD = 34.23;
const TARGET_DAYS = 3;

function FormCard({ user, barangays, onQueued }: { user: User; barangays: CachedBarangay[]; onQueued: (item: QueuedForm) => Promise<void> }) {
  const isBarangayUser = user.role === "barangay";
  const [barangayId, setBarangayId] = useState<number | null>(user.barangay_id);
  const [period, setPeriod] = useState(currentQuarter());
  const [channel, setChannel] = useState<"app" | "paper">("app");
  const key = draftKey(barangayId, period);
  const [values, setValues] = useState<Values>(() => loadDraft(key));
  // Switching barangay or period loads that pair's saved draft (React's "adjust state while rendering" pattern).
  const [loadedKey, setLoadedKey] = useState(key);
  if (key !== loadedKey) {
    setLoadedKey(key);
    setValues(loadDraft(key));
  }
  useEffect(() => saveDraft(key, values), [key, values]);
  const hasDraft = Object.values(values).some((v) => v !== "");

  // Tally mode: big +1 / −1 buttons for counting during house visits. Remembered on this phone.
  const [tally, setTally] = useState(() => readFlag("cwnp.tallyMode"));
  const toggleTally = () =>
    setTally((t) => {
      try {
        localStorage.setItem("cwnp.tallyMode", t ? "0" : "1");
      } catch {
        // Not remembered; fine.
      }
      return !t;
    });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const barangay = barangays.find((b) => b.id === barangayId) ?? null;
  const year = new Date().getFullYear();
  const sorted = useMemo(() => [...barangays].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true })), [barangays]);

  const setValue = (k: keyof Values, v: string) => {
    setValues((cur) => ({ ...cur, [k]: v.replace(/[^0-9]/g, "") }));
    setErrors((cur) => ({ ...cur, [k]: undefined }));
  };

  // Steppers add to the latest value, so quick repeated taps all count.
  const step = (k: keyof Values, delta: number) =>
    setValues((cur) => ({ ...cur, [k]: String(Math.max(0, (Number(cur[k]) || 0) + delta)) }));

  // Households default to the barangay's estimate until the user types their own.
  const households = values.households_estimate || (barangay ? String(barangay.households) : "");
  const n = (s: string) => (s === "" ? NaN : Number(s));

  // Live preview of what the numbers mean.
  const preview = useMemo(() => {
    if (!barangay?.population) return null;
    const tanks = Number(values.tanks_working) || 0;
    const drums = Number(values.covered_drums) || 0;
    const stored = tanks * PREVIEW_TANK_LITERS + drums * DRUM_LITERS;
    const d = stored / (barangay.population * NONPOTABLE_LPD);
    const hh = Number(households) || 0;
    const reuse = hh > 0 ? (Number(values.reusing_households) || 0) / hh : 0;
    return { stored, days: d, reuse, drumsNeeded: Math.max(0, Math.ceil((barangay.population * NONPOTABLE_LPD * TARGET_DAYS - stored) / DRUM_LITERS)) };
  }, [barangay, values, households]);

  const status = preview ? (preview.days >= TARGET_DAYS ? "green" : preview.days >= 1 ? "amber" : "red") : "red";
  const touched = values.covered_drums !== "" || values.tanks_total !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = {
      tanks_working: n(values.tanks_working),
      tanks_total: n(values.tanks_total),
      covered_drums: n(values.covered_drums),
      reusing_households: n(values.reusing_households),
      households_estimate: n(households),
    };
    const errs: Partial<Record<Field, string>> = {};
    if (!barangayId) errs.barangay = "Choose a barangay.";
    for (const [k, v] of Object.entries(f)) if (Number.isNaN(v)) errs[k as keyof Values] = "Enter a number (0 if none).";
    if (!errs.tanks_working && !errs.tanks_total && f.tanks_working > f.tanks_total) errs.tanks_working = "Working tanks can't be more than all tanks.";
    if (!errs.households_estimate && f.households_estimate < 1) errs.households_estimate = "At least 1 household.";
    if (!errs.reusing_households && !errs.households_estimate && f.reusing_households > f.households_estimate)
      errs.reusing_households = "Can't be more than all households.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    await onQueued({
      client_uuid: crypto.randomUUID(),
      barangay_id: barangayId!,
      barangay_name: barangay?.name ?? `Barangay ${barangayId}`,
      period,
      ...f,
      notes: notes.trim() || null,
      channel: isBarangayUser ? "app" : channel,
      submitted_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
      status: "pending",
    });
    saveDraft(key, EMPTY);
    setValues(EMPTY);
    setNotes("");
    setSaving(false);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dde2e3] bg-white px-4 py-3 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
        <div className="text-sm">
          <strong className="block font-extrabold">Tally mode</strong>
          <span className="text-xs text-muted">
            Count drums and households with +1 as you visit. Counts stay on this phone until you save{hasDraft ? " (counts saved)" : ""}.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={tally}
          aria-label="Tally mode"
          onClick={toggleTally}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${tally ? "bg-brand" : "bg-zinc-300"}`}
        >
          <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${tally ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <Step n={1} title="Which barangay and period?">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Barangay</span>
            {isBarangayUser ? (
              <span className="mt-1 block rounded-xl bg-[#f2f5f6] px-3 py-2.5 font-semibold">{barangay?.name ?? "Your barangay"}</span>
            ) : (
              <select
                value={barangayId ?? ""}
                onChange={(e) => {
                  setBarangayId(e.target.value ? Number(e.target.value) : null);
                  setErrors((cur) => ({ ...cur, barangay: undefined }));
                }}
                className="mt-1 block w-full rounded-xl border border-black/15 bg-white px-3 py-2.5"
              >
                <option value="">Choose…</option>
                {sorted.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <FieldError msg={errors.barangay} />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block w-full rounded-xl border border-black/15 bg-white px-3 py-2.5">
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={`${year}-Q${q}`}>
                  {year} quarter {q}
                </option>
              ))}
              <option value={`${year}-PRE-TYPHOON`}>{year} before typhoon season</option>
            </select>
            <span className="mt-1 block text-xs text-muted">Usually the current quarter.</span>
          </label>
        </div>
        {!isBarangayUser && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={channel === "paper"} onChange={(e) => setChannel(e.target.checked ? "paper" : "app")} className="h-4 w-4 accent-brand" />
            I am typing in a paper form from the barangay
          </label>
        )}
      </Step>

      <Step n={2} title="How many public rain tanks are working?" hint="Tanks at the barangay hall, school or health center. A tank works if it is covered, holds water and its tap works.">
        <div className="flex flex-wrap items-end gap-3">
          <Stepper label="Working" value={values.tanks_working} onChange={(v) => setValue("tanks_working", v)} onStep={(d) => step("tanks_working", d)} />
          <span className="pb-3 text-sm text-muted">out of</span>
          <Stepper label="All tanks" value={values.tanks_total} onChange={(v) => setValue("tanks_total", v)} onStep={(d) => step("tanks_total", d)} />
        </div>
        <FieldError msg={errors.tanks_working ?? errors.tanks_total} />
      </Step>

      <Step n={3} title="How many covered rain drums are there?" hint="Count drums that have a lid and hold rainwater. Don't count open drums or drums of tap water.">
        <BigNumber label="Covered rain drums" value={values.covered_drums} onChange={(v) => setValue("covered_drums", v)} suffix="drums" placeholder="e.g. 140" />
        {tally && <TallyButtons label="covered drum" onStep={(d) => step("covered_drums", d)} />}
        <FieldError msg={errors.covered_drums} />
      </Step>

      <Step n={4} title="How many households reuse water?" hint="Counts: laundry rinse water used to flush; shower water poured on plants. Doesn't count: kitchen sink water.">
        <div className="flex flex-wrap items-end gap-3">
          <BigNumber label="Reusing" value={values.reusing_households} onChange={(v) => setValue("reusing_households", v)} placeholder="e.g. 40" />
          <span className="pb-3 text-sm text-muted">out of</span>
          <BigNumber label="All households" value={households} onChange={(v) => setValue("households_estimate", v)} />
        </div>
        {preview && Number(values.reusing_households) > 0 && (
          <p className="mt-1.5 text-xs text-muted">That is {Math.round(preview.reuse * 100)}% of households.</p>
        )}
        {tally && <TallyButtons label="household reusing" onStep={(d) => step("reusing_households", d)} />}
        <FieldError msg={errors.reusing_households ?? errors.households_estimate} />
        <p className="mt-1 text-xs text-muted">All-households number comes from the census; change it if you know better.</p>
      </Step>

      {preview && touched && (
        <section className="rounded-2xl border-2 p-4" style={{ borderColor: STATUS[status].color }} aria-live="polite">
          <p className="text-[10px] font-extrabold tracking-[0.16em] text-brand">WHAT THIS MEANS</p>
          <p className="mt-1 text-sm">
            Brgy. {barangay?.name} would have about <strong className="text-base font-extrabold">{days(preview.days)}</strong> of water for toilets and
            cleaning if the supply stops (target {TARGET_DAYS} days).
          </p>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e6ebec]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (preview.days / TARGET_DAYS) * 100))}%`, backgroundColor: STATUS[status].color }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {preview.drumsNeeded > 0 ? `About ${num(preview.drumsNeeded)} more covered drums would reach ${TARGET_DAYS} days.` : "This meets the 3-day target."} Estimate:
            tanks counted at {num(PREVIEW_TANK_LITERS)} L, drums at {DRUM_LITERS} L.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
        <label className="block text-sm">
          <span className="font-bold">Anything else? (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="e.g. The school tank's gutter needs cleaning."
            className="mt-1 block w-full rounded-xl border border-black/15 bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-3 w-full rounded-full bg-brand py-3.5 text-base font-extrabold text-white shadow-[0_7px_18px_rgba(22,141,152,.18)] transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save form"}
        </button>
        <p className="mt-2 text-center text-xs text-muted">Saved on this phone first, then sent automatically. No household names are collected.</p>
      </section>
    </form>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold leading-snug">{title}</h2>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Big tap targets for counting on the move; the number above stays editable. */
function TallyButtons({ label, onStep }: { label: string; onStep: (delta: number) => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="h-14 w-16 rounded-2xl border border-black/15 bg-white text-xl font-extrabold text-[#5f6869] active:bg-zinc-100"
        aria-label={`Remove one ${label}`}
      >
        −1
      </button>
      <button
        type="button"
        onClick={() => onStep(1)}
        className="h-14 flex-1 rounded-2xl bg-brand text-base font-extrabold text-white shadow-[0_5px_14px_rgba(22,141,152,.2)] active:bg-brand-dark"
      >
        +1 {label}
      </button>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <span className="mt-1 block text-xs font-semibold text-red-600">{msg}</span> : null;
}

/** Small counts: − and + buttons around the number. */
function Stepper({ label, value, onChange, onStep }: { label: string; value: string; onChange: (v: string) => void; onStep: (delta: number) => void }) {
  return (
    <label className="block text-xs font-bold text-[#4f5a5c]">
      {label}
      <span className="mt-1 flex items-center overflow-hidden rounded-xl border border-black/15 bg-white">
        <button type="button" onClick={() => onStep(-1)} className="h-11 w-11 text-xl font-bold text-brand hover:bg-brand-soft" aria-label={`${label}: one less`}>
          −
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-11 w-14 border-x border-black/10 text-center text-lg font-extrabold tabular-nums outline-none"
        />
        <button type="button" onClick={() => onStep(1)} className="h-11 w-11 text-xl font-bold text-brand hover:bg-brand-soft" aria-label={`${label}: one more`}>
          +
        </button>
      </span>
    </label>
  );
}

function BigNumber({ label, value, onChange, suffix, placeholder }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string }) {
  return (
    <label className="block text-xs font-bold text-[#4f5a5c]">
      {label}
      <span className="mt-1 flex items-center gap-2 rounded-xl border border-black/15 bg-white px-3 focus-within:border-[#42bec8] focus-within:shadow-[0_0_0_3px_rgba(83,211,223,.14)]">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-11 w-28 min-w-0 bg-transparent text-lg font-extrabold tabular-nums outline-none placeholder:font-semibold placeholder:text-[#a3abac]"
        />
        {suffix && <span className="text-sm font-semibold text-muted">{suffix}</span>}
      </span>
    </label>
  );
}
