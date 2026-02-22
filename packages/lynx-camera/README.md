# @kafitra/lynx-camera

[![Version](https://img.shields.io/badge/version-0.1.2-blue)](./package.json)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](./package.json)

**Native camera preview and capture UI component for [Lynx](https://lynxjs.org).**

Powered by **CameraX** on Android and **AVFoundation** on iOS. Implements the `<camera>` custom element registered via `LynxUI`.

---

## Features (v0.1.1)

| Feature                   | Android                                    | iOS                                |
| ------------------------- | ------------------------------------------ | ---------------------------------- |
| Live preview              | ✅ CameraX `PreviewView` + aspect-fill     | ✅ `AVCaptureVideoPreviewLayer`    |
| Take photo                | ✅ `ImageCapture.takePicture()`            | ✅ `AVCapturePhotoOutput`          |
| Switch camera             | ✅ Front ↔ Back (`device` prop)            | ✅ Front ↔ Back                    |
| Flash control             | ✅ Auto / On / Off                         | ✅ Auto / On / Off                 |
| Torch (continuous)        | ✅                                         | ✅                                 |
| Pinch-to-zoom             | ✅                                         | ✅                                 |
| Zoom range reporting      | ✅ `minZoom` / `maxZoom` via `ZoomState`   | ✅ `activeFormat` limits           |
| Tap-to-focus              | ✅ `CameraControl.startFocusAndMetering()` | ✅                                 |
| Native focus ring overlay | ✅ `FocusRingView` inside `FrameLayout`    | ✅ drawn in `draw(_:)`             |
| Lifecycle pause/resume    | ✅ `LifecycleOwner`-aware                  | ✅ Background/foreground observers |

---

## Installation

```bash
pnpm add @kafitra/lynx-camera
```

### Rspeedy build alias (required)

`@kafitra/lynx-camera` ships its TypeScript source in `src/`. Lynx's bundler
(`pluginReactLynx`) **must process the source files** to generate the background-thread
snapshot registration for the `<camera>` custom element. Without this, the camera view
renders as a black screen.

Add the following alias to your `lynx.config.ts`:

```ts
import { createRequire } from "node:module";
import { defineConfig } from "@lynx-js/rspeedy";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      // Point rspeedy to the TypeScript source so pluginReactLynx can
      // generate the Lynx snapshot for the <camera> custom element.
      "@kafitra/lynx-camera": require.resolve("@kafitra/lynx-camera/src"),
    },
  },
  tools: {
    rspack: {
      resolve: {
        extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
      },
    },
  },
  plugins: [pluginReactLynx(/* ... */)],
});
```

> **Monorepo users**: alias to your local workspace source instead:
>
> ```ts
> '@kafitra/lynx-camera': path.resolve(__dirname, '../../packages/lynx-camera/src/index.ts'),
> ```

### Android — Permissions

If you are using `@kafitra/lynx-autolink`, **no manual setup is needed.**
Running `lynx link` (or `lynx run android`) automatically injects the `CAMERA` permission into
`AndroidManifest.xml` and the runtime dialog is shown by `LynxCameraView` the first time the
camera screen is opened.

If you are **not** using autolink, add the following to `android/app/src/main/AndroidManifest.xml`
manually:

```xml
<!-- required -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- optional hardware feature hints -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.front" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

> **Runtime dialog** — `LynxCameraView` automatically calls `ActivityCompat.requestPermissions()`
> when the `CAMERA` permission has not yet been granted. After the user responds, the camera starts
> (or a `camera-error` event is emitted with code `PERMISSION_DENIED` if denied). Your `Activity`
> must extend `AppCompatActivity` for lifecycle-aware permission handling.

### Android — Register the custom element

If you are **not** using `@kafitra/lynx-autolink`, register manually in your `Application` or `Activity`:

```java
import com.kafitra.lynxcamera.LynxCameraView;
import com.lynx.tasm.LynxEnv;

// In your Application.onCreate() or before LynxView is created:
LynxEnv.inst().registerUI("camera", LynxCameraView.class);
```

> **Important:** The host `Activity` must extend `AppCompatActivity` (from `androidx.appcompat`).
> `LynxCameraView` uses `LifecycleOwner` for CameraX binding and `ActivityCompat` for runtime
> permission requests — both require `AppCompatActivity`.

### Android — Add the Gradle library (manual / no autolink)

In `android/app/build.gradle`:

```groovy
dependencies {
    implementation project(':lynx-camera')
}
```

In `android/settings.gradle`:

```groovy
include ':lynx-camera'
project(':lynx-camera').projectDir =
    new File(rootDir, '../node_modules/@kafitra/lynx-camera/android')
```

> **With autolink** (`@kafitra/lynx-autolink` + `@kafitra/lynx-cli`): run
> `npx @kafitra/lynx-cli link` — the above Gradle entries and registration call
> are generated automatically via `LynxAutolinkRegistry.java`.

---

### iOS — Permissions

Add to your app target's `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to capture photos.</string>
```

> ⚠️ Without this key the app will crash on iOS 10+ when the camera is accessed.

### iOS — Register the custom element

```objc
// AppDelegate.m / SceneDelegate.m — before LynxView loads
#import <LynxCameraView.h>
#import <Lynx/LynxEnv.h>

[LynxEnv.inst registerUI:LynxCameraView.class];
```

---

## Usage

```tsx
import { useRef } from "@lynx-js/react";
import { CameraView, type CameraRef } from "@kafitra/lynx-camera";

export function CameraScreen() {
  const cam = useRef<CameraRef>(null);

  async function shoot() {
    try {
      const photo = await cam.current?.takePhoto();
      console.log("Captured:", photo?.uri);
      // photo.uri  → "file:///data/user/0/.../cache/lynx_camera_20260221_123456.jpg"
      // photo.width, photo.height  → pixel dimensions
    } catch (err) {
      console.error("Capture failed:", err);
    }
  }

  function toggle() {
    cam.current?.switchCamera();
  }

  return (
    <view style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CameraView
        ref={cam}
        device="back"
        flashMode="auto"
        zoom={1}
        style={{ flex: 1 }}
        onCameraReady={() => console.log("Camera is ready")}
        onPhotoCaptured={(e) => console.log("Photo URI:", e.detail.uri)}
        onError={(e) => console.error(e.detail.code, e.detail.message)}
        onZoomChanged={(e) => console.log("Zoom:", e.detail.zoom)}
      />

      <view style={{ flexDirection: "row", padding: 16 }}>
        <text bindtap={shoot}>📷 Capture</text>
        <text bindtap={toggle}>🔄 Switch</text>
      </view>
    </view>
  );
}
```

---

## API Reference

### Props

| Prop          | Type                                 | Default        | Description                                              |
| ------------- | ------------------------------------ | -------------- | -------------------------------------------------------- |
| `device`      | `"front" \| "back"`                  | `"back"`       | Which camera to use                                      |
| `flashMode`   | `"auto" \| "on" \| "off" \| "torch"` | `"auto"`       | Flash mode for still capture                             |
| `focusMode`   | `"auto" \| "tap" \| "continuous"`    | `"continuous"` | Autofocus behaviour                                      |
| `zoom`        | `number`                             | `1`            | Zoom multiplier (1.0 = no zoom; clamped to device range) |
| `enableTorch` | `boolean`                            | `false`        | Continuous flashlight (torch)                            |
| `style`       | `Record<string, string \| number>`   | —              | Inline styles for the container view                     |
| `className`   | `string`                             | —              | CSS class name(s)                                        |

### Events

| Event             | Payload                                  | Description                                        |
| ----------------- | ---------------------------------------- | -------------------------------------------------- |
| `onCameraReady`   | `void`                                   | Session is live; safe to call `takePhoto()`        |
| `onPhotoCaptured` | `{ detail: PhotoResult }`                | Photo saved to cache                               |
| `onError`         | `{ detail: { code, message } }`          | An error occurred (see error codes below)          |
| `onZoomChanged`   | `{ detail: { zoom, minZoom, maxZoom } }` | Zoom changed — includes device min/max range       |
| `onTapFocus`      | `{ detail: { x: number, y: number } }`   | User tapped to focus (only when `focusMode="tap"`) |

### Ref Methods (`CameraRef`)

| Method         | Signature                        | Description                               |
| -------------- | -------------------------------- | ----------------------------------------- |
| `takePhoto`    | `() => Promise<PhotoResult>`     | Capture a still image                     |
| `switchCamera` | `() => void`                     | Toggle front ↔ back camera                |
| `setZoom`      | `(level: number) => void`        | Set zoom programmatically                 |
| `setFlash`     | `(mode: FlashMode) => void`      | Change flash mode at runtime              |
| `focus`        | `(x: number, y: number) => void` | Trigger tap-to-focus at local view coords |

### `PhotoResult`

```ts
interface PhotoResult {
  uri: string; // "file:///…/lynx_camera_xxx.jpg" (local temp file)
  width: number; // pixels (0 on Android v0.1.0; use image decoder for exact dimensions)
  height: number; // pixels (exact on iOS; 0 on Android v0.1.0)
}
```

> ⚠️ **Temp file:** The captured image is stored in the app's cache directory. Move or copy it to a permanent location before it may be purged.

### Error Codes

| Code                 | Platform | Meaning                                      |
| -------------------- | -------- | -------------------------------------------- |
| `PERMISSION_DENIED`  | Both     | Camera permission not granted                |
| `CAMERA_UNAVAILABLE` | Both     | No camera found for the requested `device`   |
| `CAMERA_NOT_READY`   | Both     | `takePhoto` called before `onCameraReady`    |
| `CAPTURE_FAILED`     | Both     | The capture operation failed                 |
| `SESSION_ERROR`      | Both     | Unrecoverable capture session error          |
| `INVALID_PARAMS`     | Android  | Malformed params passed to an invoked method |

---

## Testing

> ⚠️ Camera features **must be tested on a physical device**. Emulators/simulators
> either lack camera hardware entirely or provide a synthetic feed that does not
> verify permission handling, flash, or zoom.

Recommended test matrix:

| Scenario                                | Device                              |
| --------------------------------------- | ----------------------------------- |
| Permissions prompt (first launch)       | Android + iOS physical              |
| Live preview renders without distortion | Android + iOS                       |
| Photo capture saves valid JPEG          | Android + iOS                       |
| Front/back switch without crash         | Android + iOS                       |
| Flash on/off/auto modes                 | Android + iOS (with flash hardware) |
| Pinch-to-zoom                           | Android + iOS                       |
| Tap-to-focus visual indicator           | Android + iOS                       |
| Background/foreground resume            | Android + iOS                       |

---

## Known Limitations (v0.1.1)

- Android `PhotoResult.width` and `PhotoResult.height` return `0`. Exact dimensions
  are retrievable by decoding the saved JPEG via `BitmapFactory.decodeFile`.
- Video recording is not supported in this version.
- No QR/barcode scanning support.
- HarmonyOS is not yet supported.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
