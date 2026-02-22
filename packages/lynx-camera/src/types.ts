/**
 * @file types.ts
 * @description TypeScript types and interfaces for @kafitra/lynx-camera.
 *
 * This file defines all props, methods, events, and result shapes for the
 * native Camera UI element. Use {@link CameraProps} to type your JSX element,
 * and {@link CameraRef} to type the forwarded ref for imperative control.
 */

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

/**
 * Which physical camera to use.
 *
 * @example
 * ```tsx
 * <camera device="front" />
 * ```
 */
export type CameraDevice = "front" | "back";

/**
 * Flash mode for photo capture.
 *
 * - `"auto"`  — Flash fires automatically based on ambient light (default).
 * - `"on"`    — Flash always fires when taking a photo.
 * - `"off"`   — Flash never fires.
 * - `"torch"` — Torch (continuous flashlight), useful for video / focus assists.
 *
 * @example
 * ```tsx
 * <camera flashMode="auto" />
 * ```
 */
export type FlashMode = "auto" | "on" | "off" | "torch";

/**
 * Autofocus mode.
 *
 * - `"auto"`       — The camera continuously searches for the best focus.
 * - `"tap"`        — Focus is triggered manually via {@link CameraRef.focus}.
 * - `"continuous"` — The camera continuously refocuses as the scene changes.
 */
export type FocusMode = "auto" | "tap" | "continuous";

// ---------------------------------------------------------------------------
// Result / payload types
// ---------------------------------------------------------------------------

/**
 * Result returned by {@link CameraRef.takePhoto}.
 * The image is saved to a temporary file in the app's cache directory.
 *
 * @example
 * ```ts
 * const result = await cameraRef.current.takePhoto();
 * console.log(result.uri); // "file:///data/user/0/.../cache/lynx_camera_xxx.jpg"
 * ```
 */
export interface PhotoResult {
  /**
   * Local `file://` URI to the captured image.
   * Move or copy this file before it may be purged from the cache directory.
   */
  uri: string;
  /** Photo width in pixels. */
  width: number;
  /** Photo height in pixels. */
  height: number;
}

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

/**
 * Payload delivered to {@link CameraProps.onPhotoCaptured}.
 */
export interface PhotoCapturedEvent {
  /** Nested result object matching {@link PhotoResult}. */
  detail: PhotoResult;
}

/**
 * Payload delivered to {@link CameraProps.onError}.
 */
export interface CameraErrorEvent {
  detail: {
    /**
     * Machine-readable error code.
     *
     * Common values:
     * - `"PERMISSION_DENIED"`    — The app lacks `CAMERA` permission.
     * - `"CAMERA_UNAVAILABLE"`   — No camera device found for the requested {@link CameraDevice}.
     * - `"CAPTURE_FAILED"`       — The photo capture operation failed.
     * - `"SESSION_ERROR"`        — The capture session encountered an unrecoverable error.
     */
    code: string;
    /** Human-readable description of the error. */
    message: string;
  };
}

/**
 * Payload delivered to {@link CameraProps.onZoomChanged}.
 */
export interface ZoomChangedEvent {
  detail: {
    /** Current zoom ratio (e.g. 1.0, 2.5). */
    zoom: number;
    /** Minimum zoom ratio supported by the device. */
    minZoom: number;
    /** Maximum zoom ratio supported by the device. */
    maxZoom: number;
  };
}

/**
 * Payload delivered to {@link CameraProps.onTapFocus}.
 */
export interface TapFocusEvent {
  detail: {
    /** X coordinate of the tap relative to the camera view (pixels). */
    x: number;
    /** Y coordinate of the tap relative to the camera view (pixels). */
    y: number;
  };
}

// ---------------------------------------------------------------------------
// Ref (imperative API)
// ---------------------------------------------------------------------------

/**
 * Imperative handle exposed via `ref` on {@link CameraView}.
 *
 * @example
 * ```tsx
 * const cameraRef = useRef<CameraRef>(null);
 *
 * // Take a photo
 * const photo = await cameraRef.current?.takePhoto();
 *
 * // Switch to front camera
 * cameraRef.current?.switchCamera();
 * ```
 */
export interface CameraRef {
  /**
   * Capture a photo and save it to the app's temporary cache directory.
   *
   * @returns A promise that resolves with {@link PhotoResult}.
   * @throws  If the camera is not ready or capture fails.
   */
  takePhoto(): Promise<PhotoResult>;

  /**
   * Toggle between the front and back camera.
   * Has no effect if only one camera is available.
   */
  switchCamera(): void;

  /**
   * Programmatically set the zoom level.
   *
   * @param level - Zoom multiplier. `1.0` means no zoom. Maximum depends on the device.
   *                Values are clamped to the device's supported range.
   */
  setZoom(level: number): void;

  /**
   * Set the flash mode.
   *
   * @param mode - One of `"auto"`, `"on"`, `"off"`, `"torch"`. See {@link FlashMode}.
   */
  setFlash(mode: FlashMode): void;

  /**
   * Trigger tap-to-focus at the given coordinates.
   * Coordinates are in the camera view's local coordinate space (CSS pixels).
   *
   * @param x - Horizontal position from the left edge, in logical pixels.
   * @param y - Vertical position from the top edge, in logical pixels.
   */
  focus(x: number, y: number): void;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

/**
 * Props for the `<CameraView>` native UI component.
 *
 * All props are optional and can be changed at runtime; the native layer
 * applies changes without restarting the capture session where possible.
 *
 * @example
 * ```tsx
 * import { CameraView } from '@kafitra/lynx-camera';
 * import { useRef } from '@lynx-js/react';
 *
 * function MyCamera() {
 *   const cam = useRef<CameraRef>(null);
 *   return (
 *     <CameraView
 *       ref={cam}
 *       device="back"
 *       flashMode="auto"
 *       zoom={1}
 *       style={{ width: '100%', height: '60%' }}
 *       onCameraReady={() => console.log('Camera ready')}
 *       onPhotoCaptured={(e) => console.log('Photo:', e.detail.uri)}
 *       onError={(e) => console.error(e.detail.code, e.detail.message)}
 *     />
 *   );
 * }
 * ```
 */
export interface CameraProps {
  // ---- Device & Capture ----

  /**
   * Which camera to use.
   * @default "back"
   */
  device?: CameraDevice;

  /**
   * Flash mode for still photo capture.
   * @default "auto"
   */
  flashMode?: FlashMode;

  /**
   * Autofocus behaviour.
   * @default "continuous"
   */
  focusMode?: FocusMode;

  /**
   * Zoom multiplier (1.0 = no zoom).
   * Values are clamped to the device's min/max supported range.
   * @default 1
   */
  zoom?: number;

  /**
   * When `true`, enables the torch (continuous flashlight).
   * Takes precedence over `flashMode` for continuous lighting scenarios.
   * @default false
   */
  enableTorch?: boolean;

  // ---- Events ----

  /**
   * Fires once the camera session is fully initialised and the preview is live.
   * Safe to call `takePhoto()` after this event.
   */
  onCameraReady?: () => void;

  /**
   * Fires when a photo has been captured and saved successfully.
   * @param event - Contains `{ detail: PhotoResult }`.
   */
  onPhotoCaptured?: (event: PhotoCapturedEvent) => void;

  /**
   * Fires when an error occurs (permissions, session, capture).
   * @param event - Contains `{ detail: { code, message } }`.
   */
  onError?: (event: CameraErrorEvent) => void;

  /**
   * Fires when the zoom level changes (e.g. via pinch gesture).
   * @param event - Contains `{ detail: { zoom, minZoom, maxZoom } }`.
   */
  onZoomChanged?: (event: ZoomChangedEvent) => void;

  /**
   * Fires when the user taps the camera preview while `focusMode="tap"`.
   * Use this to display a focus ring UI at the tapped position.
   * @param event - Contains `{ detail: { x, y } }` in physical pixels.
   */
  onTapFocus?: (event: TapFocusEvent) => void;

  // ---- Layout ----

  /** Inline styles applied to the camera view container. */
  style?: Record<string, string | number>;

  /** CSS class name(s). */
  className?: string;
}
