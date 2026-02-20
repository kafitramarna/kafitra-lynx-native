import { execSync, spawnSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** Returns the path to gradlew (or gradlew.bat on Windows) inside `androidDir`. */
export function getGradlew(androidDir: string): string {
  const isWin = process.platform === "win32";
  return path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");
}

/** Returns list of connected device/emulator serial IDs via `adb devices`. */
export function getConnectedDevices(): string[] {
  try {
    const out = execSync("adb devices", {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    });
    return out
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("*") && l.includes("\t"))
      .filter((l) => !l.includes("offline"))
      .map((l) => l.split("\t")[0]!.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Read applicationId from app/build.gradle. */
export function getAppPackageName(buildGradlePath: string): string | null {
  try {
    const content = fs.readFileSync(buildGradlePath, "utf8");
    const match = content.match(/applicationId\s+["']([^"']+)["']/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Launch the app's main activity via adb.
 * @param appId - e.g. "com.kafitra.demo"
 * @param deviceSerial - optional specific device serial
 */
export function launchActivity(appId: string, deviceSerial?: string): void {
  const target = deviceSerial ? ["-s", deviceSerial] : [];
  const activity = `${appId}/.MainActivity`;
  const result = spawnSync(
    "adb",
    [...target, "shell", "am", "start", "-n", activity],
    { encoding: "utf8", stdio: "pipe" },
  );
  if (result.status !== 0) {
    throw new Error(
      `adb shell am start failed: ${result.stderr || result.stdout}`,
    );
  }
}

/** Returns list of AVD names from the Android SDK emulator. */
export function getAvailableAvds(): string[] {
  try {
    const out = execSync("emulator -list-avds", {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Launch an AVD emulator in the background.
 * @param avdName - name from `emulator -list-avds`
 */
export function launchEmulator(avdName: string): void {
  const child = spawn("emulator", ["-avd", avdName], {
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  child.unref();
}

/**
 * Poll adb until a device is online and fully booted.
 * Resolves with the device serial, rejects on timeout.
 * @param timeoutMs - default 120 000 ms (2 min)
 */
export function waitForDevice(timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const devices = getConnectedDevices();
      if (devices.length > 0) {
        const serial = devices[0]!;
        // Check if fully booted
        try {
          const result = execSync(
            `adb -s ${serial} shell getprop sys.boot_completed`,
            { encoding: "utf8", stdio: "pipe", timeout: 5_000 },
          );
          if (result.trim() === "1") {
            resolve(serial);
            return;
          }
        } catch {
          // not ready yet
        }
      }
      if (Date.now() >= deadline) {
        reject(new Error("Timed out waiting for emulator to boot."));
        return;
      }
      setTimeout(tick, 2000);
    };
    setTimeout(tick, 3000); // give emulator a moment to register with adb
  });
}

/**
 * Set up adb reverse port forwarding for dev server.
 * @param port - default 3000
 */
export function adbReverse(port = 3000): void {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch {
    // non-fatal — user may not have adb in PATH or no device connected yet
  }
}
