"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { endpoints } from "@/lib/api";
import { signOutLocally, useAuthUser } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { Icon, type IconName } from "./icon";
import { Weather } from "./weather";

// auth: shown only to signed-in users; staff: only to planners and the CDRRMO (the pages check too).
const NAV: { href: string; label: string; icon: IconName; auth?: boolean; staff?: boolean }[] = [
  { href: "/", label: "Overview", icon: "grid" },
  // Outage Mode is a toggle on the Reuse Map, not a separate tab.
  { href: "/map", label: "Reuse Map", icon: "map" },
  { href: "/designer", label: "Program Designer", icon: "sliders", auth: true },
  { href: "/storage", label: "Storage Registry", icon: "storage", auth: true },
  { href: "/form", label: "Barangay Form", icon: "clipboard", auth: true },
  { href: "/reports", label: "Reports", icon: "trend", auth: true, staff: true },
  { href: "/guide", label: "Household Guide", icon: "book" },
  { href: "/about", label: "About & credits", icon: "people" },
];

type Tab = { href: string; label: string; icon: IconName };
const HOME: Tab = { href: "/", label: "Home", icon: "grid" };
const MAP: Tab = { href: "/map", label: "Map", icon: "map" };
// Phone tabs follow each role's job; everything else stays in the account menu.
const BOTTOM_BY_ROLE: Record<Role, Tab[]> = {
  planner: [HOME, MAP, { href: "/designer", label: "Plan", icon: "sliders" }, { href: "/storage", label: "Registry", icon: "storage" }],
  cdrrmo: [HOME, { href: "/map?outage=1", label: "Outage", icon: "storm" }, { href: "/designer", label: "Plan", icon: "sliders" }, { href: "/storage", label: "Registry", icon: "storage" }],
  barangay: [HOME, MAP, { href: "/form", label: "Form", icon: "clipboard" }, { href: "/guide", label: "Guide", icon: "book" }],
};
const BOTTOM_PUBLIC: Tab[] = [
  { href: "/", label: "Home", icon: "grid" },
  { href: "/map", label: "Map", icon: "map" },
  { href: "/guide", label: "Guide", icon: "book" },
  { href: "/login", label: "Sign in", icon: "people" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#e2eef0] bg-white">
        <Image src="/logo.png" alt="" width={36} height={36} preload />
      </div>
      <div className="leading-none">
        <strong className={`block text-xl font-extrabold tracking-[0.04em] ${light ? "text-white" : "text-foreground"}`}>AGOS</strong>
        <small className={`mt-1 block text-[9px] font-bold tracking-[0.16em] ${light ? "text-white/80" : "text-brand"}`}>CIRCULAR WATER</small>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthUser();
  const signOut = () => {
    endpoints.logout().catch(() => {});
    signOutLocally();
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col px-4 pt-6 pb-4">
      <Link href="/" onClick={onNavigate} className="px-1">
        <Logo />
      </Link>
      <p className="mx-3 mt-9 mb-2.5 text-[10px] font-extrabold tracking-[0.18em] text-[#6b7475]">PLANNING PORTAL</p>
      <nav className="flex flex-col gap-1">
        {NAV.filter((item) => (!item.auth || user) && (!item.staff || (user && user.role !== "barangay"))).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? "bg-[#eaf7f8] text-[#0f6a73]" : "text-[#667072] hover:bg-[#f1f8f8] hover:text-[#177f88]"
              }`}
            >
              <Icon name={item.icon} className={active ? "text-brand" : ""} />
              {item.label}
              {active && <i className="absolute top-1/2 -right-4 h-6 w-[3px] -translate-y-1/2 rounded-l bg-[#4bcbd6]" />}
            </Link>
          );
        })}
      </nav>

      <div className="-mx-4 mt-auto grid grid-cols-[36px_1fr_auto] items-center gap-2.5 border-t border-[#e6e9ea] px-4 pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d6a3e5] text-xs font-extrabold text-brand-ink">
          {user ? initials(user.name) : <Icon name="people" size={16} />}
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-xs">{user ? user.name : "Public view"}</strong>
          {user ? (
            <small className="block text-[11px] text-[#5f6869] capitalize">{user.role === "cdrrmo" ? "CDRRMO" : user.role}</small>
          ) : (
            <small className="block text-[11px] text-[#5f6869]">Map, scores and guide</small>
          )}
        </div>
        {user ? (
          <button onClick={signOut} className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#667072] hover:bg-[#f1f8f8] hover:text-brand">
            Sign out
          </button>
        ) : (
          <Link href="/login" onClick={onNavigate} className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-brand-dark">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const user = useAuthUser();
  const bottom = user ? BOTTOM_BY_ROLE[user.role] ?? BOTTOM_BY_ROLE.planner : BOTTOM_PUBLIC;

  return (
    // Pinned to the visible screen (fixed + inset-0) rather than sized with 100dvh: after a
    // pull-to-refresh on Android the dvh value can exceed the visible area and push the tab bar off-screen.
    <div className="fixed inset-0 flex bg-white print:static print:block print:h-auto">
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
          <div className="ml-auto flex items-center gap-4 -mr-1">
            <Weather />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto print:overflow-visible">{children}</main>

        <nav aria-label="Mobile navigation" className="grid h-16 shrink-0 grid-cols-5 border-t border-[#e1e5e6] bg-white shadow-[0_-2px_7px_rgba(28,56,58,.06)] lg:hidden print:hidden">
          {bottom.map((item) => {
            const path = item.href.split("?")[0];
            const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-brand" : "text-[#616b6d]"}`}>
                <Icon name={item.icon} size={21} />
                {item.label}
              </Link>
            );
          })}
          {user ? (
            // Signed in: the last tab shows who you are and opens the menu (all pages, sign out).
            <button
              onClick={() => setOpen(true)}
              aria-label={`Account: ${user.name}. Open menu`}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#616b6d]"
            >
              <span className="relative grid h-[22px] w-[22px] place-items-center rounded-full bg-[#d6a3e5] text-[9px] font-extrabold text-brand-ink">
                {initials(user.name)}
                <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-[#4caf50] ring-2 ring-white" aria-hidden />
              </span>
              Account
            </button>
          ) : (
            <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#616b6d]">
              <Icon name="menu" size={21} />
              More
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
