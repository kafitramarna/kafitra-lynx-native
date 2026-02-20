# @kafitra/lynx-cli

> Developer workflow CLI for [Lynx](https://lynxjs.org) Native Modules.  
> From project generation to device launch — one tool for the full Android/iOS dev cycle.
>
> **Repository:** [github.com/kafitramarna/kafitra-lynx-native](https://github.com/kafitramarna/kafitra-lynx-native)

---

## Overview

```
lynx doctor          ← check your environment
lynx prebuild        ← generate Android host project
lynx link            ← wire native modules into Gradle
lynx run android     ← build + install + launch on device
lynx dev             ← start JS dev server
lynx run ios         ← build + launch on iOS simulator (macOS)
```

---

## Installation

```bash
pnpm add -D @kafitra/lynx-cli
# or
npm install --save-dev @kafitra/lynx-cli
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "android": "lynx run android --android-dir android-host",
    "dev": "lynx dev",
    "doctor": "lynx doctor"
  }
}
```

---

## Commands

### `lynx doctor`

Check your development environment before you start.

```bash
npx @kafitra/lynx-cli doctor
```

| Check            | Required | Description                      |
| ---------------- | -------- | -------------------------------- |
| Node.js ≥ 18     | critical | Runtime version                  |
| Java (JDK) ≥ 17  | critical | Android build toolchain          |
| adb              | critical | Android Debug Bridge             |
| ANDROID_HOME     | warning  | Android SDK root                 |
| Gradle wrapper   | critical | `gradlew` + `gradle-wrapper.jar` |
| Connected device | warning  | At least one device/emulator     |

Exits with code `1` if any critical check fails.

---

### `lynx prebuild`

Generate a minimal clean Android host project from template.

```bash
npx @kafitra/lynx-cli prebuild --package com.example.myapp
```

| Option                  | Default   | Description                                |
| ----------------------- | --------- | ------------------------------------------ |
| `--package <id>`        | —         | **Required.** Java package / applicationId |
| `--android-dir <path>`  | `android` | Output directory name                      |
| `--project-root <path>` | `cwd`     | Project root                               |
| `--force`               | off       | Overwrite existing directory               |

**Generates:**

```
android/
├── settings.gradle
├── build.gradle
├── gradlew / gradlew.bat
├── gradle/wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle          ← Lynx 3.6.0 deps pre-configured
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/            ← put main.lynx.bundle here
        └── java/com/example/myapp/
            ├── LynxApplication.java
            ├── MainActivity.java
            ├── LynxTemplateProvider.java
            └── LynxAutolinkRegistry.java
```

Auto-runs `lynx link` after generation to wire up any installed modules.

> **Note:** `gradle-wrapper.jar` is not included. Run `gradle wrapper --gradle-version 8.2` inside the Android directory, or copy the jar from an existing project.

---

### `lynx link`

Scan `node_modules`, generate `LynxAutolinkRegistry.java`, and patch `settings.gradle` + `app/build.gradle`.

```bash
npx @kafitra/lynx-cli link [options]
```

| Option                  | Default                       | Description                                           |
| ----------------------- | ----------------------------- | ----------------------------------------------------- |
| `--project-root <path>` | `cwd`                         | Root of the host project (where `node_modules` lives) |
| `--android-dir <path>`  | `android`                     | Android directory name                                |
| `--java-package <name>` | inferred from `applicationId` | Java package for the registry class                   |

All patch operations are **idempotent** — running the command twice produces the same result.

**One-time Application class setup:**

```java
private void initLynxEnv() {
    LynxEnv.inst().init(this, null, null, null);
    LynxAutolinkRegistry.registerAll(); // ← call once
}
```

---

### `lynx run android`

Auto-link → build APK → install → launch. One command replaces all manual steps.

```bash
npx @kafitra/lynx-cli run android [options]
```

| Option                  | Default      | Description                   |
| ----------------------- | ------------ | ----------------------------- |
| `--project-root <path>` | `cwd`        | Root of the host project      |
| `--android-dir <path>`  | `android`    | Android directory name        |
| `--device <serial>`     | first device | Target specific device serial |
| `--no-link`             | off          | Skip auto-running `lynx link` |

**What it does:**

1. Runs `lynx link` (unless `--no-link`)
2. Detects connected devices via `adb devices`
3. Runs `gradlew installDebug` (streams output)
4. Sets up `adb reverse tcp:3000 tcp:3000`
5. Launches app via `adb shell am start`

**Examples:**

```bash
# Standard
npx @kafitra/lynx-cli run android

# Custom android dir (monorepo)
npx @kafitra/lynx-cli run android --android-dir android-host

# From repo root
npx @kafitra/lynx-cli run android --project-root apps/demo --android-dir android-host

# Target specific device
npx @kafitra/lynx-cli run android --device emulator-5554
```

---

### `lynx dev`

Start the JS dev server and display bundle URLs for all network interfaces.

```bash
npx @kafitra/lynx-cli dev [options]
```

| Option                  | Default | Description                            |
| ----------------------- | ------- | -------------------------------------- |
| `--project-root <path>` | `cwd`   | Project root containing `package.json` |
| `--port <number>`       | `3000`  | Dev server port                        |

Auto-detects package manager (`pnpm`, `yarn`, or `npm`) and spawns `run dev`.  
Prints all bundle URLs for localhost and LAN. Ctrl+C shuts down cleanly.

```
→  Starting dev server…

ℹ  Bundle URLs:
ℹ    Local:   http://localhost:3000/main.lynx.bundle
ℹ    Network: http://192.168.1.42:3000/main.lynx.bundle

ℹ  Android port forwarding:
ℹ    adb reverse tcp:3000 tcp:3000
```

---

### `lynx run ios`

Build and launch on iOS simulator. **macOS only.**

```bash
npx @kafitra/lynx-cli run ios --bundle-id com.example.myapp
```

| Option                  | Default | Description                                  |
| ----------------------- | ------- | -------------------------------------------- |
| `--project-root <path>` | `cwd`   | Root of the host project                     |
| `--ios-dir <path>`      | `ios`   | iOS directory name                           |
| `--bundle-id <id>`      | —       | iOS bundle identifier (for simulator launch) |
| `--no-pod-install`      | off     | Skip `pod install`                           |

**What it does:**

1. Guards non-macOS systems
2. Validates `ios/*.xcworkspace` exists
3. Runs `pod install`
4. Builds via `xcodebuild -sdk iphonesimulator`
5. Launches on booted simulator via `xcrun simctl launch`

---

## Monorepo usage

```bash
# From repo root, targeting a specific app
npx @kafitra/lynx-cli run android \
  --project-root apps/demo \
  --android-dir android-host

# Or via workspace script
pnpm --filter @your/demo run android
```

---

## How a module declares itself

Each Lynx Native Module must include a `lynx.module.json` at its package root:

```json
{
  "name": "LynxDeviceInfo",
  "android": {
    "moduleClass": "com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule",
    "sourceDir": "android"
  }
}
```

See [`@kafitra/lynx-autolink`](../lynx-autolink/README.md) for the full schema reference.

---

## Troubleshooting

**`No Android devices or emulators found`**  
→ Connect a device with USB debugging enabled, or start an AVD emulator.

**`Gradle wrapper not found`**  
→ Run `lynx prebuild --package <id>` to generate the project, or  
→ Run `gradle wrapper --gradle-version 8.2` inside your Android directory.

**`pod install failed: CocoaPods not found`**  
→ `sudo gem install cocoapods`

**`adb: command not found`**  
→ Install Android SDK Platform-Tools and add to `PATH`.

**`ANDROID_HOME not set`**  
→ Set it to your SDK path. Run `lynx doctor` for exact instructions.

**Build fails with `AbstractMethodError`**  
→ Do not register `LynxHttpService` — it is incompatible with `lynx:3.6.0` core.

---

## Other flags

```bash
lynx --version   # print CLI version
lynx --help      # print usage
```

---

## Requirements

- Node.js ≥ 18
- JDK ≥ 17 (for Android builds)
- Android SDK + `adb` in PATH
- AGP ≥ 7.x, Gradle ≥ 8.x
- Each Lynx Native Module must have `lynx.module.json`

---

## License

MIT
