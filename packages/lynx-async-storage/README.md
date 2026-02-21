# @kafitra/lynx-async-storage

Async key-value storage for the [Lynx](https://lynxjs.org) runtime — mirrors the React Native `AsyncStorage` API.

## Features

- **Drop-in API** – same method signatures as React Native `AsyncStorage`
- **Pure JS** – no native Android/iOS modules, no `prebuild` step
- **Thin async wrapper** – microtask-scheduled Promises over the synchronous Lynx runtime storage
- **JSON merge** – shallow object merge via `mergeItem` / `multiMerge`
- **Pluggable backend** – swap the storage adapter at runtime or in tests
- **Tree-shakeable** – `"sideEffects": false`, ESM + CJS dual output
- **Strict TypeScript** – full type safety, no implicit `any`

---

## Installation

```bash
pnpm add @kafitra/lynx-async-storage
# or
npm install @kafitra/lynx-async-storage
```

---

## Quick Start

```ts
import AsyncStorage from "@kafitra/lynx-async-storage";

// Store a value
await AsyncStorage.setItem("token", "abc123");

// Retrieve a value (null if absent)
const token = await AsyncStorage.getItem("token");
console.log(token); // 'abc123'

// Remove a value
await AsyncStorage.removeItem("token");

// Clear everything
await AsyncStorage.clear();
```

---

## API Reference

### Single-key methods

| Method       | Signature                                       | Description                                |
| ------------ | ----------------------------------------------- | ------------------------------------------ |
| `getItem`    | `(key: string) => Promise<string \| null>`      | Returns the value, or `null` if absent     |
| `setItem`    | `(key: string, value: string) => Promise<void>` | Stores a value                             |
| `removeItem` | `(key: string) => Promise<void>`                | Removes a single key                       |
| `clear`      | `() => Promise<void>`                           | Removes **all** keys                       |
| `getAllKeys` | `() => Promise<string[]>`                       | Returns all keys, sorted lexicographically |

### Batch methods

| Method        | Signature                                                 | Description                               |
| ------------- | --------------------------------------------------------- | ----------------------------------------- |
| `multiGet`    | `(keys: string[]) => Promise<[string, string \| null][]>` | Fetches multiple keys; order is preserved |
| `multiSet`    | `(pairs: [string, string][]) => Promise<void>`            | Stores multiple pairs atomically          |
| `multiRemove` | `(keys: string[]) => Promise<void>`                       | Removes multiple keys                     |

### Merge methods

| Method       | Signature                                       | Description                                        |
| ------------ | ----------------------------------------------- | -------------------------------------------------- |
| `mergeItem`  | `(key: string, value: string) => Promise<void>` | Shallow-merges a JSON object into the stored value |
| `multiMerge` | `(pairs: [string, string][]) => Promise<void>`  | Applies `mergeItem` for each pair                  |

---

## Usage Examples

### Storing structured data

```ts
import AsyncStorage from "@kafitra/lynx-async-storage";

const user = { id: 1, name: "Alice", role: "admin" };
await AsyncStorage.setItem("user", JSON.stringify(user));

const raw = await AsyncStorage.getItem("user");
const parsed = raw ? JSON.parse(raw) : null;
```

### Batch read / write

```ts
await AsyncStorage.multiSet([
  ["firstName", "Alice"],
  ["lastName", "Smith"],
  ["city", "Oslo"],
]);

const results = await AsyncStorage.multiGet(["firstName", "city"]);
// [['firstName', 'Alice'], ['city', 'Oslo']]
```

### JSON merge

```ts
// Initial state
await AsyncStorage.setItem(
  "prefs",
  JSON.stringify({ theme: "light", lang: "en" }),
);

// Partial update – only theme changes; lang is preserved
await AsyncStorage.mergeItem("prefs", JSON.stringify({ theme: "dark" }));

const prefs = JSON.parse((await AsyncStorage.getItem("prefs")) ?? "{}");
// { theme: 'dark', lang: 'en' }
```

### List all stored keys

```ts
await AsyncStorage.multiSet([
  ["b", "2"],
  ["a", "1"],
  ["c", "3"],
]);
const keys = await AsyncStorage.getAllKeys();
// ['a', 'b', 'c']  ← always sorted
```

---

## Custom / Test Backend

Inject any object that satisfies `StorageBackend` for testing or custom adapters:

```ts
import { AsyncStorage, MemoryBackend } from "@kafitra/lynx-async-storage";

const storage = new AsyncStorage(new MemoryBackend());

// Or swap the singleton's backend:
import instance from "@kafitra/lynx-async-storage";
import { MemoryBackend } from "@kafitra/lynx-async-storage";

instance.useBackend(new MemoryBackend());
```

Implement `StorageBackend` yourself:

```ts
import type { StorageBackend } from "@kafitra/lynx-async-storage";

class MyCustomBackend implements StorageBackend {
  getItem(key: string): string | null {
    /* … */
  }
  setItem(key: string, value: string): void {
    /* … */
  }
  removeItem(key: string): void {
    /* … */
  }
  clear(): void {
    /* … */
  }
  getAllKeys(): string[] {
    /* … */
  }
}
```

---

## Error Handling

All methods return Promises. Errors are always delivered via rejection – no method throws synchronously.

```ts
import {
  InvalidKeyError,
  InvalidValueError,
  InvalidJsonError,
} from "@kafitra/lynx-async-storage";

try {
  await AsyncStorage.setItem("key", "value");
} catch (err) {
  if (err instanceof InvalidKeyError) {
    /* bad key type */
  }
  if (err instanceof InvalidValueError) {
    /* bad value type */
  }
  if (err instanceof InvalidJsonError) {
    /* merge JSON error */
  }
}
```

### Error types

| Class               | Code                                | Cause                        |
| ------------------- | ----------------------------------- | ---------------------------- |
| `InvalidKeyError`   | `ERR_ASYNC_STORAGE_INVALID_KEY`     | Key is not a `string`        |
| `InvalidValueError` | `ERR_ASYNC_STORAGE_INVALID_VALUE`   | Value is not a `string`      |
| `InvalidJsonError`  | `ERR_ASYNC_STORAGE_INVALID_JSON`    | Non-JSON-object during merge |
| `BackendError`      | `ERR_ASYNC_STORAGE_BACKEND_FAILURE` | Underlying storage threw     |

---

## Runtime Backend Detection

At startup `createDefaultBackend()` probes the runtime in priority order:

```
1. NativeModules.LynxStorage available?  → NativeStorageBackend  (disk, persists across restarts)
2. globalThis.localStorage available?    → LocalStorageBackend   (browser / WebView)
3. fallback                              → MemoryBackend         (in-memory, lost on reload)
```

For disk-persistent storage in a Lynx app, install [`@kafitra/lynx-storage`](https://www.npmjs.com/package/@kafitra/lynx-storage) alongside:

```bash
pnpm add @kafitra/lynx-storage @kafitra/lynx-async-storage
```

No extra configuration needed — `NativeModules.LynxStorage` is auto-detected at runtime.

---

## Design Decisions

### Why microtask scheduling?

`Promise.resolve().then(work)` schedules `work` on the microtask queue. This
guarantees the public API is always async – callers can safely `await` without
relying on synchronous completion, even when the backend is synchronous.

### Why shallow merge?

React Native AsyncStorage specifies a shallow merge for `mergeItem`. Deep merge
would require a third-party library and introduces ambiguity around array
handling. Consumers who need deep merge can read-modify-write using `getItem` /
`setItem`.

### Why sorted `getAllKeys`?

Sorted output is deterministic and consistent across calls regardless of the
order in which keys were inserted – essential for reproducible application
behaviour.

### Why fail-fast validation in batch methods?

Batch operations (`multiSet`, `multiGet`, etc.) validate **all** inputs before
any backend write begins. This provides best-effort atomicity: either all writes
happen or none do, minimising partial-state corruption.

---

## Development

```bash
# Install dependencies
pnpm install

# Build (ESM + CJS + types)
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

---

## License

MIT © Kafitra
