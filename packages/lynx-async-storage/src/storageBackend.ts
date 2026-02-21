/**
 * @kafitra/lynx-async-storage
 *
 * StorageBackend implementations.
 *
 * Resolution order (createDefaultBackend):
 *  1. NativeStorageBackend  — NativeModules.LynxStorage (disk-backed, persists across restarts)
 *  2. LocalStorageBackend   — globalThis.localStorage   (browser / some WebView runtimes)
 *  3. MemoryBackend         — in-memory Map fallback     (tests / unknown environments)
 *
 * Swap the backend at any time via AsyncStorage.useBackend().
 */

import type { StorageBackend } from "./types";
import { BackendError } from "./errors";

// ─── Lynx NativeModules shape (minimal) ──────────────────────────────────────

interface LynxNativeStorage {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  /** Returns a JSON array string, e.g. '["a","b"]' */
  getAllKeys(): string;
}

interface LynxNativeModules {
  LynxStorage?: LynxNativeStorage;
}

/**
 * Lynx injects NativeModules as a top-level global (not via globalThis).
 * We declare it here so TypeScript is happy; the typeof guard prevents
 * ReferenceError in environments where it doesn't exist (tests, browser).
 */
declare const NativeModules: LynxNativeModules | undefined;

// ─── In-memory backend ────────────────────────────────────────────────────────

/**
 * Simple Map-backed store.
 *
 * Used as the built-in fallback when no runtime storage is detected, and as a
 * convenient injectable backend for unit tests.
 */
export class MemoryBackend implements StorageBackend {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// ─── Lynx NativeModules backend ───────────────────────────────────────────────

/**
 * Wraps the `NativeModules.LynxStorage` Lynx native module.
 *
 * This backend provides **disk-persistent** storage that survives app restarts,
 * backed by Android SharedPreferences and iOS NSUserDefaults.
 *
 * Requires `@kafitra/lynx-storage` to be installed and registered in the
 * host Android/iOS app:
 *
 *   Android: LynxEnv.inst().registerModule("LynxStorage", LynxStorageModule.class)
 *   iOS:     [globalConfig registerModule:LynxStorageModule.class]
 */
export class NativeStorageBackend implements StorageBackend {
  constructor(private readonly native: LynxNativeStorage) {}

  getItem(key: string): string | null {
    try {
      return this.native.getString(key);
    } catch (err) {
      throw new BackendError("getItem", err);
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.native.setString(key, value);
    } catch (err) {
      throw new BackendError("setItem", err);
    }
  }

  removeItem(key: string): void {
    try {
      this.native.remove(key);
    } catch (err) {
      throw new BackendError("removeItem", err);
    }
  }

  clear(): void {
    try {
      this.native.clear();
    } catch (err) {
      throw new BackendError("clear", err);
    }
  }

  getAllKeys(): string[] {
    try {
      const raw = this.native.getAllKeys();
      return JSON.parse(raw) as string[];
    } catch (err) {
      throw new BackendError("getAllKeys", err);
    }
  }
}

// ─── localStorage-compatible backend ─────────────────────────────────────────

/**
 * Wraps any object that matches the Web Storage / Lynx localStorage API.
 */
export class LocalStorageBackend implements StorageBackend {
  constructor(private readonly ls: Storage) {}

  getItem(key: string): string | null {
    try {
      return this.ls.getItem(key);
    } catch (err) {
      throw new BackendError("getItem", err);
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.ls.setItem(key, value);
    } catch (err) {
      throw new BackendError("setItem", err);
    }
  }

  removeItem(key: string): void {
    try {
      this.ls.removeItem(key);
    } catch (err) {
      throw new BackendError("removeItem", err);
    }
  }

  clear(): void {
    try {
      this.ls.clear();
    } catch (err) {
      throw new BackendError("clear", err);
    }
  }

  getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < this.ls.length; i++) {
        const k = this.ls.key(i);
        if (k !== null) keys.push(k);
      }
      return keys;
    } catch (err) {
      throw new BackendError("getAllKeys", err);
    }
  }
}

// ─── Runtime detection ────────────────────────────────────────────────────────

function isNativeStorageAvailable(
  candidate: unknown,
): candidate is LynxNativeStorage {
  if (
    candidate === null ||
    candidate === undefined ||
    typeof candidate !== "object"
  ) {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj["getString"] === "function" &&
    typeof obj["setString"] === "function" &&
    typeof obj["remove"] === "function" &&
    typeof obj["clear"] === "function" &&
    typeof obj["getAllKeys"] === "function"
  );
}

function isStorageAvailable(candidate: unknown): candidate is Storage {
  if (
    candidate === null ||
    candidate === undefined ||
    typeof candidate !== "object"
  ) {
    return false;
  }

  const obj = candidate as Record<string, unknown>;

  return (
    typeof obj["getItem"] === "function" &&
    typeof obj["setItem"] === "function" &&
    typeof obj["removeItem"] === "function" &&
    typeof obj["clear"] === "function" &&
    typeof obj["key"] === "function" &&
    typeof obj["length"] === "number"
  );
}

/**
 * Creates and returns the best available backend for the current runtime.
 *
 * Resolution order:
 *  1. NativeModules.LynxStorage  (Lynx runtime with @kafitra/lynx-storage linked)
 *  2. globalThis.localStorage    (browser / jsdom)
 *  3. MemoryBackend              (fallback)
 */
export function createDefaultBackend(): StorageBackend {
  const g = globalThis as Record<string, unknown>;

  // 1. Prefer the Lynx native module — disk-persistent across app restarts
  // NativeModules is injected as a top-level global by the Lynx runtime,
  // so we check both the declared global and globalThis as a fallback.
  try {
    const nm: LynxNativeModules | undefined =
      // eslint-disable-next-line no-undef
      typeof NativeModules !== "undefined"
        ? NativeModules
        : (g["NativeModules"] as LynxNativeModules | undefined);
    if (nm && isNativeStorageAvailable(nm.LynxStorage)) {
      return new NativeStorageBackend(nm.LynxStorage);
    }
  } catch {
    // NativeModules not available in this runtime
  }

  // 2. Fall back to localStorage (browser / WebView runtimes)
  if (isStorageAvailable(g["localStorage"])) {
    return new LocalStorageBackend(g["localStorage"] as Storage);
  }

  // 3. In-memory fallback — data lost on reload, but never crashes
  return new MemoryBackend();
}
