# Changelog

All notable changes to `@kafitra/lynx-storage` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-02-21

### Added

- **Android** — `LynxStorageModule` backed by `SharedPreferences` (`kafitra_lynx_storage`)
  - `getString(key)` — returns stored string or `null`
  - `setString(key, value)` — persists a string value
  - `remove(key)` — deletes a single entry
  - `clear()` — wipes all entries in this store
  - `getAllKeys()` — returns a JSON array string of all stored keys
- **iOS** — `LynxStorageModule` backed by `NSUserDefaults` (`com.kafitra.lynxstorage`)
  - Same five methods as Android
- **TypeScript** — `NativeLynxStorage` interface and `LynxStorage` accessor exported from `src/index.ts`
- **Auto-link metadata** — `lynx.module.json` for zero-config linking via `@kafitra/lynx-cli link`
- Module name registered as `"LynxStorage"` on `NativeModules`
