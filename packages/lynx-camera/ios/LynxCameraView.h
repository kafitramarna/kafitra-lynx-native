#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

// Lynx SDK custom element (UI component) protocol
#import <Lynx/LynxUI.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * LynxCameraView — Native camera UI component for Lynx (iOS).
 *
 * Implements the @c <camera> custom element using AVFoundation.
 *
 * Supported props (set via element attributes):
 * - @c device        : @c "front" | @c "back"  (default: @c "back")
 * - @c flash-mode    : @c "auto" | @c "on" | @c "off" | @c "torch"  (default: @c "auto")
 * - @c focus-mode    : @c "auto" | @c "tap" | @c "continuous"  (default: @c "continuous")
 * - @c zoom          : @c float ≥ 1.0  (default: 1.0)
 * - @c enable-torch  : @c "true" | @c "false"  (default: @c "false")
 *
 * Invokable methods (via @c NodesRef.invoke):
 * - @c takePhoto    — captures a still image; returns @c { uri, width, height }
 * - @c switchCamera — toggles front ↔ back
 * - @c setZoom      — sets zoom ratio; params: @c { level: float }
 * - @c setFlash     — sets flash mode; params: @c { mode: string }
 * - @c focus        — triggers tap-to-focus; params: @c { x: float, y: float }
 *
 * Emitted events:
 * - @c bindcameraready    — session is live and preview is running
 * - @c bindphotocaptured  — photo saved; detail: @c { uri, width, height }
 * - @c binderror          — error occurred; detail: @c { code, message }
 * - @c bindzoomchanged    — user pinch-zoomed; detail: @c { zoom }
 *
 * @note iOS Permissions: Add @c NSCameraUsageDescription to your app's @c Info.plist.
 */
@interface LynxCameraView : LynxUI

@end

NS_ASSUME_NONNULL_END
