"use client";

import Link from "next/link";
import { useAuthUser, useHydrated } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { LoginCard } from "./login-card";

/**
 * Shows the page only to signed-in users; everyone else gets the sign-in card in its place.
 * With `roles`, signed-in users outside those roles get a short note instead of the page.
 */
export function RequireAuth({ children, eyebrow, intro, roles }: { children: React.ReactNode; eyebrow: string; intro: string; roles?: Role[] }) {
  const hydrated = useHydrated();
  const user = useAuthUser();

  // Until the browser has read the saved sign-in, show nothing rather than flash the sign-in card.
  if (!hydrated) return <div className="flex-1" />;
  if (!user) return <LoginCard eyebrow={eyebrow} intro={intro} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-12 text-center">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">{eyebrow}</p>
        <p className="mt-2 text-lg font-extrabold">This page is for city staff</p>
        <p className="mt-1 text-sm text-muted">City planners and the CDRRMO can open it. You are signed in as {user.name}.</p>
        <Link href="/" className="mt-4 inline-block font-bold text-brand hover:underline">
          Back to Overview ›
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
