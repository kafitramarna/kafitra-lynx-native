import * as fs from "node:fs";
import type { LynxModuleMetadata } from "./types.js";

const MARKER_START = "<!-- lynx-autolink-permissions-start -->";
const MARKER_END = "<!-- lynx-autolink-permissions-end -->";

/**
 * Collect the unique set of Android permissions declared by all modules.
 */
function collectPermissions(modules: LynxModuleMetadata[]): string[] {
  const seen = new Set<string>();
  for (const mod of modules) {
    for (const perm of mod.android.permissions ?? []) {
      seen.add(perm);
    }
  }
  return Array.from(seen).sort();
}

/**
 * Inject `<uses-permission>` entries into an `AndroidManifest.xml` file.
 *
 * Uses marker comments to identify the managed block — safe to re-run.
 * Permissions are inserted just before `<application` if no manifest block
 * exists yet, or the existing block is replaced.
 *
 * @param manifestFile - Absolute path to `AndroidManifest.xml`.
 * @param modules      - List of resolved Lynx modules.
 */
export function injectManifestPermissions(
  manifestFile: string,
  modules: LynxModuleMetadata[],
): void {
  if (!fs.existsSync(manifestFile)) {
    throw new Error(
      `[lynx-autolink] AndroidManifest.xml not found at: ${manifestFile}`,
    );
  }

  const permissions = collectPermissions(modules);
  let content = fs.readFileSync(manifestFile, "utf8");

  // Build managed block
  const permLines =
    permissions.length > 0
      ? permissions
          .map((p) => `    <uses-permission android:name="${p}" />`)
          .join("\n") + "\n"
      : "    <!-- No additional permissions required by Lynx modules. -->\n";

  const newBlock = `${MARKER_START}\n${permLines}${MARKER_END}`;

  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  let newContent: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace existing managed block
    newContent =
      content.slice(0, startIdx) +
      newBlock +
      content.slice(endIdx + MARKER_END.length);
  } else {
    // Insert block just before <application (first occurrence)
    const appTagIdx = content.indexOf("<application");
    if (appTagIdx === -1) {
      throw new Error(
        `[lynx-autolink] Could not find <application tag in: ${manifestFile}`,
      );
    }
    newContent =
      content.slice(0, appTagIdx) +
      newBlock +
      "\n\n    " +
      content.slice(appTagIdx);
  }

  fs.writeFileSync(manifestFile, newContent, "utf8");
}
