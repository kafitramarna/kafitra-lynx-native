import pc from "picocolors";
import * as log from "../utils/logger.js";
import {
  checkNode,
  checkJava,
  checkAdb,
  checkAndroidSdk,
  checkGradleWrapper,
  checkConnectedDevices,
  type CheckResult,
} from "../utils/env.js";

export interface DoctorOptions {
  androidDir?: string;
}

export async function runDoctor(opts: DoctorOptions = {}): Promise<void> {
  const androidDir = opts.androidDir ?? "android";

  log.blank();
  log.header("kafitra/lynx-cli — lynx doctor");
  log.blank();

  const checks: CheckResult[] = [
    checkNode(),
    checkJava(),
    checkAdb(),
    checkAndroidSdk(),
    checkGradleWrapper(androidDir),
    checkConnectedDevices(),
  ];

  // ── Print results table ───────────────────────────────────────────────────
  const COL_STATUS = 4;
  const COL_LABEL = 30;
  const COL_VERSION = 20;

  const header =
    "  " +
    "STATUS".padEnd(COL_STATUS + 2) +
    "TOOL".padEnd(COL_LABEL) +
    "VERSION / INFO";
  console.log(pc.bold(pc.white(header)));
  console.log("  " + "─".repeat(70));

  let hasFailure = false;

  for (const check of checks) {
    const icon = check.ok
      ? pc.green("✔")
      : check.critical
        ? pc.red("✖")
        : pc.yellow("⚠");

    const label = check.ok
      ? pc.white(check.label.padEnd(COL_LABEL))
      : check.critical
        ? pc.red(check.label.padEnd(COL_LABEL))
        : pc.yellow(check.label.padEnd(COL_LABEL));

    const version = check.version
      ? pc.dim(check.version.slice(0, COL_VERSION - 1).padEnd(COL_VERSION))
      : pc.dim("—".padEnd(COL_VERSION));

    console.log(`  ${icon}  ${label}${version}`);

    if (!check.ok && check.hint) {
      console.log("      " + pc.dim(check.hint.replace(/\n/g, "\n      ")));
    }

    if (!check.ok && check.critical) hasFailure = true;
  }

  log.blank();

  if (hasFailure) {
    log.warn(
      "Some critical checks failed. Fix the issues above before running lynx commands.",
    );
    log.blank();
    process.exit(1);
  } else {
    log.success("Environment looks good!");
    log.blank();
  }
}
