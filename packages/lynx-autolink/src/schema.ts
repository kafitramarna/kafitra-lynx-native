import type { LynxModuleMetadata } from "./types.js";

/**
 * Validates raw JSON parsed from `lynx.module.json`.
 * Throws a descriptive error if the structure is malformed.
 *
 * @param raw     - Parsed JSON object (unknown type).
 * @param source  - Human-readable source label for error messages (e.g. package name or file path).
 * @returns       Validated and typed `LynxModuleMetadata`.
 */
export function validateMetadata(
  raw: unknown,
  source = "lynx.module.json",
): LynxModuleMetadata {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `[lynx-autolink] ${source}: root must be a JSON object, got ${Array.isArray(raw) ? "array" : String(raw)}`,
    );
  }

  const obj = raw as Record<string, unknown>;

  // --- name ---
  if (!("name" in obj)) {
    throw new Error(`[lynx-autolink] ${source}: missing required field "name"`);
  }
  if (typeof obj["name"] !== "string" || obj["name"].trim() === "") {
    throw new Error(
      `[lynx-autolink] ${source}: "name" must be a non-empty string, got ${JSON.stringify(obj["name"])}`,
    );
  }

  // --- android ---
  if (!("android" in obj)) {
    throw new Error(
      `[lynx-autolink] ${source}: missing required field "android"`,
    );
  }
  const android = obj["android"];
  if (
    android === null ||
    typeof android !== "object" ||
    Array.isArray(android)
  ) {
    throw new Error(`[lynx-autolink] ${source}: "android" must be an object`);
  }
  const androidObj = android as Record<string, unknown>;

  // --- android.moduleClass ---
  if (!("moduleClass" in androidObj)) {
    throw new Error(
      `[lynx-autolink] ${source}: missing required field "android.moduleClass"`,
    );
  }
  if (
    typeof androidObj["moduleClass"] !== "string" ||
    androidObj["moduleClass"].trim() === ""
  ) {
    throw new Error(
      `[lynx-autolink] ${source}: "android.moduleClass" must be a non-empty string (e.g. "com.example.MyModule")`,
    );
  }
  // Validate Java class name format (package.ClassName)
  if (
    !/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/.test(
      androidObj["moduleClass"] as string,
    )
  ) {
    throw new Error(
      `[lynx-autolink] ${source}: "android.moduleClass" must be a fully-qualified Java class name (e.g. "com.example.MyModule"), got ${JSON.stringify(androidObj["moduleClass"])}`,
    );
  }

  // --- android.sourceDir ---
  if (!("sourceDir" in androidObj)) {
    throw new Error(
      `[lynx-autolink] ${source}: missing required field "android.sourceDir"`,
    );
  }
  if (
    typeof androidObj["sourceDir"] !== "string" ||
    androidObj["sourceDir"].trim() === ""
  ) {
    throw new Error(
      `[lynx-autolink] ${source}: "android.sourceDir" must be a non-empty string (e.g. "android")`,
    );
  }

  // --- android.gradleProjectName (optional) ---
  if (
    "gradleProjectName" in androidObj &&
    androidObj["gradleProjectName"] !== undefined
  ) {
    if (
      typeof androidObj["gradleProjectName"] !== "string" ||
      androidObj["gradleProjectName"].trim() === ""
    ) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.gradleProjectName" must be a non-empty string if provided`,
      );
    }
  }

  return {
    name: (obj["name"] as string).trim(),
    android: {
      moduleClass: (androidObj["moduleClass"] as string).trim(),
      sourceDir: (androidObj["sourceDir"] as string).trim(),
      ...(typeof androidObj["gradleProjectName"] === "string"
        ? { gradleProjectName: androidObj["gradleProjectName"].trim() }
        : {}),
    },
  };
}
