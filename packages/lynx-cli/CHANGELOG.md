# Changelog

All notable changes to `@kafitra/lynx-cli` will be documented in this file.

## [0.2.1] — 2026-02-21

### Added

- **`isPortInUse(port)`** (`utils/terminal.ts`) — Checks if a port is already bound before opening a new terminal, preventing duplicate dev server instances.

- **`prebuild` auto-build bundle** — If `dist/main.lynx.bundle` does not exist when prebuild completes, automatically runs `pnpm/yarn/npm run build` before copying to assets. No more manual build step required.

### Fixed

- **Dev server starts before device detection** (`run android`) — Dev server is now started (or detected as already running) at Step 2, before connecting to a device. This ensures the bundle URL is reachable the moment the app launches.

- **No duplicate dev server** (`run android`) — `isPortInUse()` check prevents opening a new terminal window if port 3000 is already in use.

- **`adb`/`emulator` hang fixed** (`utils/android.ts`) — All `execSync` calls now have explicit timeouts: `adb devices` → 10 s, `emulator -list-avds` → 10 s, `adb shell getprop` → 5 s. Previously these could hang indefinitely if the ADB daemon failed to start.

## [0.2.0] — 2026-02-21

### Added

- **`lynx run android`** — Full Android dev loop in one command:
  - Auto-runs `lynx link` before build
  - Detects connected devices/emulators via `adb devices`
  - Auto-launches first available AVD if no device is connected (`emulator -list-avds`, waits up to 2 min for boot)
  - Runs `gradlew installDebug`, streams output to terminal
  - Launches main activity via `adb shell am start`
  - Sets up `adb reverse tcp:3000 tcp:3000` for dev server
  - Opens dev server in a new terminal window after APK install (cross-platform: Windows Terminal / cmd, macOS via AppleScript, Linux gnome-terminal / xterm)
  - Flags: `--android-dir`, `--project-root`, `--device`, `--no-link`

- **`lynx run ios`** — Initial iOS support (macOS only):
  - Guards non-macOS systems with a clear error
  - Runs `pod install` in `ios/`
  - Builds via `xcodebuild -sdk iphonesimulator`
  - Launches on booted simulator via `xcrun simctl launch`
  - Flags: `--ios-dir`, `--bundle-id`, `--no-pod-install`

- **`lynx prebuild`** — Generate a clean Android host project from template:
  - Creates full `android/` directory structure
  - Generates: `settings.gradle`, `build.gradle` (root + app), `gradlew`, `gradlew.bat`, `AndroidManifest.xml`, `LynxApplication.java`, `MainActivity.java`, `LynxTemplateProvider.java`, `LynxAutolinkRegistry.java`
  - Generates `res/xml/network_security_config.xml` and wires it into `AndroidManifest.xml` (cleartext HTTP for dev server on Android API 28+)
  - `MainActivity` template includes ETag-based HMR polling (HEAD request every 1.5 s, calls `renderTemplateUrl` on bundle change)
  - Correct Lynx 3.6.0 API: `extends Activity` + `LynxViewBuilder` + `AbsTemplateProvider`
  - Injects `applicationId` / `namespace` from `--package` flag
  - Guards existing directory (use `--force` to overwrite)
  - Auto-runs `lynx link` after generation
  - Auto-copies `dist/main.lynx.bundle` → assets if it exists
  - All file writes create parent directories automatically
  - Flags: `--package` (required), `--android-dir`, `--project-root`, `--force`

- **`lynx dev`** — Start JS dev server with bundle URL display:
  - Auto-detects package manager (`pnpm`, `yarn`, `npm`)
  - Spawns `pnpm/yarn/npm run dev` as child process
  - Detects and prints all local network IPv4 addresses
  - Displays bundle URLs for localhost and LAN
  - Graceful shutdown on Ctrl+C
  - Flags: `--project-root`, `--port`

- **`lynx doctor`** — Environment health check:
  - Checks: Node.js ≥ 18, Java ≥ 17, `adb`, `ANDROID_HOME`, Gradle wrapper, connected devices
  - Color-coded table with ✔/✖/⚠ per check
  - Descriptive fix hints for failed checks
  - Exits with code 1 if any critical check fails
  - Flags: `--android-dir`

- **Auto-download `gradle-wrapper.jar`** — `prebuild` and `run android` call `ensureGradleWrapperJar()` which downloads the jar from GitHub if missing.

- **`utils/android.ts`** — Added `getAvailableAvds()`, `launchEmulator()`, `waitForDevice()`.

- **`utils/terminal.ts`** — New utility: `openDevServerTerminal(projectRoot, port)`.

### Fixed

- **Windows space-in-path** — `gradlew.bat` path is now double-quoted in the shell command, fixing `'C:\Users\HYPE' is not recognized` on paths with spaces.

- **Non-fatal link step** — `run android` silently continues if `lynx link` fails (e.g., no modules found).

### Changed

- **CLI architecture refactored** — `src/utils/` now has dedicated modules:
  - `env.ts` — environment check functions
  - `android.ts` — adb, gradlew path, device detection, activity launch, AVD management
  - `gradle.ts` — gradlew subprocess runner, wrapper jar download
  - `ios.ts` — macOS detection, pod install, xcodebuild, simulator launch
  - `terminal.ts` — cross-platform dev server terminal launcher
- **`--help` output** updated to show all new commands and flags

### Internal

- `VERSION` constant bumped to `0.2.0`

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
