/**
 * @kafitra/lynx-async-storage
 *
 * Core AsyncStorage implementation.
 *
 * Design notes
 * ────────────
 * • Every public method wraps its synchronous backend call inside a microtask
 *   (Promise.resolve().then(...)) so callers always receive a Promise, even when
 *   the underlying operation completes instantaneously.
 *
 * • Validation (key/value type checks) is performed *inside* the microtask so
 *   that no method ever throws synchronously.
 *
 * • mergeItem implements a shallow JSON Object merge as specified: parse both
 *   values, spread-merge, stringify, and persist.
 *
 * • getAllKeys returns keys sorted lexicographically for deterministic output.
 *
 * • multiGet preserves the order of the input `keys` array.
 */

import type {
  AsyncStorageInterface,
  KeyValuePair,
  KeyValueResult,
  StorageBackend,
} from "./types";
import { InvalidKeyError, InvalidValueError, InvalidJsonError } from "./errors";
import { createDefaultBackend } from "./storageBackend";

// ─── Validation helpers ───────────────────────────────────────────────────────

function assertKey(key: unknown): asserts key is string {
  if (typeof key !== "string") {
    throw new InvalidKeyError(key);
  }
}

function assertValue(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new InvalidValueError(value);
  }
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

/**
 * Performs a shallow merge of two JSON-encoded object strings.
 *
 * @param existingRaw  Current value stored (may be null).
 * @param incomingRaw  New value to merge in.
 * @returns            JSON-stringified merged result.
 * @throws             InvalidJsonError if either value is not a JSON object.
 */
function shallowMergeJson(
  existingRaw: string | null,
  incomingRaw: string,
): string {
  // Treat null as an empty object – consistent with RN behaviour.
  const baseString = existingRaw ?? "{}";

  let base: unknown;
  let patch: unknown;

  try {
    base = JSON.parse(baseString);
  } catch (err) {
    throw new InvalidJsonError("existing", err);
  }

  try {
    patch = JSON.parse(incomingRaw);
  } catch (err) {
    throw new InvalidJsonError("incoming", err);
  }

  if (base === null || typeof base !== "object" || Array.isArray(base)) {
    throw new InvalidJsonError("existing");
  }

  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    throw new InvalidJsonError("incoming");
  }

  const merged = {
    ...(base as Record<string, unknown>),
    ...(patch as Record<string, unknown>),
  };

  return JSON.stringify(merged);
}

// ─── AsyncStorage class ───────────────────────────────────────────────────────

export class AsyncStorage implements AsyncStorageInterface {
  private backend: StorageBackend;

  constructor(backend?: StorageBackend) {
    this.backend = backend ?? createDefaultBackend();
  }

  // ── Backend injection ────────────────────────────────────────────────────
  useBackend(backend: StorageBackend): void {
    this.backend = backend;
  }

  // ── Single-key API ───────────────────────────────────────────────────────

  getItem(key: string): Promise<string | null> {
    return Promise.resolve().then(() => {
      assertKey(key);
      return this.backend.getItem(key);
    });
  }

  setItem(key: string, value: string): Promise<void> {
    return Promise.resolve().then(() => {
      assertKey(key);
      assertValue(value);
      this.backend.setItem(key, value);
    });
  }

  removeItem(key: string): Promise<void> {
    return Promise.resolve().then(() => {
      assertKey(key);
      this.backend.removeItem(key);
    });
  }

  clear(): Promise<void> {
    return Promise.resolve().then(() => {
      this.backend.clear();
    });
  }

  getAllKeys(): Promise<string[]> {
    return Promise.resolve().then(() => {
      return this.backend.getAllKeys().slice().sort();
    });
  }

  // ── Batch API ────────────────────────────────────────────────────────────

  multiGet(keys: readonly string[]): Promise<KeyValueResult[]> {
    return Promise.resolve().then(() => {
      // Validate every key before touching the backend (fail-fast, all-or-nothing).
      for (const key of keys) {
        assertKey(key);
      }

      return keys.map(
        (key): KeyValueResult => [key, this.backend.getItem(key)],
      );
    });
  }

  multiSet(keyValuePairs: readonly KeyValuePair[]): Promise<void> {
    return Promise.resolve().then(() => {
      // Validate all pairs first (best-effort atomic: validate then write).
      for (const [key, value] of keyValuePairs) {
        assertKey(key);
        assertValue(value);
      }

      for (const [key, value] of keyValuePairs) {
        this.backend.setItem(key, value);
      }
    });
  }

  multiRemove(keys: readonly string[]): Promise<void> {
    return Promise.resolve().then(() => {
      for (const key of keys) {
        assertKey(key);
      }

      for (const key of keys) {
        this.backend.removeItem(key);
      }
    });
  }

  // ── Merge API ────────────────────────────────────────────────────────────

  mergeItem(key: string, value: string): Promise<void> {
    return Promise.resolve().then(() => {
      assertKey(key);
      assertValue(value);

      const existing = this.backend.getItem(key);
      const merged = shallowMergeJson(existing, value);
      this.backend.setItem(key, merged);
    });
  }

  multiMerge(keyValuePairs: readonly KeyValuePair[]): Promise<void> {
    return Promise.resolve().then(() => {
      // Validate inputs before any writes.
      for (const [key, value] of keyValuePairs) {
        assertKey(key);
        assertValue(value);
      }

      for (const [key, value] of keyValuePairs) {
        const existing = this.backend.getItem(key);
        const merged = shallowMergeJson(existing, value);
        this.backend.setItem(key, merged);
      }
    });
  }
}
