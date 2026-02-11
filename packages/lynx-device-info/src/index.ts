/**
 * @kafitra/lynx-device-info
 *
 * Public API — Promise-based wrappers around the native module.
 */

import { NativeDeviceInfo } from "./native";
import type { DeviceInfoInterface } from "./types";

/**
 * DeviceInfo provides Promise-based access to Android device information
 * through the Lynx Native Module system.
 *
 * @example
 * ```ts
 * import { DeviceInfo } from '@kafitra/lynx-device-info';
 *
 * const brand = await DeviceInfo.getBrand();   // "Samsung"
 * const model = await DeviceInfo.getModel();   // "Galaxy S24"
 * const sdk   = await DeviceInfo.getSDKVersion(); // 34
 * ```
 */
export const DeviceInfo: DeviceInfoInterface = {
  async getBrand(): Promise<string> {
    try {
      return NativeDeviceInfo.getBrand();
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get brand: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getModel(): Promise<string> {
    try {
      return NativeDeviceInfo.getModel();
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get model: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getSDKVersion(): Promise<number> {
    try {
      return NativeDeviceInfo.getSDKVersion();
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get SDK version: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },
};

// Re-export types for consumer convenience
export type { DeviceInfoInterface, NativeLynxDeviceInfo } from "./types";
