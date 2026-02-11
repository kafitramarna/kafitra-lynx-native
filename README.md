<div align="center">

# Kafitra Lynx Native

**Production-ready native modules for [Lynx](https://lynxjs.org/) cross-platform framework.**

[![npm](https://img.shields.io/npm/v/@kafitra/lynx-device-info?label=%40kafitra%2Flynx-device-info&color=blue)](https://www.npmjs.com/package/@kafitra/lynx-device-info)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-brightgreen.svg)]()

</div>

---

## Packages

<table>
  <thead>
    <tr>
      <th>Package</th>
      <th>Version</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="./packages/lynx-device-info"><code>@kafitra/lynx-device-info</code></a></td>
      <td><code>0.1.0</code></td>
      <td>Access device brand, model, and SDK version</td>
    </tr>
  </tbody>
</table>

## Monorepo Structure

```
kafitra-lynx-native/
├── packages/                    # Native module libraries
│   └── lynx-device-info/        # Device info module
│       ├── src/                  # TypeScript source
│       ├── android/              # Android native implementation
│       └── dist/                 # Compiled output
├── apps/                        # Example & demo applications
│   └── demo/                    # Demo app (Rspeedy + Lynx)
│       ├── src/                  # App source (App.tsx, App.css)
│       └── android-host/        # Android host app for testing
└── package.json                 # Root workspace config
```

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Android Studio** (for native module development)
- **JDK 17+**

### Installation

```bash
# Clone the repository
git clone https://github.com/kafitramarna/kafitra-lynx-native.git
cd kafitra-lynx-native

# Install dependencies
pnpm install

# Build all packages
pnpm run build
```

### Run Demo App

```bash
# Start the development server
pnpm run dev

# In a separate terminal, build & run Android host app
cd apps/demo/android-host
./gradlew installDebug
```

> **Note:** Make sure your Android device/emulator and development machine are on the same network. Update `BUNDLE_URL` in `MainActivity.java` with your machine's IP address.

## Using @kafitra/lynx-device-info

### Install

```bash
npm install @kafitra/lynx-device-info
# or
pnpm add @kafitra/lynx-device-info
```

### Android Setup

Register the native module in your `Application` class:

```java
import com.kafitra.lynxdeviceinfo.LynxDeviceInfoModule;

// In your Application.onCreate():
LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
```

### Usage

```tsx
import { getBrand, getModel, getSDKVersion } from "@kafitra/lynx-device-info";

const brand = await getBrand(); // "Samsung"
const model = await getModel(); // "Galaxy S24"
const sdk = await getSDKVersion(); // 34
```

## Next Development

Here is the list of planned native modules for future development:

<table>
  <thead>
    <tr>
      <th>Module</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@kafitra/lynx-battery</code></td>
      <td>Battery level, charging status, battery health</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-network</code></td>
      <td>Network type (WiFi/cellular), connection strength, IP address</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-app-info</code></td>
      <td>App version, package name, first install time, build number</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-async-storage</code></td>
      <td>Persistent key-value storage (SharedPreferences)</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-clipboard</code></td>
      <td>Read, write system clipboard</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-file-system</code></td>
      <td>Read, write, delete files on device storage</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-vibration</code></td>
      <td>Haptic feedback and vibration patterns</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-screen</code></td>
      <td>Screen dimensions, orientation, brightness control</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-notifications</code></td>
      <td>Local push notifications</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-permissions</code></td>
      <td>Runtime permission management</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-share</code></td>
      <td>Native share dialog (text, files, URLs)</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-biometrics</code></td>
      <td>Fingerprint and face authentication</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-sensors</code></td>
      <td>Accelerometer, gyroscope, proximity sensor</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-camera</code></td>
      <td>Camera access, photo capture, barcode scanning</td>
    </tr>
    <tr>
      <td><code>@kafitra/lynx-geolocation</code></td>
      <td>GPS location access</td>
    </tr>
  </tbody>
</table>

### Future Considerations

- **iOS Support** — Extend all modules with Swift/ObjC native implementations
- **HarmonyOS Support** — Add ArkTS implementations for Huawei ecosystem
- **Auto-linking** — Gradle plugin for automatic native module registration
- **Testing Framework** — Shared mock utilities for unit testing native modules

## Contributing

Contributions are welcome! To add a new native module:

1. Create a new package in `packages/`
2. Follow the structure of `lynx-device-info`
3. Implement TypeScript API + Android native module
4. Add a demo in `apps/demo`
5. Submit a PR

### Development Scripts

```bash
pnpm run build     # Build all packages
pnpm run dev       # Start demo dev server
pnpm run clean     # Clean build artifacts
```

## License

MIT © [Kafitra Marna](https://github.com/kafitramarna)
