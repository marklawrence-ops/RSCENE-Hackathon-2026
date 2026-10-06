"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, endpoints, getToken, setToken } from "@/lib/api";
import { days } from "@/lib/format";
import { kv, outbox, type QueuedForm, type SentForm } from "@/lib/offline-store";
import type { BarangayFormInput, BarangaySummary, User } from "@/lib/types";

type CachedBarangay = { id: number; name: string; households: number };
type Snapshot = { name: string; readiness: number; days: number };

const USER_KEY = "cwnp.user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && getToken() ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Storage blocked: sign-in lasts for this tab only.
  }
}

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
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [barangays, setBarangays] = useState<CachedBarangay[]>([]);
  const [queue, setQueue] = useState<QueuedForm[]>([]);
  const [sent, setSent] = useState<SentForm[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "wait" | "error"; text: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const syncLock = useRef(false);

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
            setToken(null);
            saveUser(null);
            setUser(null);
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
        const fresh = list.barangays.map((b: BarangaySummary) => ({ id: b.id, name: b.name, households: b.metrics.households }));
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
        online={online}
        notice={notice}
        onLogin={(u) => {
          saveUser(u);
          setUser(u);
          setNotice(null);
          syncAll();
        }}
      />
    );
  }

  const signOut = () => {
    endpoints.logout().catch(() => {});
    setToken(null);
    saveUser(null);
    setUser(null);
  };

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Barangay Form</h1>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}
        >
          {online ? "● Online" : "⚡ Offline: forms are saved on this phone"}
        </span>
      </div>

      {notice && (
        <p
          className={`rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200" : notice.tone === "wait" ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" : "bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-200"}`}
          role="status"
        >
          {notice.text}
        </p>
      )}

      {snapshot && (
        <div className="rounded-xl border border-[#0b5d6b]/30 bg-[#0b5d6b]/5 p-3 text-sm">
          <p className="font-semibold">Brgy. {snapshot.name} now</p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Readiness {snapshot.readiness}/100 · stored water covers {days(snapshot.days)}
          </p>
        </div>
      )}

      <FormCard
        user={user}
        barangays={barangays}
        onQueued={async (item) => {
          await outbox.put(item);
          await refreshLists();
          setNotice(
            navigator.onLine
              ? { tone: "wait", text: "Saved. Sending…" }
              : { tone: "wait", text: "Saved on this phone. It will send by itself when you are back online." },
          );
          if (navigator.onLine) syncAll();
        }}
      />

      <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Waiting to sync <span className="tabular-nums">({queue.length})</span>
          </h2>
          <button
            onClick={syncAll}
            disabled={!online || syncing || queue.length === 0}
            className="rounded-lg border border-black/15 px-3 py-1 text-sm disabled:opacity-40 dark:border-white/15"
          >
            {syncing ? "Syncing…" : "⟳ Sync now"}
          </button>
        </div>
        {queue.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">Nothing waiting.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {queue.map((q) => (
              <li key={q.client_uuid} className="flex items-start justify-between gap-2">
                <span>
                  {q.barangay_name} · {q.period}
                  {q.status === "failed" && <span className="block text-xs text-red-600">Not accepted: {q.error}</span>}
                </span>
                {q.status === "failed" ? (
                  <button
                    onClick={async () => {
                      await outbox.remove(q.client_uuid);
                      await refreshLists();
                    }}
                    className="shrink-0 text-xs text-red-600 underline"
                  >
                    Discard
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">waiting</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sent.length > 0 && (
        <section className="rounded-xl border border-black/10 p-3 dark:border-white/10">
          <h2 className="text-sm font-semibold">Sent from this phone</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {sent.map((s) => (
              <li key={s.client_uuid} className="flex justify-between gap-2">
                <span>
                  ✓ {s.barangay_name} · {s.period}
                </span>
                <span className="text-xs text-zinc-500">{new Date(s.synced_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-zinc-500">
        Signed in as {user.name} ·{" "}
        <button onClick={signOut} className="underline">
          Sign out
        </button>
      </p>
    </div>
  );
}

function FormCard({ user, barangays, onQueued }: { user: User; barangays: CachedBarangay[]; onQueued: (item: QueuedForm) => Promise<void> }) {
  const isBarangayUser = user.role === "barangay";
  const [barangayId, setBarangayId] = useState<number | null>(user.barangay_id);
  const [period, setPeriod] = useState(currentQuarter());
  const [channel, setChannel] = useState<"app" | "paper">("app");
  const [values, setValues] = useState({ tanks_working: "", tanks_total: "", covered_drums: "", reusing_households: "", households_estimate: "" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const barangay = barangays.find((b) => b.id === barangayId) ?? null;
  const year = new Date().getFullYear();
  const sorted = useMemo(() => [...barangays].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true })), [barangays]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value.replace(/[^0-9]/g, "") }));

  // Households default to the barangay's estimate until the user types their own.
  const households = values.households_estimate || (barangay ? String(barangay.households) : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    const n = (s: string) => (s === "" ? NaN : Number(s));
    const f = {
      tanks_working: n(values.tanks_working),
      tanks_total: n(values.tanks_total),
      covered_drums: n(values.covered_drums),
      reusing_households: n(values.reusing_households),
      households_estimate: n(households),
    };
    if (!barangayId) return setProblem("Choose a barangay.");
    if (Object.values(f).some(Number.isNaN)) return setProblem("Fill in every number (use 0 if none).");
    if (f.tanks_working > f.tanks_total) return setProblem("Working tanks can't be more than total tanks.");
    if (f.households_estimate < 1) return setProblem("Households must be at least 1.");
    if (f.reusing_households > f.households_estimate) return setProblem("Reusing households can't be more than all households.");

    setSaving(true);
    await onQueued({
      client_uuid: crypto.randomUUID(),
      barangay_id: barangayId,
      barangay_name: barangay?.name ?? `Barangay ${barangayId}`,
      period,
      ...f,
      notes: notes.trim() || null,
      channel: isBarangayUser ? "app" : channel,
      submitted_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
      status: "pending",
    });
    setValues({ tanks_working: "", tanks_total: "", covered_drums: "", reusing_households: "", households_estimate: "" });
    setNotes("");
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block text-sm sm:col-span-1">
          <span className="font-medium">Barangay</span>
          {isBarangayUser ? (
            <span className="mt-1 block rounded-lg bg-zinc-100 px-3 py-2.5 dark:bg-zinc-900">{barangay?.name ?? "Your barangay"}</span>
          ) : (
            <select
              value={barangayId ?? ""}
              onChange={(e) => setBarangayId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 dark:border-white/15"
            >
              <option value="">Choose…</option>
              {sorted.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="col-span-2 block text-sm sm:col-span-1">
          <span className="font-medium">Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 dark:border-white/15">
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={`${year}-Q${q}`}>
                {year} Q{q}
              </option>
            ))}
            <option value={`${year}-PRE-TYPHOON`}>{year} before typhoon season</option>
          </select>
        </label>
      </div>

      <Pair label="Public rain tanks working" a={["working", values.tanks_working, set("tanks_working")]} b={["of", values.tanks_total, set("tanks_total")]} />
      <NumberField label="Covered rain drums (estimate)" hint="Only covered drums with rainwater. Not tap water." value={values.covered_drums} onChange={set("covered_drums")} />
      <Pair
        label="Households reusing water"
        hint="Laundry rinse for flushing, shower water for plants."
        a={["reusing", values.reusing_households, set("reusing_households")]}
        b={["of", households, set("households_estimate")]}
      />

      <label className="block text-sm">
        <span className="font-medium">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="mt-1 block w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
      </label>

      {!isBarangayUser && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={channel === "paper"} onChange={(e) => setChannel(e.target.checked ? "paper" : "app")} />
          Encoding a paper form
        </label>
      )}

      {problem && <p className="text-sm text-red-600">{problem}</p>}
      <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#0b5d6b] py-3 text-base font-semibold text-white hover:bg-[#094c58] disabled:opacity-60">
        {saving ? "Saving…" : "Save form"}
      </button>
    </form>
  );
}

type PairSide = [string, string, (e: React.ChangeEvent<HTMLInputElement>) => void];

function Pair({ label, hint, a, b }: { label: string; hint?: string; a: PairSide; b: PairSide }) {
  return (
    <fieldset className="text-sm">
      <legend className="font-medium">{label}</legend>
      <div className="mt-1 flex items-center gap-2">
        <NumInput aria={`${label}: ${a[0]}`} value={a[1]} onChange={a[2]} />
        <span className="text-zinc-500">{b[0]}</span>
        <NumInput aria={`${label}: total`} value={b[1]} onChange={b[2]} />
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </fieldset>
  );
}

function NumberField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{label}</p>
      <div className="mt-1">
        <NumInput aria={label} value={value} onChange={onChange} />
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function NumInput({ aria, value, onChange }: { aria: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={aria}
      value={value}
      onChange={onChange}
      className="w-full min-w-0 rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-lg tabular-nums dark:border-white/15"
    />
  );
}

function LoginCard({ online, notice, onLogin }: { online: boolean; notice: { text: string } | null; onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await endpoints.login(email.trim(), password, "barangay-form");
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.errors ?? {})[0]?.[0] ?? err.message) : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <h1 className="text-xl font-semibold">Barangay Form</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in once while online. After that the form works offline.</p>
      {notice && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">{notice.text}</p>}
      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 dark:border-white/15" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 dark:border-white/15" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!online && <p className="text-sm text-amber-700">You are offline. Connect once to sign in.</p>}
        <button type="submit" disabled={busy || !online} className="w-full rounded-xl bg-[#0b5d6b] py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-xs text-zinc-500">Accounts are given by the City ICT office.</p>
    </div>
  );
}
