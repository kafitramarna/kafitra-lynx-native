import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Target the same ES baseline used across the monorepo
  target: "es2020",
  // Suppress "named and default exports together" warning for CJS output
  cjsInterop: true,
});
