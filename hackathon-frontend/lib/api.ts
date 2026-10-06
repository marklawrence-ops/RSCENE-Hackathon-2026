import { mockRequest } from "./mocks";
import type {
  BarangayDetail,
  BarangayForm,
  BarangayFormInput,
  BarangayList,
  Boundaries,
  Health,
  Lgu,
  OutageRun,
  OutageScenario,
  ProgramInput,
  ProgramPreview,
  Rainfall,
  ReuseRules,
  Site,
  SiteMatches,
  StorageRegistry,
  User,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const TOKEN_KEY = "cwnp.token";

export function getToken(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode or storage blocked: the session just won't persist.
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST"; body?: unknown; mock?: boolean };

/** Calls `/api/v1{path}`. Set `mock: false` to force the real backend (e.g. the health check). */
export async function api<T>(path: string, { method = "GET", body, mock = USE_MOCKS }: Options = {}): Promise<T> {
  if (mock) return mockRequest<T>(method, path, body);

  const token = getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? res.statusText, data.errors);
  return data as T;
}

// One function per endpoint in the contract.
export const endpoints = {
  health: () => api<Health>("/health", { mock: false }),
  login: (email: string, password: string, device_name = "web") =>
    api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password, device_name } }),
  me: () => api<{ user: User }>("/auth/me"),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  lgus: () => api<{ lgus: Lgu[] }>("/lgus"),
  barangays: (lgu: string) => api<BarangayList>(`/lgus/${lgu}/barangays`),
  barangay: (id: number) => api<BarangayDetail>(`/barangays/${id}`),
  sites: (lgu: string, kind?: Site["kind"]) => api<{ sites: Site[] }>(`/lgus/${lgu}/sites${kind ? `?kind=${kind}` : ""}`),
  reuseRules: () => api<ReuseRules>("/reuse-rules"),
  siteMatches: (id: number) => api<SiteMatches>(`/sites/${id}/matches`),
  outageScenarios: (lgu: string) => api<{ scenarios: OutageScenario[] }>(`/lgus/${lgu}/outage-scenarios`),
  outageRun: (lgu: string, scenario: string, program: ProgramInput | null = null) =>
    api<OutageRun>(`/lgus/${lgu}/outage-runs`, { method: "POST", body: { scenario, program } }),
  programPreview: (lgu: string, input: ProgramInput) =>
    api<ProgramPreview>(`/lgus/${lgu}/program-preview`, { method: "POST", body: input }),
  storage: (lgu: string) => api<StorageRegistry>(`/lgus/${lgu}/storage`),
  forms: (barangayId: number) => api<{ forms: BarangayForm[] }>(`/barangays/${barangayId}/forms`),
  submitForm: (form: BarangayFormInput) => api<{ form: BarangayForm }>("/barangay-forms", { method: "POST", body: form }),
  rainfall: (lgu: string) => api<Rainfall>(`/lgus/${lgu}/rainfall`),
  boundaries: (lgu: string) => api<Boundaries>(`/lgus/${lgu}/boundaries`),
};
