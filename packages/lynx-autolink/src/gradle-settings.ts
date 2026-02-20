import * as fs from "node:fs";
import * as path from "node:path";
import type { LynxModuleMetadata } from "./types.js";
import { packageNameToGradleProject } from "./scanner.js";

const MARKER_START = "// lynx-autolink-start";
const MARKER_END = "// lynx-autolink-end";

/**
 * Convert an absolute directory path to a forward-slash relative path from `fromDir`.
 * Gradle requires forward slashes regardless of OS.
 */
function toForwardSlashRelative(fromDir: string, toPath: string): string {
  return path.relative(fromDir, toPath).split(path.sep).join("/");
}

/**
 * Build the block of Gradle text for one module.
 * Example:
 *   include ':lynx-device-info'
 *   project(':lynx-device-info').projectDir = new File(rootDir, '../node_modules/@kafitra/lynx-device-info/android')
 */
function buildModuleEntry(
  gradleProjectName: string,
  androidSrcDir: string,
  settingsDir: string,
): string {
  const relPath = toForwardSlashRelative(settingsDir, androidSrcDir);
  return (
    `include ':${gradleProjectName}'\n` +
    `project(':${gradleProjectName}').projectDir = new File(rootDir, '${relPath}')`
  );
}

/**
 * Inject Lynx module include entries into `settings.gradle`.
 * Uses marker comments to identify the managed block — safe to re-run.
 *
 * @param settingsFile  - Absolute path to the `settings.gradle` file.
 * @param modules       - List of resolved Lynx modules.
 */
export function injectSettings(
  settingsFile: string,
  modules: LynxModuleMetadata[],
): void {
  const settingsDir = path.dirname(settingsFile);

  let content = "";
  if (fs.existsSync(settingsFile)) {
    content = fs.readFileSync(settingsFile, "utf8");
  }

  // Build the managed block content
  const entries: string[] = [];
  for (const mod of modules) {
    const gradleProjectName =
      mod.android.gradleProjectName ??
      packageNameToGradleProject(mod.packageName ?? mod.name);
    if (!mod.packageDir) {
      throw new Error(
        `[lynx-autolink] Module "${mod.name}" has no packageDir — cannot compute Gradle projectDir`,
      );
    }
    const androidSrcDir = path.resolve(mod.packageDir, mod.android.sourceDir);
    entries.push(
      buildModuleEntry(gradleProjectName, androidSrcDir, settingsDir),
    );
  }

  const blockContent =
    entries.length > 0
      ? entries.join("\n") + "\n"
      : "// No Lynx Native Modules detected.\n";

  const newBlock = `${MARKER_START}\n${blockContent}${MARKER_END}`;

  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  let newContent: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace existing block
    newContent =
      content.slice(0, startIdx) +
      newBlock +
      content.slice(endIdx + MARKER_END.length);
  } else {
    // Append block at end (ensure newline separator)
    const separator = content.endsWith("\n") || content === "" ? "" : "\n";
    newContent = content + separator + "\n" + newBlock + "\n";
  }

  fs.writeFileSync(settingsFile, newContent, "utf8");
}
