# Android Host App — Lynx DeviceInfo Demo

This is the Android host application that embeds the Lynx runtime and renders the demo Lynx bundle.

## Prerequisites

- Android Studio (latest)
- Android SDK 34
- Java 8+

## Setup

### 1. Copy the native module

Copy `LynxDeviceInfoModule.java` from `packages/lynx-device-info/android/` into this project, or add it as a module dependency.

### 2. Configure bundle URL

In `MainActivity.java`, update `BUNDLE_URL`:

```java
// Dev server (replace with your IP)
private static final String BUNDLE_URL = "http://YOUR_IP:3000/main.lynx.bundle";

// Or local assets
private static final String BUNDLE_URL = "main.lynx.bundle";
```

### 3. For local assets (production)

Build the Lynx bundle and copy it to assets:

```bash
cd ../../  # back to apps/demo
pnpm build
cp dist/main.lynx.bundle android-host/app/src/main/assets/
```

## Run

### Dev mode (network bundle)

1. Start the Lynx dev server:

   ```bash
   cd kafitra-lynx-native/apps/demo
   pnpm dev
   ```

2. Update `BUNDLE_URL` with your machine's IP address

3. Build and run the Android app:

   ```bash
   cd android-host
   ./gradlew installDebug
   ```

4. Make sure your phone/emulator and dev machine are on the **same WiFi network**

### Production mode (asset bundle)

1. Build the bundle and copy to assets (see step 3 above)
2. Set `BUNDLE_URL = "main.lynx.bundle"` in `MainActivity.java`
3. Build and install the APK

## Architecture

```
DemoApplication.java
  ├── initLynxService()     → Fresco, Image, Log, Http services
  └── initLynxEnv()         → LynxEnv.init() + registerModule("LynxDeviceInfo")

MainActivity.java
  ├── buildLynxView()       → LynxViewBuilder + DemoTemplateProvider + XElement
  └── renderTemplateUrl()   → Loads and renders the bundle

DemoTemplateProvider.java
  ├── loadFromNetwork()     → HTTP fetch for dev server bundles
  └── loadFromAssets()      → Local asset loading for production
```
