/**
 * @file CameraView.tsx
 * @description React component wrapping the <camera> Lynx native custom element.
 *
 * This file **must** be .tsx to support JSX syntax.
 * All imperative camera methods are exposed via a forwarded ref ({@link CameraRef}).
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type Ref,
  type RefAttributes,
  type RefObject,
} from "@lynx-js/react";
import type { NodesRef } from "@lynx-js/types";

import type {
  CameraProps,
  CameraRef,
  FlashMode,
  PhotoResult,
  TapFocusEvent,
  ZoomChangedEvent,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helper – wrap NodesRef.invoke in a Promise
// ---------------------------------------------------------------------------

/**
 * Invoke a native method on a Lynx custom element and return the result as a Promise.
 * @internal
 */
function invokeAsync<T = unknown>(
  nativeRef: RefObject<NodesRef>,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!nativeRef.current) {
      reject(
        new Error(
          `[@kafitra/lynx-camera] Cannot call "${method}" — native camera ref is not attached. ` +
            "Ensure <CameraView> is mounted and onCameraReady has fired.",
        ),
      );
      return;
    }

    nativeRef.current
      .invoke({
        method,
        ...(params ? { params } : {}),
        success: (res: T) => resolve(res),
        fail: (res: { code: number; data?: unknown }) => {
          reject(
            new Error(
              `[@kafitra/lynx-camera] Native method "${method}" failed ` +
                `(code ${res.code})`,
            ),
          );
        },
      })
      .exec();
  });
}

// ---------------------------------------------------------------------------
// CameraView component
// ---------------------------------------------------------------------------

/**
 * `<CameraView>` — Native camera preview and capture component for Lynx.
 *
 * Renders a live camera preview backed by:
 * - **Android**: CameraX (`PreviewView` + `ImageCapture`)
 * - **iOS**: AVFoundation (`AVCaptureSession` + `AVCaptureVideoPreviewLayer`)
 *
 * Imperative methods are exposed via a forwarded `ref` typed as {@link CameraRef}.
 *
 * @example
 * ```tsx
 * const cam = useRef<CameraRef>(null);
 * <CameraView ref={cam} device="back" flashMode="auto" />
 * await cam.current?.takePhoto(); // → PhotoResult
 * ```
 */
export const CameraView: ForwardRefExoticComponent<
  PropsWithoutRef<CameraProps> & RefAttributes<CameraRef>
> = forwardRef<CameraRef, CameraProps>(function CameraView(
  props: CameraProps,
  ref: Ref<CameraRef>,
) {
  const {
    device = "back",
    flashMode = "auto",
    focusMode = "continuous",
    zoom = 1,
    enableTorch = false,
    onCameraReady,
    onPhotoCaptured,
    onError,
    onZoomChanged,
    onTapFocus,
    style,
    className,
  } = props;

  const nativeRef = useRef<NodesRef>(null);

  // Expose CameraRef API to parent via forwardRef
  useImperativeHandle<CameraRef, CameraRef>(
    ref,
    () => ({
      takePhoto(): Promise<PhotoResult> {
        return invokeAsync<PhotoResult>(nativeRef, "takePhoto");
      },

      switchCamera(): void {
        invokeAsync(nativeRef, "switchCamera").catch((err: unknown) => {
          console.error("[@kafitra/lynx-camera] switchCamera error:", err);
        });
      },

      setZoom(level: number): void {
        invokeAsync(nativeRef, "setZoom", { level }).catch((err: unknown) => {
          console.error("[@kafitra/lynx-camera] setZoom error:", err);
        });
      },

      setFlash(mode: FlashMode): void {
        invokeAsync(nativeRef, "setFlash", { mode }).catch((err: unknown) => {
          console.error("[@kafitra/lynx-camera] setFlash error:", err);
        });
      },

      focus(x: number, y: number): void {
        invokeAsync(nativeRef, "focus", { x, y }).catch((err: unknown) => {
          console.error("[@kafitra/lynx-camera] focus error:", err);
        });
      },
    }),
    [],
  );

  // Use lowercase JSX tag directly so pluginReactLynx sees the literal string
  // "camera" at build time and registers a BackgroundSnapshot for it.
  // The `as any` cast on the props silences TS about unknown native attributes.
  const nativeProps = {
    ref: nativeRef,
    device,
    "flash-mode": flashMode,
    "focus-mode": focusMode,
    zoom,
    "enable-torch": enableTorch ? "true" : "false",
    class: className,
    style,
    bindcameraready: onCameraReady,
    bindphotocaptured: onPhotoCaptured,
    binderror: onError,
    bindzoomchanged: onZoomChanged,
    bindtapfocus: onTapFocus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  // @ts-ignore – "camera" is our custom Lynx native element
  return <camera {...nativeProps} />;
});

CameraView.displayName = "CameraView";
