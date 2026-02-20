export type { LynxModuleMetadata, LynxModuleAndroidConfig } from "./types.js";
export { validateMetadata } from "./schema.js";
export { scanModules, packageNameToGradleProject } from "./scanner.js";
export {
  generateJavaRegistry,
  writeJavaRegistry,
  readApplicationId,
} from "./java-generator.js";
export { injectSettings } from "./gradle-settings.js";
export { injectBuildGradle } from "./gradle-build.js";
