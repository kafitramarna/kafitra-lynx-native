/**
 * @kafitra/lynx-storage
 *
 * Native module access layer.
 */
import type { NativeLynxStorage } from "./types";

declare const NativeModules: {
  LynxStorage?: NativeLynxStorage;
};

function getNativeModule(): NativeLynxStorage {
  if (!NativeModules?.LynxStorage) {
    throw new Error(
      "[@kafitra/lynx-storage] Native module not linked. " +
        "Register LynxStorageModule in your Android host:\n\n" +
        '  LynxEnv.inst().registerModule("LynxStorage", LynxStorageModule.class);',
    );
  }
  return NativeModules.LynxStorage;
}

export const NativeStorage: NativeLynxStorage = getNativeModule();
