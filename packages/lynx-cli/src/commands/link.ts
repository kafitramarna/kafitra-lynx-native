import * as path from "node:path";
import * as fs from "node:fs";
import {
  scanModules,
  writeJavaRegistry,
  injectSettings,
  injectBuildGradle,
  injectManifestPermissions,
  readApplicationId,
} from "@kafitra/lynx-autolink";
import * as log from "../utils/logger.js";

export interface LinkOptions {
  /** Root of the host project being linked. Defaults to process.cwd(). */
  projectRoot?: string;
  /** Relative (or absolute) path to the Android directory. Defaults to "android". */
  androidDir?: string;
  /**
   * Explicit Java package name for the generated registry class.
   * If omitted, it is inferred from `applicationId` in `android/app/build.gradle`.
   */
  javaPackage?: string;
}

export async function runLink(opts: LinkOptions = {}): Promise<void> {
  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const androidDir = path.resolve(projectRoot, opts.androidDir ?? "android");
  const androidAppDir = path.join(androidDir, "app");
  const settingsFile = path.join(androidDir, "settings.gradle");
  const appBuildFile = path.join(androidAppDir, "build.gradle");

  log.blank();
  log.header("kafitra/lynx-autolink — lynx link");
  log.blank();

  // ── Validate Android directory exists ────────────────────────────────────
  if (!fs.existsSync(androidDir)) {
    log.error(
      `Android directory not found: ${androidDir}\n` +
        "  Use --android-dir to specify the correct path.",
    );
    process.exit(1);
  }

  // ── Step 1: Scan modules ──────────────────────────────────────────────────
  log.step("Scanning for Lynx Native Modules…");
  let modules;
  try {
    modules = scanModules(projectRoot);
  } catch (err) {
    log.error(`Module scan failed: ${(err as Error).message}`);
    process.exit(1);
  }

  if (modules.length === 0) {
    log.warn(
      "No Lynx Native Modules found in node_modules.\n" +
        "  Make sure each module includes a `lynx.module.json` at its package root.",
    );
    log.blank();
    process.exit(0);
  }

  log.info(`Found ${modules.length} module(s):`);
  for (const mod of modules) {
    log.info(`  • ${mod.packageName ?? mod.name}  (${mod.name})`);
  }
  log.blank();

  // ── Step 2: Resolve Java package ─────────────────────────────────────────
  let javaPackage = opts.javaPackage;
  if (!javaPackage) {
    javaPackage = readApplicationId(appBuildFile) ?? undefined;
    if (!javaPackage) {
      log.error(
        `Could not determine applicationId from: ${appBuildFile}\n` +
          "  Use --java-package to specify the package name explicitly.",
      );
      process.exit(1);
    }
  }

  // ── Step 3: Generate Java registry ───────────────────────────────────────
  log.step("Generating LynxAutolinkRegistry.java…");
  try {
    writeJavaRegistry(androidAppDir, javaPackage, modules);
    const registryRelPath = path.join(
      "android",
      "app",
      "src",
      "main",
      "java",
      ...javaPackage.split("."),
      "LynxAutolinkRegistry.java",
    );
    log.success(`Generated: ${registryRelPath}`);
  } catch (err) {
    log.error(`Registry generation failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Step 4: Inject settings.gradle ───────────────────────────────────────
  log.step("Injecting settings.gradle entries…");
  try {
    injectSettings(settingsFile, modules);
    log.success("Updated: android/settings.gradle");
  } catch (err) {
    log.error(`settings.gradle injection failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Step 5: Inject app/build.gradle ──────────────────────────────────────
  log.step("Injecting app/build.gradle dependencies…");
  try {
    injectBuildGradle(appBuildFile, modules);
    log.success("Updated: android/app/build.gradle");
  } catch (err) {
    log.error(`build.gradle injection failed: ${(err as Error).message}`);
    process.exit(1);
  }
  // ── Step 6: Inject AndroidManifest.xml permissions ─────────────────────
  const manifestFile = path.join(
    androidAppDir,
    "src",
    "main",
    "AndroidManifest.xml",
  );
  if (fs.existsSync(manifestFile)) {
    log.step("Injecting AndroidManifest.xml permissions…");
    try {
      injectManifestPermissions(manifestFile, modules);
      log.success("Updated: android/app/src/main/AndroidManifest.xml");
    } catch (err) {
      log.warn(`AndroidManifest.xml injection failed: ${(err as Error).message}`);
    }
  }
  // ── Summary ───────────────────────────────────────────────────────────────
  log.blank();
  log.header("✔ Linking complete");
  log.blank();
  log.info("Linked modules:");
  for (const mod of modules) {
    const clsLabel = mod.android.moduleClass
      ? mod.android.moduleClass
      : mod.android.componentClass
        ? `[UI] ${mod.android.componentClass} <${mod.android.componentTag}>`
        : "(unknown)";
    const permLabel =
      mod.android.permissions && mod.android.permissions.length > 0
        ? `  [perms: ${mod.android.permissions.join(", ")}]`
        : "";
    log.info(`  • ${mod.name}  →  ${clsLabel}${permLabel}`);
  }
  log.blank();
  log.info(`In your Application class, call:`);
  log.blank();
  log.info(`  LynxAutolinkRegistry.registerAll();`);
  log.blank();
  log.info(
    "Learn more: https://github.com/kafitramarna/kafitra-lynx-native#auto-linking",
  );
  log.blank();
}
