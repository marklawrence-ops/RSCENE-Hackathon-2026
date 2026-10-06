"use client";

import { useAuthUser, useHydrated } from "@/lib/auth";
import { LoginCard } from "./login-card";

/** Shows the page only to signed-in users; everyone else gets the sign-in card in its place. */
export function RequireAuth({ children, eyebrow, intro }: { children: React.ReactNode; eyebrow: string; intro: string }) {
  const hydrated = useHydrated();
  const user = useAuthUser();

  // Until the browser has read the saved sign-in, show nothing rather than flash the sign-in card.
  if (!hydrated) return <div className="flex-1" />;
  if (!user) return <LoginCard eyebrow={eyebrow} intro={intro} />;
  return <>{children}</>;
}
