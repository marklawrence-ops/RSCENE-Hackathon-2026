"use client";

import { useEffect, useState } from "react";
import { API_URL, USE_MOCKS, endpoints } from "@/lib/api";
import type { Health } from "@/lib/types";

type State = { kind: "loading" } | { kind: "ok"; health: Health } | { kind: "error"; message: string };

// Deploy check: proves HTTPS + CORS between Vercel and the Laravel host.
export function ConnectionStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    endpoints
      .health()
      .then((health) => setState({ kind: "ok", health }))
      .catch((err: Error) => setState({ kind: "error", message: err.message }));
  }, []);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-black/10 p-4 text-sm dark:border-white/15">
      <dt className="text-zinc-500">API</dt>
      <dd className="font-mono break-all">{API_URL}</dd>
      <dt className="text-zinc-500">Backend</dt>
      <dd>
        {state.kind === "loading" && "Checking…"}
        {state.kind === "ok" && (
          <span className="text-emerald-700 dark:text-emerald-400">
            Connected · {state.health.app} ({state.health.env})
          </span>
        )}
        {state.kind === "error" && (
          <span className="text-red-700 dark:text-red-400">Not reachable: {state.message} (check URL, HTTPS and CORS)</span>
        )}
      </dd>
      <dt className="text-zinc-500">Data</dt>
      <dd>{USE_MOCKS ? "Mock data (NEXT_PUBLIC_USE_MOCKS=true)" : "Live API"}</dd>
    </dl>
  );
}
