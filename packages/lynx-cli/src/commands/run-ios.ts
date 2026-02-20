import * as path from "node:path";
import * as fs from "node:fs";
import * as log from "../utils/logger.js";
import {
  isMacOS,
  findXcworkspace,
  runPodInstall,
  runXcodebuild,
  launchSimulator,
  schemeFromWorkspace,
} from "../utils/ios.js";

export interface RunIosOptions {
  projectRoot?: string;
  iosDir?: string;
  /** iOS bundle identifier, e.g. "com.example.app" */
  bundleId?: string;
  /** Skip pod install */
  noPodInstall?: boolean;
}

export async function runIos(opts: RunIosOptions = {}): Promise<void> {
  log.blank();
  log.header("kafitra/lynx-cli — lynx run ios");
  log.blank();

  // ── Guard: macOS only ─────────────────────────────────────────────────────
  if (!isMacOS()) {
    log.error(
      "lynx run ios is only supported on macOS.\n" +
        "  iOS apps can only be built and run on a Mac with Xcode installed.",
    );
    process.exit(0); // not a user error — just unsupported platform
  }

  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const iosDir = path.resolve(projectRoot, opts.iosDir ?? "ios");

  // ── Validate ios/ directory ───────────────────────────────────────────────
  if (!fs.existsSync(iosDir)) {
    log.error(
      `iOS directory not found: ${iosDir}\n  Use --ios-dir to specify the correct path.`,
    );
    process.exit(1);
  }

  const workspace = findXcworkspace(iosDir);
  if (!workspace) {
    log.error(
      `No .xcworkspace found in: ${iosDir}\n` +
        "  Make sure you have run pod install at least once, or the iOS project exists.",
    );
    process.exit(1);
  }

  const scheme = schemeFromWorkspace(workspace);
  log.info(`Workspace: ${path.relative(projectRoot, workspace)}`);
  log.info(`Scheme:    ${scheme}`);
  log.blank();

  // ── Step 1: pod install ───────────────────────────────────────────────────
  if (!opts.noPodInstall) {
    log.step("Running pod install…");
    try {
      await runPodInstall(iosDir);
      log.success("Pods installed");
    } catch (err) {
      log.error(`pod install failed: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // ── Step 2: xcodebuild ────────────────────────────────────────────────────
  log.step("Building iOS app (xcodebuild)…");
  try {
    await runXcodebuild(workspace, scheme);
  } catch (err) {
    log.error(`xcodebuild failed: ${(err as Error).message}`);
    process.exit(1);
  }
  log.success("Build succeeded");
  log.blank();

  // ── Step 3: Launch simulator ──────────────────────────────────────────────
  if (!opts.bundleId) {
    log.warn(
      "No --bundle-id provided — skipping simulator launch.\n" +
        "  Use: lynx run ios --bundle-id com.example.myapp",
    );
    log.blank();
    return;
  }

  log.step(`Launching ${opts.bundleId} on booted simulator…`);
  try {
    launchSimulator(opts.bundleId);
  } catch (err) {
    log.error(`Launch failed: ${(err as Error).message}`);
    process.exit(1);
  }

  log.blank();
  log.header("✔ iOS app launched");
  log.blank();
}
