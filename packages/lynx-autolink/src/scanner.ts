import * as fs from "node:fs";
import * as path from "node:path";
import { validateMetadata } from "./schema.js";
import type { LynxModuleMetadata } from "./types.js";

const METADATA_FILENAME = "lynx.module.json";

/**
 * Derive the Gradle project name from an npm package name.
 * "@kafitra/lynx-device-info" → "lynx-device-info"
 * "lynx-device-info"          → "lynx-device-info"
 */
export function packageNameToGradleProject(packageName: string): string {
  // Strip scope prefix if present
  const unscoped = packageName.startsWith("@")
    ? packageName.split("/").slice(1).join("-")
    : packageName;
  // Kebab-case: replace any run of non-alphanumeric chars with a dash, lowercase
  return unscoped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve the `node_modules` directory by walking up from `startDir`.
 * Returns all candidate node_modules paths (hoisted monorepo support).
 */
function findNodeModulesDirs(startDir: string): string[] {
  const candidates: string[] = [];
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, "node_modules");
    if (fs.existsSync(candidate)) {
      candidates.push(candidate);
    }
    const parent = path.dirname(current);
    if (parent === current) break; // filesystem root
    current = parent;
  }
  return candidates;
}

/**
 * Try to load and validate `lynx.module.json` from a package directory.
 * Returns `null` if the file does not exist.
 * Throws if the file exists but is malformed.
 */
function loadMetadataFromDir(
  packageDir: string,
  packageName: string,
): LynxModuleMetadata | null {
  const metaPath = path.join(packageDir, METADATA_FILENAME);
  if (!fs.existsSync(metaPath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    throw new Error(
      `[lynx-autolink] Failed to parse ${metaPath} — ensure it is valid JSON`,
    );
  }

  const meta = validateMetadata(raw, metaPath);
  const gradleProjectName =
    meta.android.gradleProjectName ?? packageNameToGradleProject(packageName);

  return {
    ...meta,
    android: {
      ...meta.android,
      gradleProjectName,
    },
    packageDir,
    packageName,
  };
}

/**
 * Scan a single `node_modules` directory for Lynx Native Modules.
 * Returns an array of validated metadata objects.
 * Already-seen package names (tracked via `seenNames`) are skipped to handle hoisting.
 */
function scanNodeModulesDir(
  nodeModulesDir: string,
  seenPackageNames: Set<string>,
): LynxModuleMetadata[] {
  const results: LynxModuleMetadata[] = [];

  if (!fs.existsSync(nodeModulesDir)) return results;

  let entries: string[];
  try {
    entries = fs.readdirSync(nodeModulesDir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue; // skip .cache, .modules, etc.

    if (entry.startsWith("@")) {
      // Scoped packages — scan one level deeper
      const scopeDir = path.join(nodeModulesDir, entry);
      let scopedEntries: string[];
      try {
        scopedEntries = fs.readdirSync(scopeDir);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        const packageName = `${entry}/${scopedEntry}`;
        if (seenPackageNames.has(packageName)) continue;
        const packageDir = path.join(scopeDir, scopedEntry);
        if (!fs.statSync(packageDir).isDirectory()) continue;
        try {
          const meta = loadMetadataFromDir(packageDir, packageName);
          if (meta) {
            seenPackageNames.add(packageName);
            results.push(meta);
          }
        } catch (err) {
          // Re-throw metadata validation errors so the CLI surfaces them
          throw err;
        }
      }
    } else {
      // Unscoped package
      const packageName = entry;
      if (seenPackageNames.has(packageName)) continue;
      const packageDir = path.join(nodeModulesDir, entry);
      try {
        if (!fs.statSync(packageDir).isDirectory()) continue;
      } catch {
        continue;
      }
      try {
        const meta = loadMetadataFromDir(packageDir, packageName);
        if (meta) {
          seenPackageNames.add(packageName);
          results.push(meta);
        }
      } catch (err) {
        throw err;
      }
    }
  }

  return results;
}

/**
 * Scan `node_modules` (including parent-hoisted locations) for Lynx Native Modules.
 *
 * @param projectRoot - The root directory of the host project (where `package.json` lives).
 * @returns           Array of validated `LynxModuleMetadata` objects, deduplicated by package name.
 */
export function scanModules(projectRoot: string): LynxModuleMetadata[] {
  const nodeModulesDirs = findNodeModulesDirs(projectRoot);
  const seenPackageNames = new Set<string>();
  const allResults: LynxModuleMetadata[] = [];

  for (const nmDir of nodeModulesDirs) {
    const batch = scanNodeModulesDir(nmDir, seenPackageNames);
    allResults.push(...batch);
  }

  // Further deduplicate by module `name` field (in case two packages expose same Lynx module name)
  const seenModuleNames = new Map<string, LynxModuleMetadata>();
  for (const meta of allResults) {
    if (!seenModuleNames.has(meta.name)) {
      seenModuleNames.set(meta.name, meta);
    }
  }

  return Array.from(seenModuleNames.values());
}
