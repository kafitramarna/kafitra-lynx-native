import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export function isMacOS(): boolean {
  return process.platform === "darwin";
}

/** Find the first .xcworkspace file inside iosDir. */
export function findXcworkspace(iosDir: string): string | null {
  try {
    const entries = fs.readdirSync(iosDir);
    const ws = entries.find((e) => e.endsWith(".xcworkspace"));
    return ws ? path.join(iosDir, ws) : null;
  } catch {
    return null;
  }
}

/** Find the first .xcodeproj file inside iosDir (fallback if no workspace). */
export function findXcodeproj(iosDir: string): string | null {
  try {
    const entries = fs.readdirSync(iosDir);
    const proj = entries.find((e) => e.endsWith(".xcodeproj"));
    return proj ? path.join(iosDir, proj) : null;
  } catch {
    return null;
  }
}

/** Run `pod install` in iosDir. Streams output to terminal. */
export function runPodInstall(iosDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pod", ["install"], {
      cwd: iosDir,
      stdio: "inherit",
      shell: false,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pod install failed with exit code ${code}`));
    });
    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "CocoaPods not found. Install with: sudo gem install cocoapods",
          ),
        );
      } else {
        reject(err);
      }
    });
  });
}

/** Run xcodebuild for simulator. Streams output to terminal. */
export function runXcodebuild(
  workspace: string,
  scheme: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "xcodebuild",
      [
        "-workspace",
        workspace,
        "-scheme",
        scheme,
        "-sdk",
        "iphonesimulator",
        "-configuration",
        "Debug",
        "build",
      ],
      { stdio: "inherit", shell: false },
    );
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`xcodebuild failed with exit code ${code}`));
    });
    child.on("error", reject);
  });
}

/** Launch the app on the booted simulator. */
export function launchSimulator(bundleId: string): void {
  try {
    execSync(`xcrun simctl launch booted "${bundleId}"`, {
      stdio: "inherit",
      encoding: "utf8",
    });
  } catch (err) {
    throw new Error(
      `Failed to launch simulator: ${(err as Error).message}\n  Make sure a simulator is booted: open Simulator.app`,
    );
  }
}

/** Infer scheme name from workspace path (strip .xcworkspace). */
export function schemeFromWorkspace(workspacePath: string): string {
  return path.basename(workspacePath, ".xcworkspace");
}
