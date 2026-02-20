import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface CheckResult {
  ok: boolean;
  label: string;
  version?: string;
  hint?: string;
  critical: boolean;
}

function run(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function checkNode(): CheckResult {
  const raw = process.version; // e.g. "v20.11.0"
  const major = parseInt(raw.slice(1).split(".")[0]!, 10);
  const ok = major >= 18;
  return {
    label: "Node.js",
    ok,
    version: raw,
    critical: true,
    hint: ok ? undefined : "Upgrade Node.js to v18 or later: https://nodejs.org",
  };
}

export function checkJava(): CheckResult {
  const out = run("java -version 2>&1") ?? run("java -version");
  // "java version "21.0.1"" or "openjdk version "17.0.9""
  const match = out?.match(/version "?(\d+)/);
  const major = match ? parseInt(match[1]!, 10) : 0;
  const ok = major >= 17;
  return {
    label: "Java (JDK)",
    ok,
    version: match ? `${major}` : undefined,
    critical: true,
    hint: ok
      ? undefined
      : "Install JDK 17+: https://adoptium.net/  or set JAVA_HOME correctly",
  };
}

export function checkAdb(): CheckResult {
  const out = run("adb version");
  const match = out?.match(/Android Debug Bridge version ([\d.]+)/);
  const ok = !!out;
  return {
    label: "adb",
    ok,
    version: match?.[1],
    critical: true,
    hint: ok
      ? undefined
      : "Install Android SDK Platform-Tools and add to PATH.\n    https://developer.android.com/studio/releases/platform-tools",
  };
}

export function checkAndroidSdk(): CheckResult {
  const home =
    process.env["ANDROID_HOME"] ?? process.env["ANDROID_SDK_ROOT"] ?? null;
  const ok = !!home && fs.existsSync(home);
  return {
    label: "ANDROID_HOME",
    ok,
    version: ok ? home ?? undefined : undefined,
    critical: false,
    hint: ok
      ? undefined
      : "Set ANDROID_HOME env variable to your Android SDK path.\n    Usually ~/Library/Android/sdk (macOS) or %LOCALAPPDATA%\\Android\\Sdk (Windows)",
  };
}

export function checkGradleWrapper(androidDir: string): CheckResult {
  const isWin = process.platform === "win32";
  const wrapper = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");
  const jar = path.join(androidDir, "gradle", "wrapper", "gradle-wrapper.jar");
  const ok = fs.existsSync(wrapper) && fs.existsSync(jar);
  return {
    label: "Gradle wrapper",
    ok,
    critical: true,
    hint: ok
      ? undefined
      : `Missing ${isWin ? "gradlew.bat" : "gradlew"} or gradle-wrapper.jar in ${androidDir}.\n    Run: lynx prebuild  or add gradle wrapper manually.`,
  };
}

export function checkConnectedDevices(): CheckResult {
  const out = run("adb devices");
  const devices = (out ?? "")
    .split("\n")
    .slice(1)
    .filter((l) => l.trim() && !l.includes("offline") && l.includes("\t"));
  const ok = devices.length > 0;
  return {
    label: "Connected device/emulator",
    ok,
    version: ok ? `${devices.length} device(s)` : undefined,
    critical: false,
    hint: ok
      ? undefined
      : "Connect an Android device via USB (enable USB debugging) or start an emulator.",
  };
}
