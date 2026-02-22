# Changelog

All notable changes to `@kafitra/lynx-autolink` will be documented in this file.

## [0.1.1] — 2026-02-22

### Added

- **`permissions` field in `lynx.module.json`** — `LynxModuleAndroidConfig` now accepts an optional
  `permissions?: string[]` array. Each entry is a fully-qualified Android permission string
  (e.g. `"android.permission.CAMERA"`). Validated in `validateMetadata()`.

- **`injectManifestPermissions(manifestFile, modules)`** — New exported function (`manifest.ts`) that
  collects all unique permissions declared across linked modules and idempotently injects
  `<uses-permission android:name="..."/>` elements into `AndroidManifest.xml`, wrapped in
  `<!-- lynx-autolink-permissions-start -->` / `<!-- lynx-autolink-permissions-end -->` markers.
  Safe to run multiple times — replaces the existing block on re-runs.

### Fixed

- **`validateMetadata()`** — Added co-requirement enforcement: `android.componentTag` is now
  required when `android.componentClass` is provided. Previously the validator silently
  accepted a `componentClass`-only entry which would register a UI component with no
  element tag, making it impossible to use in JSX.
- **`generateJavaRegistry()`** — Removed spurious `import com.lynx.tasm.LynxEnv;` from the
  empty-modules code path (no modules found). The import was unused in that branch and
  caused a javac compiler warning.

---

## [0.1.0] — 2026-02-20

### Added

- **`lynx.module.json` schema & validation** — `validateMetadata()` provides descriptive errors for malformed metadata files, including Java class name format checking.
- **`scanModules(projectRoot)`** — Traverses `node_modules` (with upward hoisting support) to find all packages containing `lynx.module.json`. Handles scoped packages (`@scope/name`), deduplicates by both npm package name and Lynx module name.
- **`generateJavaRegistry(modules, javaPackage)`** — Generates `LynxAutolinkRegistry.java` source code with correct imports and `LynxEnv.inst().registerModule()` calls. Also generates `addUIBehaviorsTo(builder)` when any module declares a `componentClass`.
- **`writeJavaRegistry(androidAppDir, javaPackage, modules)`** — Writes the generated registry to the correct path under `android/app/src/main/java/<pkg>/`. Infers package from `applicationId` in `build.gradle` if not passed explicitly. Idempotent.
- **`injectSettings(settingsFile, modules)`** — Injects `include` + `projectDir` entries into `settings.gradle` inside `// lynx-autolink-start` / `// lynx-autolink-end` markers. Creates markers on first run. Idempotent.
- **`injectBuildGradle(buildFile, modules)`** — Injects `implementation project(':...')` dependencies into `app/build.gradle`. Skips entries that already exist. Idempotent.
- **`packageNameToGradleProject(packageName)`** — Utility to derive a Gradle project name from an npm package name.
- **TypeScript types** — `LynxModuleMetadata`, `LynxModuleAndroidConfig` exported from the package root.
- **`componentClass` / `componentTag` support** — Schema, types, and Java generator extended to support native UI custom elements in addition to native modules.
