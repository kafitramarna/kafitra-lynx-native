# Changelog

All notable changes to `@kafitra/lynx-async-storage` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-02-21

### Added

- **`AsyncStorage` class** — Promise-based key-value API mirroring React Native `AsyncStorage`
  - Single-key: `getItem`, `setItem`, `removeItem`, `clear`, `getAllKeys`
  - Batch: `multiGet`, `multiSet`, `multiRemove`
  - Merge: `mergeItem`, `multiMerge` (shallow JSON merge)
- **`StorageBackend` interface** — pluggable synchronous storage adapter
- **`MemoryBackend`** — `Map`-backed in-memory fallback (default in tests / unknown runtimes)
- **`LocalStorageBackend`** — wraps any Web Storage-compatible `localStorage`
- **`NativeStorageBackend`** — wraps `NativeModules.LynxStorage` for disk-persistent storage in Lynx apps (requires [`@kafitra/lynx-storage`](https://www.npmjs.com/package/@kafitra/lynx-storage))
- **`createDefaultBackend()`** — runtime detection with priority: `NativeStorageBackend` → `LocalStorageBackend` → `MemoryBackend`
- **Error hierarchy** — `AsyncStorageError`, `InvalidKeyError`, `InvalidValueError`, `InvalidJsonError`, `BackendError` with typed `code` fields
- **Singleton default export** — drop-in replacement: `import AsyncStorage from '@kafitra/lynx-async-storage'`
- **Dual build output** — ESM (`dist/index.js`) + CJS (`dist/index.cjs`) + TypeScript declarations via tsup
- **77 unit tests** — full coverage via Vitest, all passing
