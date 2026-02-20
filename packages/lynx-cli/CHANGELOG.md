# Changelog

All notable changes to `@kafitra/lynx-cli` will be documented in this file.

## [0.1.0] — 2026-02-20

### Added

- **`lynx link` command** — Orchestrates the full auto-linking flow for Android:
  1. Scans `node_modules` for `lynx.module.json` metadata
  2. Generates `LynxAutolinkRegistry.java` in the correct package directory
  3. Injects `include` entries into `settings.gradle`
  4. Injects `implementation project(...)` entries into `app/build.gradle`
  5. Prints a colorized summary with linked module names and class references

- **Flags for `link`:**
  - `--project-root <path>` — Override project root (default: `process.cwd()`)
  - `--android-dir <path>` — Override Android directory name (default: `android`)
  - `--java-package <name>` — Explicit Java package for registry class (default: inferred from `applicationId`)

- **`--help` / `--version`** — Standard CLI info flags.
- **Colorized output** — Uses `picocolors` for step indicators, success/warn/error states.
- **Exit codes** — `0` on success, `1` on any error (with descriptive message).
- **Zero extra runtime dependencies** — Only `picocolors` + `@kafitra/lynx-autolink`.
