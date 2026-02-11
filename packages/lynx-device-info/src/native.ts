/**
 * @kafitra/lynx-device-info
 *
 * Native module declaration and access layer.
 * Accesses the LynxDeviceInfo module from the Lynx runtime's NativeModules global.
 */

import type { NativeLynxDeviceInfo } from "./types";

/**
 * Declare the global NativeModules object provided by Lynx runtime.
 */
declare const NativeModules: {
  LynxDeviceInfo?: NativeLynxDeviceInfo;
};

/**
 * Retrieve and validate the LynxDeviceInfo native module.
 * Throws a descriptive error if the module is not registered.
 */
function getNativeModule(): NativeLynxDeviceInfo {
  if (!NativeModules?.LynxDeviceInfo) {
    throw new Error(
      "[@kafitra/lynx-device-info] Native module not linked. " +
        "Please register LynxDeviceInfoModule in your Android host:\n\n" +
        '  LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);',
    );
  }
  return NativeModules.LynxDeviceInfo;
}

/**
 * The validated native module instance.
 */
export const NativeDeviceInfo: NativeLynxDeviceInfo = getNativeModule();
