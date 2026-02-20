# @kafitra/lynx-cli

> CLI tool for [Lynx](https://lynxjs.org) Native Module auto-linking.  
> Run `lynx link` after installing a new Lynx Native Module to wire it up automatically.
>
> **Repository:** [github.com/kafitramarna/kafitra-lynx-native](https://github.com/kafitramarna/kafitra-lynx-native)

---

## Overview

`@kafitra/lynx-cli` automates the Android integration boilerplate for Lynx Native Modules.  
A single command scans your project's `node_modules`, generates Java glue code, and patches your Gradle files — no manual edits required.

```
apps/my-app/
├── android/
│   ├── settings.gradle          ← patched: include ':lynx-device-info'
│   └── app/
│       ├── build.gradle         ← patched: implementation project(':...')
│       └── src/main/java/com/example/app/
│           └── LynxAutolinkRegistry.java   ← generated
```

---

## Installation

### Monorepo (recommended)

```bash
pnpm add -D @kafitra/lynx-cli
```

Then add a script to the host app's `package.json`:

```json
{
  "scripts": {
    "link:android": "lynx link --android-dir android-host"
  }
}
```

### Standalone / external project

```bash
npx @kafitra/lynx-cli link
```

---

## Usage

```
lynx <command> [options]
```

### `lynx link`

Scans `node_modules`, generates `LynxAutolinkRegistry.java`, and patches `settings.gradle` + `app/build.gradle`.

```bash
npx @kafitra/lynx-cli link [options]
```

| Option                  | Default                       | Description                                                         |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `--project-root <path>` | `process.cwd()`               | Root of the host project (where `node_modules` lives)               |
| `--android-dir <path>`  | `android`                     | Path to the Android project directory, relative to `--project-root` |
| `--java-package <name>` | inferred from `applicationId` | Java package for the generated `LynxAutolinkRegistry` class         |

**Examples:**

```bash
# Standard layout (android/ next to package.json)
npx @kafitra/lynx-cli link

# Custom android directory name
npx @kafitra/lynx-cli link --android-dir android-host

# Running from repo root, targeting a specific app
npx @kafitra/lynx-cli link --project-root apps/demo --android-dir android-host

# Explicit Java package
npx @kafitra/lynx-cli link --java-package com.example.app
```

---

## What `link` does

Running `lynx link` performs five steps:

```
→  Scanning for Lynx Native Modules…
ℹ  Found 1 module(s):
ℹ    • @kafitra/lynx-device-info  (LynxDeviceInfo)

→  Generating LynxAutolinkRegistry.java…
✔  Generated: android/app/src/main/java/com/example/app/LynxAutolinkRegistry.java

→  Injecting settings.gradle entries…
✔  Updated: android/settings.gradle

→  Injecting app/build.gradle dependencies…
✔  Updated: android/app/build.gradle

✔  Linking complete
```

1. **Scan** — finds all packages in `node_modules` that contain a `lynx.module.json`
2. **Resolve package** — infers the Java package from `applicationId` in `app/build.gradle`
3. **Generate registry** — writes `LynxAutolinkRegistry.java` with `registerAll()`
4. **Patch settings.gradle** — inserts `include ':module-name'` (idempotent, marker-based)
5. **Patch app/build.gradle** — inserts `implementation project(':module-name')` (idempotent)

All patch operations are **idempotent**: running the command twice produces the same result.

---

## One-time Application class setup

After running `lynx link` for the first time, call `LynxAutolinkRegistry.registerAll()` in your `Application` class where you initialize Lynx:

```java
// DemoApplication.java
private void initLynxEnv() {
    LynxEnv.inst().init(this, null, null, null);
    LynxAutolinkRegistry.registerAll(); // ← call once
}
```

You do **not** need to update this call again when adding new modules — just re-run `lynx link`.

---

## Monorepo usage

In a pnpm/npm workspaces monorepo, run the command from the app's workspace root (where `node_modules` is populated):

```bash
# From repo root
node packages/lynx-cli/dist/index.js link \
  --project-root apps/demo \
  --android-dir android-host

# Or via workspace script
pnpm --filter @your-scope/demo run link:android
```

The scanner walks up the directory tree to find all `node_modules` directories, supporting both hoisted and non-hoisted package layouts.

---

## How a module declares itself

Each Lynx Native Module package must include a `lynx.module.json` at its package root:

```json
{
  "name": "LynxDeviceInfo",
  "android": {
    "moduleClass": "com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule",
    "sourceDir": "android"
  }
}
```

And list it in `files[]` in `package.json`:

```json
{
  "files": ["dist", "android", "ios", "lynx.module.json"]
}
```

See [`@kafitra/lynx-autolink`](../lynx-autolink/README.md) for the full schema reference.

---

## Other flags

```bash
lynx --version   # print CLI version
lynx --help      # print usage
```

---

## Requirements

- Node.js ≥ 18
- Android project with Gradle (AGP ≥ 7.x)
- Each Lynx Native Module must have `lynx.module.json`

---

## License

MIT
