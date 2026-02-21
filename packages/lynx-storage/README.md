<div align="center">

# @kafitra/lynx-storage

**Persistent key-value storage native module for [Lynx](https://lynxjs.org/).**

Backed by **Android SharedPreferences** and **iOS NSUserDefaults** — data survives app restarts.

[![npm](https://img.shields.io/npm/v/@kafitra/lynx-storage?color=blue)](https://www.npmjs.com/package/@kafitra/lynx-storage)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](../../LICENSE)

</div>

---

## Overview

`@kafitra/lynx-storage` exposes a synchronous native key-value store to the Lynx JS runtime via `NativeModules.LynxStorage`. It is the persistence layer used by [`@kafitra/lynx-async-storage`](../lynx-async-storage) when running inside a Lynx app.

| Platform | Implementation      | Storage file / suite      |
| -------- | ------------------- | ------------------------- |
| Android  | `SharedPreferences` | `kafitra_lynx_storage`    |
| iOS      | `NSUserDefaults`    | `com.kafitra.lynxstorage` |

---

## Installation

```bash
npm install @kafitra/lynx-storage
# or
pnpm add @kafitra/lynx-storage
```

---

## Android Setup

### 1. Auto-link (recommended)

Run the Kafitra CLI linker from your app directory:

```bash
npx @kafitra/lynx-cli link
```

This auto-generates `LynxAutolinkRegistry.java` and injects Gradle wiring.

### 2. Register in your Application class

```java
// LynxApplication.java (or wherever you init LynxEnv)
import com.kafitra.demo.LynxAutolinkRegistry;

LynxEnv.inst().init(this, null, null, null);
LynxAutolinkRegistry.registerAll(); // ← registers LynxStorageModule
```

### 3. Manual setup (without CLI)

If you prefer not to use the CLI, add these entries manually:

**`android/settings.gradle`**

```groovy
include ':lynx-storage'
project(':lynx-storage').projectDir = new File(rootDir, '../node_modules/@kafitra/lynx-storage/android')
```

**`android/app/build.gradle`**

```groovy
dependencies {
    implementation project(':lynx-storage')
}
```

**`LynxAutolinkRegistry.java`** (or your Application init)

```java
import com.kafitra.lynxstorage.LynxStorageModule;

LynxEnv.inst().registerModule("LynxStorage", LynxStorageModule.class);
```

---

## iOS Setup

### Register in your host app

```objc
// In your LynxInitProcessor or AppDelegate, before creating any Lynx view:
#import "LynxStorageModule.h"

[globalConfig registerModule:LynxStorageModule.class];
```

---

## JavaScript API

The module is exposed on the Lynx `NativeModules` global as `NativeModules.LynxStorage`:

```ts
declare const NativeModules: {
  LynxStorage: {
    getString(key: string): string | null;
    setString(key: string, value: string): void;
    remove(key: string): void;
    clear(): void;
    getAllKeys(): string; // JSON array string, e.g. '["a","b"]'
  };
};
```

### Direct usage (TypeScript)

```ts
import { LynxStorage } from "@kafitra/lynx-storage";

// Read
const value = LynxStorage.getString("token"); // string | null

// Write
LynxStorage.setString("token", "abc123");

// Delete
LynxStorage.remove("token");

// Clear everything
LynxStorage.clear();

// Get all keys
const keys = JSON.parse(LynxStorage.getAllKeys()); // string[]
```

> **Tip:** All methods are **synchronous**. If you prefer a Promise-based API, use [`@kafitra/lynx-async-storage`](https://www.npmjs.com/package/@kafitra/lynx-async-storage) — it auto-detects and wraps this module.

---

## With @kafitra/lynx-async-storage

Install both packages in your app:

```bash
pnpm add @kafitra/lynx-storage @kafitra/lynx-async-storage
```

Then use `@kafitra/lynx-async-storage` in your code — it will automatically use `LynxStorage` as its backend:

```ts
import AsyncStorage from "@kafitra/lynx-async-storage";

await AsyncStorage.setItem("session", JSON.stringify({ user: "demo" }));
const session = await AsyncStorage.getItem("session");
```

No extra configuration needed. `@kafitra/lynx-async-storage` detects `NativeModules.LynxStorage` at runtime and uses it automatically.

---

## `lynx.module.json`

This file is used by `@kafitra/lynx-autolink` for auto-linking:

```json
{
  "name": "LynxStorage",
  "android": {
    "moduleClass": "com.kafitra.lynxstorage.LynxStorageModule",
    "sourceDir": "android"
  }
}
```

---

## Monorepo / Workspace

If you're using this in a monorepo with `pnpm workspaces`:

```json
{
  "dependencies": {
    "@kafitra/lynx-storage": "workspace:*"
  }
}
```

---

## License

MIT © [Kafitra Marna](https://github.com/kafitramarna)
