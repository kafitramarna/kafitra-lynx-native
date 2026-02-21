/**
 * @kafitra/lynx-async-storage
 *
 * Test suite – Vitest with jsdom environment.
 *
 * Coverage areas:
 *  ✔ All core single-key methods
 *  ✔ All batch methods
 *  ✔ Merge behaviour (shallow JSON merge)
 *  ✔ Error handling (type errors, JSON errors)
 *  ✔ Edge cases
 *  ✔ Async nature (Promises, microtask boundary)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AsyncStorage } from "../AsyncStorage";
import { MemoryBackend } from "../storageBackend";
import {
  InvalidKeyError,
  InvalidValueError,
  InvalidJsonError,
  BackendError,
} from "../errors";
import type { StorageBackend } from "../types";

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Returns a fresh AsyncStorage wired to an isolated MemoryBackend. */
function makeStorage(): AsyncStorage {
  return new AsyncStorage(new MemoryBackend());
}

// ─── MemoryBackend unit tests ─────────────────────────────────────────────────

describe("MemoryBackend", () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend();
  });

  it("returns null for absent key", () => {
    expect(backend.getItem("missing")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    backend.setItem("x", "hello");
    expect(backend.getItem("x")).toBe("hello");
  });

  it("overwrites an existing key", () => {
    backend.setItem("x", "a");
    backend.setItem("x", "b");
    expect(backend.getItem("x")).toBe("b");
  });

  it("removes a key", () => {
    backend.setItem("x", "v");
    backend.removeItem("x");
    expect(backend.getItem("x")).toBeNull();
  });

  it("silently ignores removing an absent key", () => {
    expect(() => backend.removeItem("nope")).not.toThrow();
  });

  it("clears all keys", () => {
    backend.setItem("a", "1");
    backend.setItem("b", "2");
    backend.clear();
    expect(backend.getAllKeys()).toHaveLength(0);
  });

  it("returns correct key list", () => {
    backend.setItem("a", "1");
    backend.setItem("b", "2");
    expect(backend.getAllKeys().sort()).toEqual(["a", "b"]);
  });

  it("returns empty array when no keys exist", () => {
    expect(backend.getAllKeys()).toEqual([]);
  });

  it("allows empty string as a key", () => {
    backend.setItem("", "empty-key-value");
    expect(backend.getItem("")).toBe("empty-key-value");
  });
});

// ─── AsyncStorage – single key methods ───────────────────────────────────────

describe("AsyncStorage.getItem", () => {
  it("returns null for missing key", async () => {
    const storage = makeStorage();
    expect(await storage.getItem("missing")).toBeNull();
  });

  it("returns the stored value", async () => {
    const storage = makeStorage();
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
  });

  it("returns a Promise (async boundary)", async () => {
    const storage = makeStorage();
    const result = storage.getItem("k");
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it("rejects with InvalidKeyError for non-string key", async () => {
    const storage = makeStorage();
    // @ts-expect-error – intentional invalid input
    await expect(storage.getItem(42)).rejects.toBeInstanceOf(InvalidKeyError);
  });

  it("rejects with InvalidKeyError for null key", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.getItem(null)).rejects.toBeInstanceOf(InvalidKeyError);
  });

  it("accepts empty string key", async () => {
    const storage = makeStorage();
    await storage.setItem("", "val");
    expect(await storage.getItem("")).toBe("val");
  });
});

describe("AsyncStorage.setItem", () => {
  it("stores a value that can be retrieved", async () => {
    const storage = makeStorage();
    await storage.setItem("name", "Alice");
    expect(await storage.getItem("name")).toBe("Alice");
  });

  it("returns void (resolves with undefined)", async () => {
    const storage = makeStorage();
    const result = await storage.setItem("k", "v");
    expect(result).toBeUndefined();
  });

  it("returns a Promise", () => {
    const storage = makeStorage();
    expect(storage.setItem("k", "v")).toBeInstanceOf(Promise);
  });

  it("rejects with InvalidKeyError for non-string key", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.setItem(123, "v")).rejects.toBeInstanceOf(
      InvalidKeyError,
    );
  });

  it("rejects with InvalidValueError for non-string value", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.setItem("k", 99)).rejects.toBeInstanceOf(
      InvalidValueError,
    );
  });

  it("rejects with InvalidValueError for null value", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.setItem("k", null)).rejects.toBeInstanceOf(
      InvalidValueError,
    );
  });

  it("rejects with InvalidValueError for object value", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.setItem("k", {})).rejects.toBeInstanceOf(
      InvalidValueError,
    );
  });

  it("overwrites existing value", async () => {
    const storage = makeStorage();
    await storage.setItem("k", "first");
    await storage.setItem("k", "second");
    expect(await storage.getItem("k")).toBe("second");
  });
});

describe("AsyncStorage.removeItem", () => {
  it("removes a key", async () => {
    const storage = makeStorage();
    await storage.setItem("k", "v");
    await storage.removeItem("k");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("does not throw when key is absent", async () => {
    const storage = makeStorage();
    await expect(storage.removeItem("ghost")).resolves.toBeUndefined();
  });

  it("returns void Promise", async () => {
    const storage = makeStorage();
    expect(await storage.removeItem("k")).toBeUndefined();
  });

  it("rejects with InvalidKeyError for non-string key", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.removeItem(false)).rejects.toBeInstanceOf(
      InvalidKeyError,
    );
  });
});

describe("AsyncStorage.clear", () => {
  it("removes all stored keys", async () => {
    const storage = makeStorage();
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    await storage.clear();
    expect(await storage.getAllKeys()).toEqual([]);
  });

  it("resolves when storage is already empty", async () => {
    const storage = makeStorage();
    await expect(storage.clear()).resolves.toBeUndefined();
  });
});

describe("AsyncStorage.getAllKeys", () => {
  it("returns empty array when no keys exist", async () => {
    const storage = makeStorage();
    expect(await storage.getAllKeys()).toEqual([]);
  });

  it("returns all stored keys", async () => {
    const storage = makeStorage();
    await storage.setItem("b", "2");
    await storage.setItem("a", "1");
    expect(await storage.getAllKeys()).toEqual(["a", "b"]);
  });

  it("returns keys in sorted order (deterministic)", async () => {
    const storage = makeStorage();
    await storage.setItem("z", "3");
    await storage.setItem("a", "1");
    await storage.setItem("m", "2");
    const keys = await storage.getAllKeys();
    expect(keys).toEqual(["a", "m", "z"]);
  });

  it("does not include removed keys", async () => {
    const storage = makeStorage();
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    await storage.removeItem("a");
    expect(await storage.getAllKeys()).toEqual(["b"]);
  });
});

// ─── AsyncStorage – batch methods ────────────────────────────────────────────

describe("AsyncStorage.multiGet", () => {
  it("returns array of [key, value] pairs", async () => {
    const storage = makeStorage();
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    const result = await storage.multiGet(["a", "b"]);
    expect(result).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  it("returns null for missing keys", async () => {
    const storage = makeStorage();
    await storage.setItem("a", "1");
    const result = await storage.multiGet(["a", "missing"]);
    expect(result).toEqual([
      ["a", "1"],
      ["missing", null],
    ]);
  });

  it("preserves input key order", async () => {
    const storage = makeStorage();
    await storage.setItem("c", "3");
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    const result = await storage.multiGet(["c", "a", "b"]);
    expect(result.map((r) => r[0])).toEqual(["c", "a", "b"]);
  });

  it("returns empty array for empty input", async () => {
    const storage = makeStorage();
    expect(await storage.multiGet([])).toEqual([]);
  });

  it("rejects if any key is non-string", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.multiGet(["a", 42, "b"])).rejects.toBeInstanceOf(
      InvalidKeyError,
    );
  });

  it("does not write anything on success", async () => {
    const storage = makeStorage();
    await storage.multiGet(["x"]);
    expect(await storage.getAllKeys()).toEqual([]);
  });
});

describe("AsyncStorage.multiSet", () => {
  it("stores all pairs", async () => {
    const storage = makeStorage();
    await storage.multiSet([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    expect(await storage.getItem("a")).toBe("1");
    expect(await storage.getItem("b")).toBe("2");
    expect(await storage.getItem("c")).toBe("3");
  });

  it("resolves for empty array", async () => {
    const storage = makeStorage();
    await expect(storage.multiSet([])).resolves.toBeUndefined();
  });

  it("rejects if any key is non-string (no partial writes)", async () => {
    const storage = makeStorage();
    await expect(
      // @ts-expect-error
      storage.multiSet([
        ["a", "1"],
        [99, "2"],
      ]),
    ).rejects.toBeInstanceOf(InvalidKeyError);
    // "a" must NOT have been written due to fail-fast validation
    expect(await storage.getItem("a")).toBeNull();
  });

  it("rejects if any value is non-string (no partial writes)", async () => {
    const storage = makeStorage();
    await expect(
      // @ts-expect-error
      storage.multiSet([
        ["a", "1"],
        ["b", 2],
      ]),
    ).rejects.toBeInstanceOf(InvalidValueError);
    expect(await storage.getItem("a")).toBeNull();
  });
});

describe("AsyncStorage.multiRemove", () => {
  it("removes all specified keys", async () => {
    const storage = makeStorage();
    await storage.multiSet([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    await storage.multiRemove(["a", "c"]);
    expect(await storage.getAllKeys()).toEqual(["b"]);
  });

  it("resolves for empty array", async () => {
    const storage = makeStorage();
    await expect(storage.multiRemove([])).resolves.toBeUndefined();
  });

  it("does not throw for absent keys", async () => {
    const storage = makeStorage();
    await expect(storage.multiRemove(["ghost"])).resolves.toBeUndefined();
  });

  it("rejects if any key is non-string", async () => {
    const storage = makeStorage();
    await storage.setItem("a", "1");
    // @ts-expect-error
    await expect(storage.multiRemove(["a", false])).rejects.toBeInstanceOf(
      InvalidKeyError,
    );
  });
});

// ─── AsyncStorage – merge methods ────────────────────────────────────────────

describe("AsyncStorage.mergeItem", () => {
  it("merges new JSON object into existing JSON object", async () => {
    const storage = makeStorage();
    await storage.setItem("user", JSON.stringify({ name: "Alice", age: 30 }));
    await storage.mergeItem("user", JSON.stringify({ age: 31, city: "Oslo" }));
    const raw = await storage.getItem("user");
    expect(JSON.parse(raw!)).toEqual({ name: "Alice", age: 31, city: "Oslo" });
  });

  it("treats missing key as empty object", async () => {
    const storage = makeStorage();
    await storage.mergeItem("config", JSON.stringify({ theme: "dark" }));
    const raw = await storage.getItem("config");
    expect(JSON.parse(raw!)).toEqual({ theme: "dark" });
  });

  it("incoming properties override existing ones", async () => {
    const storage = makeStorage();
    await storage.setItem("s", JSON.stringify({ a: 1, b: 2 }));
    await storage.mergeItem("s", JSON.stringify({ b: 99 }));
    expect(JSON.parse((await storage.getItem("s"))!)).toEqual({ a: 1, b: 99 });
  });

  it("rejects when existing value is invalid JSON", async () => {
    const storage = makeStorage();
    await storage.setItem("bad", "not-json");
    await expect(
      storage.mergeItem("bad", JSON.stringify({ x: 1 })),
    ).rejects.toBeInstanceOf(InvalidJsonError);
  });

  it("rejects when incoming value is invalid JSON", async () => {
    const storage = makeStorage();
    await storage.setItem("ok", JSON.stringify({ a: 1 }));
    await expect(storage.mergeItem("ok", "not-json")).rejects.toBeInstanceOf(
      InvalidJsonError,
    );
  });

  it("rejects when existing value is a JSON array (not an object)", async () => {
    const storage = makeStorage();
    await storage.setItem("arr", JSON.stringify([1, 2, 3]));
    await expect(
      storage.mergeItem("arr", JSON.stringify({ a: 1 })),
    ).rejects.toBeInstanceOf(InvalidJsonError);
  });

  it("rejects when incoming value is a JSON array", async () => {
    const storage = makeStorage();
    await storage.setItem("s", JSON.stringify({ a: 1 }));
    await expect(
      storage.mergeItem("s", JSON.stringify([1, 2])),
    ).rejects.toBeInstanceOf(InvalidJsonError);
  });

  it("rejects with InvalidKeyError for non-string key", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.mergeItem(42, "{}")).rejects.toBeInstanceOf(
      InvalidKeyError,
    );
  });

  it("rejects with InvalidValueError for non-string value", async () => {
    const storage = makeStorage();
    // @ts-expect-error
    await expect(storage.mergeItem("k", {})).rejects.toBeInstanceOf(
      InvalidValueError,
    );
  });
});

describe("AsyncStorage.multiMerge", () => {
  it("merges multiple key-value JSON pairs", async () => {
    const storage = makeStorage();
    await storage.setItem("a", JSON.stringify({ x: 1 }));
    await storage.setItem("b", JSON.stringify({ y: 2 }));
    await storage.multiMerge([
      ["a", JSON.stringify({ x: 99, z: 3 })],
      ["b", JSON.stringify({ w: 4 })],
    ]);
    expect(JSON.parse((await storage.getItem("a"))!)).toEqual({ x: 99, z: 3 });
    expect(JSON.parse((await storage.getItem("b"))!)).toEqual({ y: 2, w: 4 });
  });

  it("resolves for empty array", async () => {
    const storage = makeStorage();
    await expect(storage.multiMerge([])).resolves.toBeUndefined();
  });

  it("rejects on invalid JSON in any value", async () => {
    const storage = makeStorage();
    await storage.setItem("a", JSON.stringify({ x: 1 }));
    await expect(
      storage.multiMerge([["a", "not-json"]]),
    ).rejects.toBeInstanceOf(InvalidJsonError);
  });
});

// ─── Async boundary enforcement ───────────────────────────────────────────────

describe("Async boundary", () => {
  it("getItem result is always a Promise, not a plain value", () => {
    const storage = makeStorage();
    const result = storage.getItem("k");
    expect(result).toBeInstanceOf(Promise);
  });

  it("setItem result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.setItem("k", "v")).toBeInstanceOf(Promise);
  });

  it("removeItem result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.removeItem("k")).toBeInstanceOf(Promise);
  });

  it("clear result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.clear()).toBeInstanceOf(Promise);
  });

  it("getAllKeys result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.getAllKeys()).toBeInstanceOf(Promise);
  });

  it("multiGet result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.multiGet([])).toBeInstanceOf(Promise);
  });

  it("multiSet result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.multiSet([])).toBeInstanceOf(Promise);
  });

  it("multiRemove result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.multiRemove([])).toBeInstanceOf(Promise);
  });

  it("mergeItem result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.mergeItem("k", "{}")).toBeInstanceOf(Promise);
  });

  it("multiMerge result is always a Promise", () => {
    const storage = makeStorage();
    expect(storage.multiMerge([])).toBeInstanceOf(Promise);
  });

  it("callbacks run asynchronously (microtask after current tick)", async () => {
    const storage = makeStorage();
    let resolved = false;
    const p = storage.getItem("x").then(() => {
      resolved = true;
    });
    // Has not resolved yet (still in current microtask queue)
    expect(resolved).toBe(false);
    await p;
    expect(resolved).toBe(true);
  });
});

// ─── Backend injection ────────────────────────────────────────────────────────

describe("useBackend", () => {
  it("swaps the active backend", async () => {
    const storage = makeStorage();
    await storage.setItem("k", "old");

    const fresh = new MemoryBackend();
    storage.useBackend(fresh);
    expect(await storage.getItem("k")).toBeNull();

    await storage.setItem("k", "new");
    expect(await storage.getItem("k")).toBe("new");
  });

  it("propagates BackendError from backend", async () => {
    const storage = makeStorage();

    const brokenBackend: StorageBackend = {
      getItem(): string | null {
        throw new BackendError("getItem", new Error("disk full"));
      },
      setItem(): void {
        throw new BackendError("setItem", new Error("disk full"));
      },
      removeItem(): void {},
      clear(): void {},
      getAllKeys(): string[] {
        return [];
      },
    };

    storage.useBackend(brokenBackend);
    await expect(storage.getItem("k")).rejects.toBeInstanceOf(BackendError);
    await expect(storage.setItem("k", "v")).rejects.toBeInstanceOf(
      BackendError,
    );
  });
});

// ─── Error class shape ────────────────────────────────────────────────────────

describe("Error class hierarchy", () => {
  it("InvalidKeyError is instanceof Error", () => {
    expect(new InvalidKeyError("x")).toBeInstanceOf(Error);
  });

  it("InvalidValueError is instanceof Error", () => {
    expect(new InvalidValueError(42)).toBeInstanceOf(Error);
  });

  it("InvalidJsonError is instanceof Error", () => {
    expect(new InvalidJsonError("existing")).toBeInstanceOf(Error);
  });

  it("BackendError is instanceof Error", () => {
    expect(new BackendError("op")).toBeInstanceOf(Error);
  });

  it("errors carry correct code", () => {
    expect(new InvalidKeyError("k").code).toBe("ERR_ASYNC_STORAGE_INVALID_KEY");
    expect(new InvalidValueError(1).code).toBe(
      "ERR_ASYNC_STORAGE_INVALID_VALUE",
    );
    expect(new InvalidJsonError("existing").code).toBe(
      "ERR_ASYNC_STORAGE_INVALID_JSON",
    );
    expect(new BackendError("op").code).toBe(
      "ERR_ASYNC_STORAGE_BACKEND_FAILURE",
    );
  });
});
