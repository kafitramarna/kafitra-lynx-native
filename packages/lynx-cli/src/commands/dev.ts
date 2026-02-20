import { spawn } from "node:child_process";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import * as log from "../utils/logger.js";

export interface DevOptions {
  projectRoot?: string;
  port?: number;
}

/** Detect the package manager used in projectRoot. */
function detectPackageManager(dir: string): "pnpm" | "yarn" | "npm" {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

/** Get all non-loopback IPv4 addresses. */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const iface of Object.values(interfaces)) {
    for (const entry of iface ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        ips.push(entry.address);
      }
    }
  }
  return ips;
}

/** Check that package.json exists and has a "dev" script. */
function hasDevScript(dir: string): boolean {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    return !!pkg.scripts?.["dev"];
  } catch {
    return false;
  }
}

export async function runDev(opts: DevOptions = {}): Promise<void> {
  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const port = opts.port ?? 3000;

  log.blank();
  log.header("kafitra/lynx-cli — lynx dev");
  log.blank();

  // ── Validate dev script ───────────────────────────────────────────────────
  if (!hasDevScript(projectRoot)) {
    log.error(
      `No "dev" script found in: ${path.join(projectRoot, "package.json")}\n` +
        '  Make sure your project has a "dev" script in package.json.',
    );
    process.exit(1);
  }

  const pm = detectPackageManager(projectRoot);
  const ips = getLocalIPs();
  const localIp = ips[0] ?? "localhost";

  // ── Print server info ─────────────────────────────────────────────────────
  log.info(`Package manager: ${pm}`);
  log.info(`Project root:    ${projectRoot}`);
  log.blank();
  log.step("Starting dev server…");
  log.blank();
  log.info("Bundle URLs:");
  log.info(`  Local:   http://localhost:${port}/main.lynx.bundle`);
  for (const ip of ips) {
    log.info(`  Network: http://${ip}:${port}/main.lynx.bundle`);
  }
  log.blank();
  log.info("Android port forwarding:");
  log.info(`  adb reverse tcp:${port} tcp:${port}`);
  log.blank();
  log.info("Press Ctrl+C to stop the dev server");
  log.blank();

  // ── Spawn dev server ──────────────────────────────────────────────────────
  const [cmd, ...args] =
    pm === "pnpm"
      ? ["pnpm", "run", "dev"]
      : pm === "yarn"
        ? ["yarn", "dev"]
        : ["npm", "run", "dev"];

  const isWin = process.platform === "win32";
  const child = spawn(cmd!, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT: String(port) },
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = () => {
    log.blank();
    log.info("Stopping dev server…");
    child.kill("SIGTERM");
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  child.on("close", (code) => {
    if (code !== 0 && code !== null) {
      log.error(`Dev server exited with code ${code}`);
      process.exit(code);
    }
    process.exit(0);
  });

  child.on("error", (err) => {
    log.error(`Failed to start dev server: ${err.message}`);
    process.exit(1);
  });
}
