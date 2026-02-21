/**
 * @kafitra/lynx-async-storage
 *
 * Typed error classes used across the module.
 * All errors extend the built-in Error so they are instanceof-compatible.
 */

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ErrorCodes = {
  INVALID_KEY: "ERR_ASYNC_STORAGE_INVALID_KEY",
  INVALID_VALUE: "ERR_ASYNC_STORAGE_INVALID_VALUE",
  INVALID_JSON: "ERR_ASYNC_STORAGE_INVALID_JSON",
  BACKEND_FAILURE: "ERR_ASYNC_STORAGE_BACKEND_FAILURE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── Base error ───────────────────────────────────────────────────────────────

export class AsyncStorageError extends Error {
  public readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AsyncStorageError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;

    // Maintain proper prototype chain for instanceof checks in transpiled code.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Specific error subtypes ──────────────────────────────────────────────────

/** Thrown when a key is not a non-empty string. */
export class InvalidKeyError extends AsyncStorageError {
  constructor(key: unknown) {
    super(
      ErrorCodes.INVALID_KEY,
      `AsyncStorage key must be a string, got: ${typeof key}`,
    );
    this.name = "InvalidKeyError";
  }
}

/** Thrown when a value is not a string. */
export class InvalidValueError extends AsyncStorageError {
  constructor(value: unknown) {
    super(
      ErrorCodes.INVALID_VALUE,
      `AsyncStorage value must be a string, got: ${typeof value}`,
    );
    this.name = "InvalidValueError";
  }
}

/** Thrown when JSON parsing fails during a merge operation. */
export class InvalidJsonError extends AsyncStorageError {
  constructor(context: "existing" | "incoming", cause?: unknown) {
    super(
      ErrorCodes.INVALID_JSON,
      `AsyncStorage mergeItem: ${context} value is not valid JSON`,
      cause,
    );
    this.name = "InvalidJsonError";
  }
}

/** Thrown when the underlying storage backend raises an exception. */
export class BackendError extends AsyncStorageError {
  constructor(operation: string, cause?: unknown) {
    super(
      ErrorCodes.BACKEND_FAILURE,
      `AsyncStorage backend error during "${operation}"`,
      cause,
    );
    this.name = "BackendError";
  }
}
