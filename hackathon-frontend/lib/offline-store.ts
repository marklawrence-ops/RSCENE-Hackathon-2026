// Tiny IndexedDB wrapper for the offline barangay form. No dependencies.
// Stores: "outbox" (forms waiting to sync, keyed by client_uuid) and "kv" (cached lookups).
// Falls back to memory if IndexedDB is blocked (some private windows), so the form still works for the session.

import type { BarangayForm, BarangayFormInput } from "./types";

export type QueuedForm = BarangayFormInput & {
  barangay_name: string;
  queued_at: string;
  status: "pending" | "failed";
  error?: string;
};

export type SentForm = BarangayForm & { barangay_name: string; synced_at: string };

const DB_NAME = "cwnp";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = { outbox: new Map<string, unknown>(), kv: new Map<string, unknown>() };

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "client_uuid" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(store: "outbox" | "kv", mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) return reject(new Error("no-idb"));
        const req = op(db.transaction(store, mode).objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const outbox = {
  async all(): Promise<QueuedForm[]> {
    try {
      const items = await run<QueuedForm[]>("outbox", "readonly", (s) => s.getAll());
      return items.sort((a, b) => a.queued_at.localeCompare(b.queued_at));
    } catch {
      return [...memory.outbox.values()] as QueuedForm[];
    }
  },
  async put(item: QueuedForm): Promise<void> {
    try {
      await run("outbox", "readwrite", (s) => s.put(item));
    } catch {
      memory.outbox.set(item.client_uuid, item);
    }
  },
  async remove(clientUuid: string): Promise<void> {
    try {
      await run("outbox", "readwrite", (s) => s.delete(clientUuid));
    } catch {
      memory.outbox.delete(clientUuid);
    }
  },
};

export const kv = {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await run<T | undefined>("kv", "readonly", (s) => s.get(key));
    } catch {
      return memory.kv.get(key) as T | undefined;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await run("kv", "readwrite", (s) => s.put(value, key));
    } catch {
      memory.kv.set(key, value);
    }
  },
};
