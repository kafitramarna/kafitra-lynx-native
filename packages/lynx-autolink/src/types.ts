/**
 * Metadata format stored in `lynx.module.json` at the root of each Lynx Native Module/Component package.
 */
export interface LynxModuleAndroidConfig {
  /**
   * Fully-qualified Java class name of the LynxModule implementation.
   * Required for native modules; optional when componentClass is provided instead.
   */
  moduleClass?: string;
  /**
   * Fully-qualified Java class name of the LynxUI custom element implementation.
   * Required for native UI components; optional when moduleClass is provided instead.
   */
  componentClass?: string;
  /**
   * The element tag name used in JSX to reference this component (e.g. "camera").
   * Required when componentClass is provided.
   */
  componentTag?: string;
  /** Relative path to the Android library source directory inside the package (usually "android"). */
  sourceDir: string;
  /**
   * Override for the Gradle project name used in `include ':name'`.
   * Defaults to the kebab-cased npm package name (e.g. @kafitra/lynx-device-info → lynx-device-info).
   */
  gradleProjectName?: string;
  /**
   * Android permissions required by this module.
   * Each entry is an `android:name` value (e.g. `"android.permission.CAMERA"`).
   * `lynx link` will inject these into the host app's `AndroidManifest.xml`.
   */
  permissions?: string[];
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
