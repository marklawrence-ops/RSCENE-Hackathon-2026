"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ApiError, endpoints } from "@/lib/api";
import { signIn } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Logo } from "../shell/app-shell";
import { Icon } from "../shell/icon";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function LoginCard({
  notice = null,
  eyebrow = "PLANNING PORTAL",
  intro = "Sign in to use the Program Designer, Storage Registry and Barangay Form.",
  onDone,
}: {
  notice?: { text: string } | null;
  eyebrow?: string;
  intro?: string;
  onDone?: (u: User) => void;
}) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await endpoints.login(email.trim(), password, "agos-web");
      signIn(user, token);
      onDone?.(user);
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.errors ?? {})[0]?.[0] ?? err.message) : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const inputBox =
    "mt-2 flex h-12 items-center gap-2.5 rounded-xl border border-[#d8dfe0] bg-[#f8fafa] px-3 text-[#829092] transition focus-within:border-[#42bec8] focus-within:bg-white focus-within:text-brand focus-within:shadow-[0_0_0_3px_rgba(83,211,223,.14)]";

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_5px_18px_rgba(32,75,79,.13)] md:grid-cols-[1.05fr_.95fr]">
        {/* Story panel (wide screens) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#68d9e1_0%,#2798a3_48%,#276b73_100%)] p-9 text-white md:flex">
          <Logo light />
          <div className="relative z-10 py-10">
            <span className="text-[10px] font-extrabold tracking-[0.18em] text-white/75">CATBALOGAN CITY · AGOS</span>
            <h2 className="mt-3 text-4xl leading-[1] font-extrabold tracking-[-0.05em]">
              Every drop gets <em className="text-[#ddf9f8] not-italic">a second purpose.</em>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
              Plan safe reuse, price a program, track stored water, and send each barangay&apos;s quarterly form, even offline.
            </p>
          </div>
          <p className="relative z-10 text-[11px] text-white/70">No household names are collected.</p>
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-[420px] w-[420px] rounded-full border border-white/40 opacity-50" aria-hidden />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-[260px] w-[260px] rounded-full border border-dashed border-white/40 opacity-50" aria-hidden />
        </aside>

        {/* Form */}
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <span className="text-[10px] font-extrabold tracking-[0.17em] text-brand">{eyebrow}</span>
          <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-[-0.04em]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[#7a8486]">{intro}</p>
          {notice && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice.text}</p>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs font-bold text-[#424b4d]">
              Email
              <div className={inputBox}>
                <Icon name="people" size={17} />
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="secretary@barangay.gov.ph"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#9ba3a5]"
                />
              </div>
            </label>
            <label className="block text-xs font-bold text-[#424b4d]">
              Password
              <div className={inputBox}>
                <Icon name="shield" size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#9ba3a5]"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-1 text-[11px] font-extrabold text-brand">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!online && <p className="text-sm text-amber-700">You are offline. Connect once to sign in.</p>}
            <button
              type="submit"
              disabled={busy || !online}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-extrabold text-white shadow-[0_7px_18px_rgba(22,141,152,.18)] transition hover:-translate-y-px hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"} <Icon name="chevron" size={18} />
            </button>
          </form>
          <div className="mt-6 flex gap-2.5 rounded-xl bg-[#eff7f7] p-3 text-brand">
            <Icon name="book" size={18} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-[#768183]">
              <strong className="text-[#3c666a]">Need access?</strong> Accounts are given by the City ICT office. Households don&apos;t need an account: see the{" "}
              <Link href="/guide" className="font-bold text-brand underline">
                Household guide
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
