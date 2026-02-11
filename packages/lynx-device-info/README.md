# @kafitra/lynx-device-info

Lynx Native Module for accessing Android device information. Provides a Promise-based API for retrieving device brand, model, and SDK version.

## Installation

```bash
# npm
npm install @kafitra/lynx-device-info

# pnpm
pnpm add @kafitra/lynx-device-info

# In a monorepo workspace
pnpm add @kafitra/lynx-device-info@workspace:*
```

## Android Setup

### 1. Register the Native Module

In your Android host app's initialization code (e.g., `Application.onCreate()` or your Lynx setup), register the module:

```java
import com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule;

// Register the native module with Lynx runtime
LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
```

### 2. Add the module dependency

In your Android host app's `build.gradle`:

```gradle
dependencies {
    implementation project(':lynx-device-info')
}
```

Or if using the published package, include the `android/` directory in your build.

## Usage

### Basic Usage

```typescript
import { DeviceInfo } from "@kafitra/lynx-device-info";

// All methods return Promises
const brand = await DeviceInfo.getBrand(); // "Samsung"
const model = await DeviceInfo.getModel(); // "Galaxy S24"
const sdkVersion = await DeviceInfo.getSDKVersion(); // 34
```

### Usage with React (Lynx)

```tsx
import { useState, useEffect } from "@lynx-js/react";
import { DeviceInfo } from "@kafitra/lynx-device-info";

function App() {
  const [brand, setBrand] = useState("Loading...");
  const [model, setModel] = useState("Loading...");
  const [sdk, setSdk] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadDeviceInfo() {
      try {
        const b = await DeviceInfo.getBrand();
        const m = await DeviceInfo.getModel();
        const s = await DeviceInfo.getSDKVersion();
        setBrand(b);
        setModel(m);
        setSdk(s);
      } catch (e) {
        setError(true);
      }
    }
    loadDeviceInfo();
  }, []);

  if (error) {
    return <text>⚠ Native module not registered</text>;
  }

  return (
    <view>
      <text>Brand: {brand}</text>
      <text>Model: {model}</text>
      <text>SDK: {sdk}</text>
    </view>
  );
}
```

## API Reference

| Method            | Return Type       | Description                       |
| ----------------- | ----------------- | --------------------------------- |
| `getBrand()`      | `Promise<string>` | Device brand (e.g., "Samsung")    |
| `getModel()`      | `Promise<string>` | Device model (e.g., "Galaxy S24") |
| `getSDKVersion()` | `Promise<number>` | Android SDK version (e.g., 34)    |

## Error Handling

The library provides two levels of error handling:

1. **Module not registered**: If `LynxDeviceInfoModule` is not registered in the Android host, importing the module will throw:

   ```
   [@kafitra/lynx-device-info] Native module not linked.
   Please register LynxDeviceInfoModule in Android host.
   ```

2. **Method failure**: If any individual method call fails, the Promise rejects with a descriptive error:
   ```
   [lynx-device-info] Failed to get brand: <original error>
   ```

## Troubleshooting

### "Native module not linked" error

**Cause**: `LynxDeviceInfoModule` was not registered in your Android host app.

**Fix**: Add the registration call in your app's initialization:

```java
LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
```

### Methods return "unknown"

**Cause**: The Android `Build` class returned null for the requested property. This can happen on emulators or non-standard devices.

**Fix**: This is expected behavior — the module gracefully falls back to `"unknown"` instead of crashing.

## License

MIT
