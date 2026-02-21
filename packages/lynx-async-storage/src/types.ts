/**
 * @kafitra/lynx-async-storage
 *
 * Public type definitions.
 */

// ─── Primitive batch types ────────────────────────────────────────────────────

/** A key-value pair used for multi-set and multi-merge operations. */
export type KeyValuePair = [key: string, value: string];

/** A key-result pair returned by multi-get. Value is null when the key is absent. */
export type KeyValueResult = [key: string, value: string | null];

// ─── Storage backend interface ────────────────────────────────────────────────

/**
 * Synchronous low-level storage contract.
 *
 * Implementations wrap the underlying platform storage (e.g., Lynx runtime
 * key-value store, localStorage-compatible API) and expose a uniform surface.
 * All methods are intentionally synchronous; async scheduling is handled by
 * the AsyncStorage layer above.
 */
export interface StorageBackend {
  /** Returns the stored string, or null when the key is absent. */
  getItem(key: string): string | null;

  /** Stores a string value. */
  setItem(key: string, value: string): void;

  /** Removes a single key. */
  removeItem(key: string): void;

  /** Removes every key managed by this backend. */
  clear(): void;

  /** Returns every currently stored key in an unspecified order. */
  getAllKeys(): string[];
}

// ─── Main AsyncStorage interface ─────────────────────────────────────────────

/**
 * Full async API surface – mirrors React Native AsyncStorage.
 */
export interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;

  multiGet(keys: readonly string[]): Promise<KeyValueResult[]>;
  multiSet(keyValuePairs: readonly KeyValuePair[]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;

  mergeItem(key: string, value: string): Promise<void>;
  multiMerge(keyValuePairs: readonly KeyValuePair[]): Promise<void>;

  /**
   * Swaps the current backend for a new one.
   * Useful for testing or runtime adapter injection.
   */
  useBackend(backend: StorageBackend): void;
}
