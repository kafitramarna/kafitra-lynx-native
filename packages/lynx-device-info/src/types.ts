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

  /** Returns the Android SDK version number (e.g., 34); returns 0 on iOS */
  getSDKVersion(): Promise<number>;

  /** Returns the device manufacturer (e.g., "Samsung", "Apple") */
  getManufacturer(): Promise<string>;

  /**
   * Returns a stable device identifier.
   * Android: Build.DEVICE (hardware codename, e.g. "generic_x86").
   * iOS: identifierForVendor UUID string.
   */
  getDeviceId(): Promise<string>;

  /** Returns the OS name (e.g., "Android", "iOS") */
  getSystemName(): Promise<string>;

  /** Returns the OS version string (e.g., "14", "17.0") */
  getSystemVersion(): Promise<string>;
}

/**
 * Raw native module shape as exposed by Lynx runtime.
 * These methods are synchronous at the native level.
 */
export interface NativeLynxDeviceInfo {
  getBrand(): string;
  getModel(): string;
  getSDKVersion(): number;
  getManufacturer(): string;
  getDeviceId(): string;
  getSystemName(): string;
  getSystemVersion(): string;
}
