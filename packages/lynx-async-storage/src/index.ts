/**
 * @kafitra/lynx-async-storage
 *
 * Public barrel export.
 *
 * Default export: shared singleton (mirrors React Native AsyncStorage usage).
 * Named exports: class and types for consumers who need custom instances.
 */

export { AsyncStorage } from "./AsyncStorage";
export {
  MemoryBackend,
  LocalStorageBackend,
  NativeStorageBackend,
  createDefaultBackend,
} from "./storageBackend";
export {
  AsyncStorageError,
  InvalidKeyError,
  InvalidValueError,
  InvalidJsonError,
  BackendError,
  ErrorCodes,
} from "./errors";
export type {
  AsyncStorageInterface,
  StorageBackend,
  KeyValuePair,
  KeyValueResult,
} from "./types";

import { AsyncStorage } from "./AsyncStorage";

/**
 * Shared singleton instance – drop-in replacement for React Native AsyncStorage.
 *
 * @example
 * ```ts
 * import AsyncStorage from '@kafitra/lynx-async-storage';
 *
 * await AsyncStorage.setItem('token', 'abc123');
 * const token = await AsyncStorage.getItem('token'); // 'abc123'
 * ```
 */
const instance = new AsyncStorage();
export default instance;
