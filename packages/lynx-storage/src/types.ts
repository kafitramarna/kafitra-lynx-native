/**
 * @kafitra/lynx-storage
 *
 * Raw shape of the LynxStorage native module as exposed through
 * NativeModules by the Lynx runtime.
 *
 * All methods are synchronous at the native layer.
 */
export interface NativeLynxStorage {
  /** Returns the stored string, or null when absent. */
  getString(key: string): string | null;

  /** Stores a string value. */
  setString(key: string, value: string): void;

  /** Removes a single entry. */
  remove(key: string): void;

  /** Clears the entire storage namespace. */
  clear(): void;

  /** Returns all stored keys as a JSON array string, e.g. '["a","b"]'. */
  getAllKeys(): string;
}
