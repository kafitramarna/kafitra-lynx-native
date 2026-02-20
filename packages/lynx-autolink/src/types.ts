/**
 * Metadata format stored in `lynx.module.json` at the root of each Lynx Native Module package.
 */
export interface LynxModuleAndroidConfig {
  /** Fully-qualified Java class name of the LynxModule implementation. */
  moduleClass: string;
  /** Relative path to the Android library source directory inside the package (usually "android"). */
  sourceDir: string;
  /**
   * Override for the Gradle project name used in `include ':name'`.
   * Defaults to the kebab-cased npm package name (e.g. @kafitra/lynx-device-info → lynx-device-info).
   */
  gradleProjectName?: string;
}

export interface LynxModuleMetadata {
  /** The module name registered with LynxEnv (e.g. "LynxDeviceInfo"). */
  name: string;
  /** Android-specific configuration. */
  android: LynxModuleAndroidConfig;
  /**
   * Absolute path to the package root directory on disk.
   * This is populated by the scanner — it is NOT present in lynx.module.json.
   */
  packageDir?: string;
  /**
   * The npm package name (e.g. "@kafitra/lynx-device-info").
   * Populated by the scanner.
   */
  packageName?: string;
}
