# Changelog

All notable changes to `@kafitra/lynx-camera` will be documented in this file.

## [0.1.2] — 2026-02-22

### Fixed

- **`ERR_PACKAGE_PATH_NOT_EXPORTED`** when using `require.resolve('@kafitra/lynx-camera/package.json')`.
  Added `"./package.json": "./package.json"` to `exports` map.
  Simplified recommended alias to `require.resolve('@kafitra/lynx-camera/src')` —
  no need for `path.dirname` + manual `src/index.ts` concatenation.

---

## [0.1.1] — 2026-02-22

### Added

- **Ship TypeScript source** (`src/`) in the npm package — added to `"files"` field.
- **`./src` export** in `package.json` for bundler alias support:
  ```json
  { "./src": "./src/index.ts" }
  ```
- **`./package.json` export** in `package.json` — prevents `ERR_PACKAGE_PATH_NOT_EXPORTED`
  for tooling that resolves `package.json` via `exports`:
  ```json
  { "./package.json": "./package.json" }
  ```
- **`lynx.config.ts` build alias** requirement documented in README.
  - Lynx's `pluginReactLynx` must process the TypeScript source to generate the
    background-thread snapshot for the `<camera>` custom element. Without this alias,
    the camera renders as a black screen (error: `BackgroundSnapshot not found: camera`).
  - Standalone (non-monorepo) usage — use the `./src` export directly:

    ```ts
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);

    // in defineConfig:
    alias: {
      "@kafitra/lynx-camera": require.resolve("@kafitra/lynx-camera/src"),
    }
    ```

### Fixed

- **Black camera screen** in projects that import `@kafitra/lynx-camera` from npm (without a
  monorepo source alias). The published `dist/` JS was compiled by `tsc` without
  `pluginReactLynx`, so no Lynx snapshot was generated for the `<camera>` element.
- **`ERR_PACKAGE_PATH_NOT_EXPORTED`** — previously documented alias used
  `require.resolve('@kafitra/lynx-camera/package.json')` which threw this error because
  `./package.json` was not listed in `exports`. Fixed by adding `"./package.json"` to
  `exports` **and** simplifying the alias to `require.resolve('@kafitra/lynx-camera/src')`.

---

## [0.1.0] — 2026-02-22

### Added

- Initial release — MVP Camera Native UI Component for Lynx.
- **Android** (CameraX 1.3.0):
  - Live preview via `PreviewView` (aspect-fill scaleType) inside a `FrameLayout` container.
  - Still photo capture with `ImageCapture.takePicture()` → local `file://` URI.
  - Front / back camera switching via `device` prop (`"front"` | `"back"`).
  - Flash modes: `auto`, `on`, `off`.
  - Torch (continuous) mode.
  - Programmatic zoom via `CameraControl.setZoomRatio()` — clamped to device `minZoomRatio` / `maxZoomRatio`.
  - Tap-to-focus via `CameraControl.startFocusAndMetering()`.
  - **Native focus ring overlay** (`FocusRingView`) drawn directly on top of `PreviewView` via `FrameLayout` layering, visible over the native surface (JS overlay views cannot appear over CameraX `PreviewView`).
  - `onTapFocus` event fires with `{ x, y }` coordinates when the user taps in `focusMode="tap"`.
  - `onZoomChanged` event now carries `{ zoom, minZoom, maxZoom }` — `minZoom` and `maxZoom` are read from CameraX `ZoomState` on every zoom update.
  - Lifecycle-aware session management via `LifecycleOwner`.
  - Runtime permission check with descriptive `PERMISSION_DENIED` error event.
- **iOS** (AVFoundation):
  - Live preview via `AVCaptureVideoPreviewLayer` (aspect-fill).
  - Still photo capture with `AVCapturePhotoOutput` → `NSTemporaryDirectory` JPEG.
  - Front / back camera switching (`AVCaptureDevicePosition`).
  - Flash modes: `auto`, `on`, `off` (`AVCaptureFlashMode`).
  - Torch (continuous) mode.
  - Zoom via `videoZoomFactor`.
  - Tap-to-focus (`focusPointOfInterest` + `exposurePointOfInterest`).
  - Pinch-to-zoom via `UIPinchGestureRecognizer`.
  - Background/foreground lifecycle observers.
  - `AVAuthorizationStatus` permission check on session start.
- **TypeScript**:
  - Full `CameraProps`, `CameraRef`, `PhotoResult`, event types with JSDoc.
  - `ZoomChangedEvent.detail` includes `zoom`, `minZoom`, `maxZoom`.
  - `TapFocusEvent` type for `onTapFocus` callback.
  - `CameraView` React component (forwardRef) wrapping the `<camera>` custom element.
  - Imperative API via `NodesRef.invoke()` wrapped in Promises.
- **Autolink**: `lynx.module.json` with `componentClass` + `componentTag` fields.
- **lynx-autolink**: Extended schema, types, and Java generator to support
  `componentClass` / `componentTag` in addition to `moduleClass` (modules).

### Fixed

- **Android**: Removed redundant `applyTorch()` call in `bindCameraUseCases()` that caused
  `CameraControl.enableTorch()` to be invoked twice on every camera start/restart.

- **Android — runtime permission request** — `PermissionHelper` now exposes `requestCameraPermission(Activity)`
  and `getActivity(Context)`. When the camera view is first attached and the `CAMERA` permission is not yet
  granted, `LynxCameraView` automatically shows the OS permission dialog instead of immediately emitting a
  `PERMISSION_DENIED` error. A `mPermissionPending` flag and a `ViewTreeObserver.OnWindowFocusChangeListener`
  are used to retry `startCamera()` automatically after the user responds to the dialog.

- **Android — `lynx.module.json` permission declaration** — Added `"permissions": ["android.permission.CAMERA"]`
  so that `lynx link` can auto-inject the `<uses-permission>` entry into `AndroidManifest.xml` via
  `@kafitra/lynx-autolink`'s `injectManifestPermissions()`.
