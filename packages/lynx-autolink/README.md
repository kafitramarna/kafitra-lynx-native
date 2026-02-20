# @kafitra/lynx-autolink

> Core auto-linking library for [Lynx](https://lynxjs.org) Native Modules on Android.  
> Used internally by [`@kafitra/lynx-cli`](../lynx-cli/README.md) — you rarely need to call this directly.
>
> **Repository:** [github.com/kafitramarna/kafitra-lynx-native](https://github.com/kafitramarna/kafitra-lynx-native)

---

## Overview

`@kafitra/lynx-autolink` scans `node_modules` for Lynx Native Module packages (identified by a `lynx.module.json` metadata file), then generates all the Android plumbing needed to wire them up:

| What it does | Output |
|---|---|
| Scans node_modules (hoisted + nested) | List of `LynxModuleMetadata` |
| Validates each `lynx.module.json` | Throws descriptive error on bad schema |
| Generates `LynxAutolinkRegistry.java` | Drop-in registry class, call `registerAll()` |
| Patches `settings.gradle` | Idempotent `include ':module-name'` block |
| Patches `app/build.gradle` | Idempotent `implementation project(':module-name')` |

---

## Installation

```bash
pnpm add -D @kafitra/lynx-autolink
# or
npm install --save-dev @kafitra/lynx-autolink
```

---

## API Reference

### `scanModules(projectRoot: string): LynxModuleMetadata[]`

Walks all `node_modules` directories reachable from `projectRoot` (handles hoisted monorepos).  
Returns an array of validated `LynxModuleMetadata` objects — one per package that has a `lynx.module.json`.

```ts
import { scanModules } from "@kafitra/lynx-autolink";

const modules = scanModules(process.cwd());
// [{ name: "LynxDeviceInfo", android: { moduleClass: "...", sourceDir: "android" }, ... }]
```

---

### `writeJavaRegistry(androidAppDir, javaPackage, modules)`

Generates `LynxAutolinkRegistry.java` into `<androidAppDir>/src/main/java/<javaPackage>/`.  
The file is **always overwritten** so it stays in sync with installed packages.

```ts
import { writeJavaRegistry } from "@kafitra/lynx-autolink";

writeJavaRegistry("./android/app", "com.example.app", modules);
```

**Generated file looks like:**

```java
package com.example.app;

import com.lynx.tasm.LynxEnv;
import com.example.mymodule.MyLynxModule;

public class LynxAutolinkRegistry {
    public static void registerAll() {
        LynxEnv.inst().registerModule("MyModule", MyLynxModule.class);
    }
}
```

Then call it from your `Application` class:

```java
@Override
protected void initLynxEnv() {
    LynxEnv.inst().init(this, null, null, null);
    LynxAutolinkRegistry.registerAll(); // ← auto-linked modules
}
```

---

### `injectSettings(settingsFile, modules)`

Idempotently inserts Gradle project includes into `settings.gradle`, wrapped in markers:

```groovy
// lynx-autolink-start
include ':lynx-device-info'
project(':lynx-device-info').projectDir = new File(rootDir, '../../../packages/lynx-device-info/android')
// lynx-autolink-end
```

Safe to run multiple times — existing block is replaced, not duplicated.

---

### `injectBuildGradle(buildFile, modules)`

Idempotently adds `implementation project(':...')` lines to the first `dependencies {}` block in `app/build.gradle`.

---

### `readApplicationId(buildGradlePath): string | null`

Reads the `applicationId` from an `app/build.gradle` file using a regex.  
Used by the CLI to infer the Java package for the registry class.

---

### `validateMetadata(raw, source): LynxModuleMetadata`

Validates a parsed `lynx.module.json` object. Throws a descriptive error if required fields are missing or malformed.

---

## `lynx.module.json` Schema

Place this file at the **root** of your Lynx Native Module npm package:

```json
{
  "name": "LynxDeviceInfo",
  "android": {
    "moduleClass": "com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule",
    "sourceDir": "android",
    "gradleProjectName": "lynx-device-info"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Module name registered with `LynxEnv` (e.g. `"LynxDeviceInfo"`) |
| `android.moduleClass` | `string` | ✅ | Fully-qualified Java class name of the `LynxModule` implementation |
| `android.sourceDir` | `string` | ✅ | Relative path to the Android library directory inside the package |
| `android.gradleProjectName` | `string` | ❌ | Override for the Gradle project name. Defaults to the kebab-cased npm package name |

---

## Types

```ts
export interface LynxModuleAndroidConfig {
  moduleClass: string;
  sourceDir: string;
  gradleProjectName?: string;
}

export interface LynxModuleMetadata {
  name: string;
  android: LynxModuleAndroidConfig;
  /** Populated by scanner — not present in lynx.module.json */
  packageDir?: string;
  packageName?: string;
}
```

---

## Creating a Lynx Native Module

To make your package auto-linkable, add `lynx.module.json` to it and include it in `files[]`:

```json
// package.json
{
  "name": "@your-scope/lynx-my-module",
  "files": ["dist", "android", "ios", "lynx.module.json"]
}
```

Then implement a standard Lynx `LynxModule` in `android/src/main/java/...`.

---

## License

MIT
