import * as fs from "node:fs";
import type { LynxModuleMetadata } from "./types.js";
import { packageNameToGradleProject } from "./scanner.js";

/**
 * Inject `implementation project(':gradle-project-name')` entries into `app/build.gradle`.
 * Only adds entries that are not already present — safe to re-run.
 *
 * @param buildFile - Absolute path to `android/app/build.gradle`.
 * @param modules   - List of resolved Lynx modules.
 */
export function injectBuildGradle(
  buildFile: string,
  modules: LynxModuleMetadata[],
): void {
  if (!fs.existsSync(buildFile)) {
    throw new Error(`[lynx-autolink] build.gradle not found at: ${buildFile}`);
  }

  let content = fs.readFileSync(buildFile, "utf8");

  for (const mod of modules) {
    const gradleProjectName =
      mod.android.gradleProjectName ??
      packageNameToGradleProject(mod.packageName ?? mod.name);
    const depLine = `    implementation project(':${gradleProjectName}')`;
    const depCheck = `project(':${gradleProjectName}')`;

    // Skip if this dependency already exists in the file
    if (content.includes(depCheck)) continue;

    // Find the dependencies block and append inside it
    const depsBlockMatch = content.match(/dependencies\s*\{/);
    if (!depsBlockMatch || depsBlockMatch.index === undefined) {
      throw new Error(
        `[lynx-autolink] Could not find a \`dependencies {\` block in: ${buildFile}`,
      );
    }

    const insertAt = depsBlockMatch.index + depsBlockMatch[0].length;
    content =
      content.slice(0, insertAt) + "\n" + depLine + content.slice(insertAt);
  }

  fs.writeFileSync(buildFile, content, "utf8");
}
