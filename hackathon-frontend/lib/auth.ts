"use client";

import { useSyncExternalStore } from "react";
import { getToken, setToken } from "./api";
import type { User } from "./types";

// Signed-in user + token live in localStorage, so sign-in survives reloads and works offline.
// Same-tab changes fire "cwnp-auth"; other tabs get the browser's "storage" event.
const USER_KEY = "cwnp.user";
const EVENT = "cwnp-auth";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string | null {
  try {
    return getToken() ? localStorage.getItem(USER_KEY) : null;
  } catch {
    return null;
  }
}

export function signIn(user: User, token: string) {
  setToken(token);
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage blocked: the sign-in lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function signOutLocally() {
  setToken(null);
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // Nothing stored.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The signed-in user, or null. Null during server render and the first client render. */
export function useAuthUser(): User | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** False on the server and during hydration, true once the browser has taken over. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
