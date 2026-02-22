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

  const FQCN_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/;

  // --- android.moduleClass (optional, but required if componentClass absent) ---
  if ("moduleClass" in androidObj && androidObj["moduleClass"] !== undefined) {
    if (
      typeof androidObj["moduleClass"] !== "string" ||
      androidObj["moduleClass"].trim() === ""
    ) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.moduleClass" must be a non-empty string (e.g. "com.example.MyModule")`,
      );
    }
    if (!FQCN_REGEX.test(androidObj["moduleClass"] as string)) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.moduleClass" must be a fully-qualified Java class name (e.g. "com.example.MyModule"), got ${JSON.stringify(androidObj["moduleClass"])}`,
      );
    }
  }

  // --- android.componentClass (optional, for native UI custom elements) ---
  if (
    "componentClass" in androidObj &&
    androidObj["componentClass"] !== undefined
  ) {
    if (
      typeof androidObj["componentClass"] !== "string" ||
      androidObj["componentClass"].trim() === ""
    ) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.componentClass" must be a non-empty string (e.g. "com.example.MyCameraView")`,
      );
    }
    if (!FQCN_REGEX.test(androidObj["componentClass"] as string)) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.componentClass" must be a fully-qualified Java class name, got ${JSON.stringify(androidObj["componentClass"])}`,
      );
    }
  }

  // --- android.componentTag (optional, required when componentClass present) ---
  if (
    "componentTag" in androidObj &&
    androidObj["componentTag"] !== undefined
  ) {
    if (
      typeof androidObj["componentTag"] !== "string" ||
      androidObj["componentTag"].trim() === ""
    ) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.componentTag" must be a non-empty string (e.g. "camera")`,
      );
    }
  }

  // Ensure componentTag is present when componentClass is provided
  const hasComponentClassDefined =
    "componentClass" in androidObj &&
    typeof androidObj["componentClass"] === "string" &&
    androidObj["componentClass"].trim() !== "";
  const hasComponentTagDefined =
    "componentTag" in androidObj &&
    typeof androidObj["componentTag"] === "string" &&
    androidObj["componentTag"].trim() !== "";
  if (hasComponentClassDefined && !hasComponentTagDefined) {
    throw new Error(
      `[lynx-autolink] ${source}: "android.componentTag" is required when "android.componentClass" is provided (e.g. \"componentTag\": \"camera\")`,
    );
  }

  // Ensure at least one of moduleClass or componentClass is present
  const hasModuleClass =
    "moduleClass" in androidObj &&
    typeof androidObj["moduleClass"] === "string" &&
    androidObj["moduleClass"].trim() !== "";
  const hasComponentClass =
    "componentClass" in androidObj &&
    typeof androidObj["componentClass"] === "string" &&
    androidObj["componentClass"].trim() !== "";
  if (!hasModuleClass && !hasComponentClass) {
    throw new Error(
      `[lynx-autolink] ${source}: "android" must contain at least one of "moduleClass" (for native modules) or "componentClass" (for custom UI elements)`,
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

  // --- android.permissions (optional array of strings) ---
  if (
    "permissions" in androidObj &&
    androidObj["permissions"] !== undefined
  ) {
    if (!Array.isArray(androidObj["permissions"])) {
      throw new Error(
        `[lynx-autolink] ${source}: "android.permissions" must be an array of strings`,
      );
    }
    for (const perm of androidObj["permissions"] as unknown[]) {
      if (typeof perm !== "string" || perm.trim() === "") {
        throw new Error(
          `[lynx-autolink] ${source}: each entry in "android.permissions" must be a non-empty string (e.g. "android.permission.CAMERA")`,
        );
      }
    }
  }

  return {
    name: (obj["name"] as string).trim(),
    android: {
      ...(typeof androidObj["moduleClass"] === "string" &&
      androidObj["moduleClass"].trim() !== ""
        ? { moduleClass: (androidObj["moduleClass"] as string).trim() }
        : {}),
      ...(typeof androidObj["componentClass"] === "string" &&
      androidObj["componentClass"].trim() !== ""
        ? { componentClass: (androidObj["componentClass"] as string).trim() }
        : {}),
      ...(typeof androidObj["componentTag"] === "string" &&
      androidObj["componentTag"].trim() !== ""
        ? { componentTag: (androidObj["componentTag"] as string).trim() }
        : {}),
      sourceDir: (androidObj["sourceDir"] as string).trim(),
      ...(typeof androidObj["gradleProjectName"] === "string"
        ? { gradleProjectName: androidObj["gradleProjectName"].trim() }
        : {}),
      ...(Array.isArray(androidObj["permissions"]) && (androidObj["permissions"] as unknown[]).length > 0
        ? { permissions: (androidObj["permissions"] as string[]).map((p) => p.trim()) }
        : {}),
    },
  };
}
