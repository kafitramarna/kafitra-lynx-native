import * as path from "node:path";
import * as fs from "node:fs";
import * as log from "../utils/logger.js";
import { runLink } from "./link.js";
import {
  getConnectedDevices,
  getAvailableAvds,
  launchEmulator,
  waitForDevice,
  launchActivity,
  adbReverse,
} from "../utils/android.js";
import { runGradle, ensureGradleWrapperJar } from "../utils/gradle.js";
import { readApplicationId } from "@kafitra/lynx-autolink";
import { openDevServerTerminal, isPortInUse } from "../utils/terminal.js";

export interface RunAndroidOptions {
  projectRoot?: string;
  androidDir?: string;
  javaPackage?: string;
  /** Skip auto-run of `lynx link` before build */
  noLink?: boolean;
  /** Target specific device serial */
  device?: string;
}

export async function runAndroid(opts: RunAndroidOptions = {}): Promise<void> {
  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const androidDir = path.resolve(projectRoot, opts.androidDir ?? "android");
  const appBuildFile = path.join(androidDir, "app", "build.gradle");

  log.blank();
  log.header("kafitra/lynx-cli — lynx run android");
  log.blank();

  // ── Validate Android directory ────────────────────────────────────────────
  if (!fs.existsSync(androidDir)) {
    log.error(
      `Android directory not found: ${androidDir}\n  Use --android-dir to specify the correct path.`,
    );
    process.exit(1);
  }

  // ── Step 1: Auto-link modules ─────────────────────────────────────────────
  if (!opts.noLink) {
    log.step("Running lynx link…");
    try {
      await runLink({
        projectRoot,
        androidDir: opts.androidDir,
        javaPackage: opts.javaPackage,
      });
    } catch {
      // Non-fatal: link failure (e.g. no modules, missing dirs) never blocks the build
      log.warn("lynx link skipped — continuing with build.");
    }
  }

  // ── Step 2: Start dev server (if not already running) ──────────────────
  const devPort = 3000;
  const serverRunning = await isPortInUse(devPort);
  if (serverRunning) {
    log.info(`Dev server already running on port ${devPort}.`);
  } else {
    log.step("Starting dev server in a new terminal…");
    openDevServerTerminal(projectRoot, devPort);
    log.success("Dev server started in a new terminal window.");
  }
  log.blank();

  // ── Step 3: Detect connected devices ──────────────────────────────
  log.step("Detecting connected devices…");
  let devices = getConnectedDevices();

  if (devices.length === 0) {
    log.warn("No running devices found. Looking for available emulators…");
    const avds = getAvailableAvds();
    if (avds.length === 0) {
      log.error(
        "No Android devices or emulators found.\n" +
          "  • Connect a device via USB and enable USB debugging\n" +
          "  • Or create an AVD in Android Studio (Tools → Device Manager)",
      );
      process.exit(1);
    }
    const avd = avds[0]!;
    log.info(`Launching emulator: ${avd}`);
    launchEmulator(avd);
    log.info("Waiting for emulator to boot (up to 2 min)…");
    try {
      const booted = await waitForDevice(120_000);
      log.success(`Emulator ready: ${booted}`);
      devices = getConnectedDevices();
    } catch {
      log.error(
        "Emulator did not boot in time.\n" +
          "  Start an emulator manually in Android Studio and re-run.",
      );
      process.exit(1);
    }
  }

  const targetDevice = opts.device ?? devices[0]!;
  log.info(`Target device: ${targetDevice} (${devices.length} available)`);
  log.blank();

  // ── Step 4: Gradle installDebug ────────────────────────────────────────
  log.step("Building and installing APK (installDebug)…");
  try {
    // Auto-copy bundle to assets if dist exists but assets doesn't
    const bundleSrc = path.join(projectRoot, "dist", "main.lynx.bundle");
    const assetsDir = path.join(androidDir, "app", "src", "main", "assets");
    const bundleDest = path.join(assetsDir, "main.lynx.bundle");
    if (fs.existsSync(bundleSrc) && !fs.existsSync(bundleDest)) {
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(bundleSrc, bundleDest);
      log.success("Copied bundle to assets (offline fallback).");
    }
    await ensureGradleWrapperJar(androidDir);
    await runGradle(androidDir, "installDebug");
  } catch (err) {
    log.error(`Build failed: ${(err as Error).message}`);
    process.exit(1);
  }
  log.blank();

  // ── Step 5: Resolve applicationId ────────────────────────────────────
  const appId = opts.javaPackage ?? readApplicationId(appBuildFile) ?? null;

  if (!appId) {
    log.error(
      `Could not determine applicationId from: ${appBuildFile}\n  Use --java-package to specify it explicitly.`,
    );
    process.exit(1);
  }

  // ── Step 6: adb reverse + launch activity ────────────────────────────
  log.step("Setting up adb reverse and launching app…");
  adbReverse(3000);

  try {
    launchActivity(appId, targetDevice);
  } catch (err) {
    log.error(`Failed to launch activity: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  log.blank();
  log.header("✔ App launched successfully");
  log.blank();
  log.info(`App: ${appId}`);
  log.info(`Device: ${targetDevice}`);
  log.blank();
  log.info("Bundle URL: http://localhost:3000/main.lynx.bundle");
  log.info("Port forwarded: adb reverse tcp:3000 tcp:3000");
  log.blank();
}
