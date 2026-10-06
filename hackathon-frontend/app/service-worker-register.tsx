"use client";

import { useEffect } from "react";

// Registered only in production builds so dev HMR is never served from a stale cache.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }, []);

  return null;
}
