# Changelog

All notable changes to `@kafitra/lynx-camera` will be documented in this file.

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
