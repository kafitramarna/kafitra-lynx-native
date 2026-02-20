# Changelog

All notable changes to `@kafitra/lynx-autolink` will be documented in this file.

## [0.1.0] — 2026-02-20

### Added

- **`lynx.module.json` schema & validation** — `validateMetadata()` provides descriptive errors for malformed metadata files, including Java class name format checking.
- **`scanModules(projectRoot)`** — Traverses `node_modules` (with upward hoisting support) to find all packages containing `lynx.module.json`. Handles scoped packages (`@scope/name`), deduplicates by both npm package name and Lynx module name.
- **`generateJavaRegistry(modules, javaPackage)`** — Generates `LynxAutolinkRegistry.java` source code with correct imports and `LynxEnv.inst().registerModule()` calls.
- **`writeJavaRegistry(androidAppDir, javaPackage, modules)`** — Writes the generated registry to the correct path under `android/app/src/main/java/<pkg>/`. Infers package from `applicationId` in `build.gradle` if not passed explicitly. Idempotent.
- **`injectSettings(settingsFile, modules)`** — Injects `include` + `projectDir` entries into `settings.gradle` inside `// lynx-autolink-start` / `// lynx-autolink-end` markers. Creates markers on first run. Idempotent.
- **`injectBuildGradle(buildFile, modules)`** — Injects `implementation project(':...')` dependencies into `app/build.gradle`. Skips entries that already exist. Idempotent.
- **`packageNameToGradleProject(packageName)`** — Utility to derive a Gradle project name from an npm package name.
- **TypeScript types** — `LynxModuleMetadata`, `LynxModuleAndroidConfig` exported from the package root.
