import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as https from "node:https";
import * as http from "node:http";

const GRADLE_WRAPPER_JAR_URL =
  "https://raw.githubusercontent.com/gradle/gradle/v8.2.1/gradle/wrapper/gradle-wrapper.jar";

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u: string) => {
      const client = u.startsWith("https") ? https : http;
      client
        .get(u, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} downloading ${u}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };
    get(url);
  });
}

/**
 * Ensure gradle-wrapper.jar exists in androidDir/gradle/wrapper/.
 * Downloads it automatically if missing.
 */
export async function ensureGradleWrapperJar(
  androidDir: string,
): Promise<void> {
  const jarPath = path.join(
    androidDir,
    "gradle",
    "wrapper",
    "gradle-wrapper.jar",
  );
  if (fs.existsSync(jarPath)) return;

  const wrapperDir = path.join(androidDir, "gradle", "wrapper");
  fs.mkdirSync(wrapperDir, { recursive: true });

  process.stdout.write("  → Downloading gradle-wrapper.jar… ");
  await downloadFile(GRADLE_WRAPPER_JAR_URL, jarPath);
  process.stdout.write("done\n");
}

/**
 * Spawn gradlew with the given task, streaming output to the current terminal.
 * Resolves on exit code 0, rejects on non-zero.
 */
export function runGradle(androidDir: string, task: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");

    if (!fs.existsSync(gradlew)) {
      reject(
        new Error(
          `Gradle wrapper not found: ${gradlew}\n  Run: lynx prebuild  or add gradle wrapper manually.`,
        ),
      );
      return;
    }

    // On Unix, ensure gradlew is executable
    if (!isWin) {
      try {
        fs.chmodSync(gradlew, 0o755);
      } catch {
        // ignore
      }
    }

    // On Windows with shell:true, paths containing spaces must be double-quoted
    // so cmd.exe doesn't split on the space.
    const cmd = isWin ? `"${gradlew}"` : gradlew;
    const child = spawn(cmd, [task, "--stacktrace"], {
      cwd: androidDir,
      stdio: "inherit",
      shell: isWin,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`Gradle task "${task}" failed with exit code ${code}`),
        );
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn gradle: ${err.message}`));
    });
  });
}
