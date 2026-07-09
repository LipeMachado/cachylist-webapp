// Tiny in-memory TTL cache (replaces Rails.cache for the external media services).
interface Entry {
  value: unknown;
  expiresAt: number;
}

// Best-effort per-instance cache: bounded so a long-running process can't grow
// this Map without limit (it doesn't persist across serverless cold starts anyway).
const MAX_ENTRIES = 2000;

const store = new Map<string, Entry>();

export function readCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeCache(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict expired entries first; if still full, drop the oldest (first-inserted) entry.
    const now = Date.now();
    for (const [k, entry] of store) {
      if (now > entry.expiresAt) store.delete(k);
    }
    if (store.size >= MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
