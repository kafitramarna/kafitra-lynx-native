/**
 * @kafitra/lynx-device-info
 *
 * Public API — Promise-based wrappers around the native module.
 */

import { NativeDeviceInfo } from "./native";
import type { DeviceInfoInterface } from "./types";

/**
 * Ensures a value returned from a native method is always a non-empty string.
 * Coerces null/undefined to "unknown" and converts other types via String().
 */
function ensureString(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  const s = String(value);
  return s.length > 0 ? s : "unknown";
}

/**
 * DeviceInfo provides Promise-based access to device information
 * through the Lynx Native Module system (Android + iOS).
 *
 * @example
 * ```ts
 * import { DeviceInfo } from '@kafitra/lynx-device-info';
 *
 * const brand        = await DeviceInfo.getBrand();        // "Samsung"
 * const model        = await DeviceInfo.getModel();        // "Galaxy S24"
 * const sdk          = await DeviceInfo.getSDKVersion();   // 34
 * const manufacturer = await DeviceInfo.getManufacturer(); // "Samsung"
 * const deviceId     = await DeviceInfo.getDeviceId();     // "generic_x86"
 * const systemName   = await DeviceInfo.getSystemName();   // "Android"
 * const systemVer    = await DeviceInfo.getSystemVersion(); // "14"
 * ```
 */
export const DeviceInfo: DeviceInfoInterface = {
  async getBrand(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getBrand());
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get brand: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getModel(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getModel());
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

  async getManufacturer(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getManufacturer());
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get manufacturer: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getDeviceId(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getDeviceId());
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get device ID: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getSystemName(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getSystemName());
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get system name: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  async getSystemVersion(): Promise<string> {
    try {
      return ensureString(NativeDeviceInfo.getSystemVersion());
    } catch (e) {
      throw new Error(
        `[lynx-device-info] Failed to get system version: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Named function exports — importable directly:
//   import { getBrand, getManufacturer, getDeviceId, ... } from '@kafitra/lynx-device-info'
// ---------------------------------------------------------------------------

export async function getBrand(): Promise<string> {
  return DeviceInfo.getBrand();
}

export async function getModel(): Promise<string> {
  return DeviceInfo.getModel();
}

export async function getSDKVersion(): Promise<number> {
  return DeviceInfo.getSDKVersion();
}

export async function getManufacturer(): Promise<string> {
  return DeviceInfo.getManufacturer();
}

export async function getDeviceId(): Promise<string> {
  return DeviceInfo.getDeviceId();
}

export async function getSystemName(): Promise<string> {
  return DeviceInfo.getSystemName();
}

export async function getSystemVersion(): Promise<string> {
  return DeviceInfo.getSystemVersion();
}

// Re-export types for consumer convenience
export type { DeviceInfoInterface, NativeLynxDeviceInfo } from "./types";
