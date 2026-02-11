/**
 * @kafitra/lynx-device-info
 *
 * Type definitions for the DeviceInfo native module.
 */

/**
 * Interface for the Lynx DeviceInfo native module methods.
 */
export interface DeviceInfoInterface {
  /** Returns the device brand (e.g., "Samsung", "Google") */
  getBrand(): Promise<string>;

  /** Returns the device model (e.g., "Galaxy S24", "Pixel 8") */
  getModel(): Promise<string>;

  /** Returns the Android SDK version number (e.g., 34) */
  getSDKVersion(): Promise<number>;
}

/**
 * Raw native module shape as exposed by Lynx runtime.
 * These methods are synchronous at the native level.
 */
export interface NativeLynxDeviceInfo {
  getBrand(): string;
  getModel(): string;
  getSDKVersion(): number;
}
