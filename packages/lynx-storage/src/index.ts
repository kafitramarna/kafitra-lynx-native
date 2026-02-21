/**
 * @kafitra/lynx-storage
 *
 * Public API — thin wrappers that surfaced the raw native module.
 *
 * Usage:
 *
 *   import { LynxStorage } from '@kafitra/lynx-storage';
 *
 *   LynxStorage.setString('key', 'value');
 *   const val = LynxStorage.getString('key');  // string | null
 */
export { NativeStorage as LynxStorage } from "./native";
export type { NativeLynxStorage } from "./types";
