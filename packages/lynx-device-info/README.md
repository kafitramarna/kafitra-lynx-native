# @kafitra/lynx-device-info

Lynx Native Module for accessing device information on **Android and iOS**. Provides a Promise-based API for retrieving device identity, OS details, and hardware metadata.

## Installation

```bash
# npm
npm install @kafitra/lynx-device-info

# pnpm
pnpm add @kafitra/lynx-device-info

# In a monorepo workspace
pnpm add @kafitra/lynx-device-info@workspace:*
```

---

## Android Setup

### Auto-linking (recommended)

Run the linker once from your Android project root:

```bash
npx @kafitra/lynx-cli link
```

This generates `LynxAutolinkRegistry.java` and injects the Gradle wiring automatically. Then call:

```java
// In your Application class:
LynxEnv.inst().init(this, null, null, null);
LynxAutolinkRegistry.registerAll();
```

No manual `registerModule` or Gradle edits needed. See the [Auto-linking docs](../../README.md#auto-linking) for details.

### Manual setup (alternative)

#### 1. Register the Native Module

In your Android host app's initialization code (e.g., `Application.onCreate()` or your Lynx setup), register the module:

```java
import com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule;

// Register the native module with Lynx runtime
LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
```

#### 2. Add the module dependency

In your Android host app's `build.gradle`:

```gradle
dependencies {
    implementation project(':lynx-device-info')
}
```

And in `settings.gradle`:

```gradle
include ':lynx-device-info'
project(':lynx-device-info').projectDir = new File(rootDir, '../node_modules/@kafitra/lynx-device-info/android')
```

---

## iOS Setup

### 1. Register the Native Module

In your Lynx setup (e.g., `LynxInitProcessor` or your app delegate's Lynx configuration):

```objc
#import "LynxDeviceInfoModule.h"

// Inside your globalConfig setup:
[globalConfig registerModule:LynxDeviceInfoModule.class];
```

### 2. Add the source files

Include `ios/LynxDeviceInfoModule.h` and `ios/LynxDeviceInfoModule.m` in your Xcode project, with the Lynx SDK integrated via CocoaPods or XCFramework.

---

## Usage

### Named imports (recommended)

```typescript
import {
  getBrand,
  getModel,
  getSDKVersion,
  getManufacturer,
  getDeviceId,
  getSystemName,
  getSystemVersion,
} from "@kafitra/lynx-device-info";

const brand = await getBrand(); // "Samsung" / "Apple"
const model = await getModel(); // "Galaxy S24" / "iPhone"
const sdkVersion = await getSDKVersion(); // 34  (Android) / 0 (iOS)
const manufacturer = await getManufacturer(); // "Samsung" / "Apple"
const deviceId = await getDeviceId(); // "walleye" / UUID string
const systemName = await getSystemName(); // "Android" / "iOS"
const systemVersion = await getSystemVersion(); // "14" / "17.0"
```

### Object-style (also supported)

```typescript
import { DeviceInfo } from "@kafitra/lynx-device-info";

const brand = await DeviceInfo.getBrand();
const systemName = await DeviceInfo.getSystemName();
// ... all 7 methods available on the DeviceInfo object
```

### Usage with React (Lynx)

```tsx
import { useState, useEffect } from "@lynx-js/react";
import {
  getBrand,
  getManufacturer,
  getSystemName,
  getSystemVersion,
} from "@kafitra/lynx-device-info";

function App() {
  const [info, setInfo] = useState({
    brand: "...",
    manufacturer: "...",
    os: "...",
  });

  useEffect(() => {
    async function load() {
      const [brand, manufacturer, systemName, systemVersion] =
        await Promise.all([
          getBrand(),
          getManufacturer(),
          getSystemName(),
          getSystemVersion(),
        ]);
      setInfo({ brand, manufacturer, os: `${systemName} ${systemVersion}` });
    }
    load();
  }, []);

  return (
    <view>
      <text>Brand: {info.brand}</text>
      <text>Manufacturer: {info.manufacturer}</text>
      <text>OS: {info.os}</text>
    </view>
  );
}
```

---

## API Reference

| Method               | Return Type       | Android source          | iOS source                             |
| -------------------- | ----------------- | ----------------------- | -------------------------------------- |
| `getBrand()`         | `Promise<string>` | `Build.BRAND`           | `"Apple"` (constant)                   |
| `getModel()`         | `Promise<string>` | `Build.MODEL`           | `UIDevice.current.model`               |
| `getSDKVersion()`    | `Promise<number>` | `Build.VERSION.SDK_INT` | `0` (not applicable on iOS)            |
| `getManufacturer()`  | `Promise<string>` | `Build.MANUFACTURER`    | `"Apple"` (constant)                   |
| `getDeviceId()`      | `Promise<string>` | `Build.DEVICE`          | `UIDevice.current.identifierForVendor` |
| `getSystemName()`    | `Promise<string>` | `"Android"` (constant)  | `UIDevice.current.systemName`          |
| `getSystemVersion()` | `Promise<string>` | `Build.VERSION.RELEASE` | `UIDevice.current.systemVersion`       |

All methods fall back to `"unknown"` (or `0` for numeric) rather than throwing if the native value is unavailable.

---

## Error Handling

The library provides two levels of error handling:

1. **Module not registered**: If `LynxDeviceInfoModule` is not registered in the host app, importing the module will throw:

   ```
   [@kafitra/lynx-device-info] Native module not linked.
   Please register LynxDeviceInfoModule in your host app.
   ```

2. **Method failure**: If any individual method call fails, the Promise rejects with a descriptive error:
   ```
   [lynx-device-info] Failed to get manufacturer: <original error>
   ```

---

## Troubleshooting

### "Native module not linked" error

**Cause**: `LynxDeviceInfoModule` was not registered in your host app.

**Fix (Android)**:

```java
LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
```

**Fix (iOS)**:

```objc
[globalConfig registerModule:LynxDeviceInfoModule.class];
```

### Methods return "unknown"

**Cause**: The native platform returned null/empty for that property (common on emulators/simulators).

**Fix**: This is expected graceful-fallback behavior — the module returns `"unknown"` instead of crashing.

---

## License

MIT
