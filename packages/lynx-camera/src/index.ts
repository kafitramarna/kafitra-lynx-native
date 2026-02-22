/**
 * @file index.ts
 * @description Public entry point for @kafitra/lynx-camera.
 *
 * ## Quick Start
 * ```tsx
 * import { CameraView, type CameraRef } from '@kafitra/lynx-camera';
 * import { useRef } from '@lynx-js/react';
 *
 * export function CameraScreen() {
 *   const cam = useRef<CameraRef>(null);
 *
 *   async function shoot() {
 *     const photo = await cam.current?.takePhoto();
 *     console.log('Saved to:', photo?.uri);
 *   }
 *
 *   return (
 *     <CameraView
 *       ref={cam}
 *       device="back"
 *       flashMode="auto"
 *       style={{ width: '100%', height: '100%' }}
 *       onCameraReady={() => console.log('ready')}
 *       onPhotoCaptured={(e) => console.log(e.detail.uri)}
 *       onError={(e) => console.error(e.detail.code)}
 *     />
 *   );
 * }
 * ```
 *
 * ## Permissions
 * Android: Add `<uses-permission android:name="android.permission.CAMERA" />` in your
 * AndroidManifest.xml and request runtime permission before rendering this component.
 *
 * iOS: Add `NSCameraUsageDescription` to your target's `Info.plist`.
 */

export { CameraView } from "./CameraView.js";

export type {
  CameraDevice,
  CameraErrorEvent,
  CameraProps,
  CameraRef,
  FlashMode,
  FocusMode,
  PhotoCapturedEvent,
  PhotoResult,
  TapFocusEvent,
  ZoomChangedEvent,
} from "./types.js";
