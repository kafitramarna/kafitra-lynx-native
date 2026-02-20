#!/usr/bin/env node
import * as log from "./utils/logger.js";
import { runLink } from "./commands/link.js";
import { runAndroid } from "./commands/run-android.js";
import { runIos } from "./commands/run-ios.js";
import { runDoctor } from "./commands/doctor.js";
import { runPrebuild } from "./commands/prebuild.js";
import { runDev } from "./commands/dev.js";

const VERSION = "0.2.1";

/** Extremely lightweight arg parser — no external dependencies. */
function parseArgs(argv: string[]): {
  command: string | undefined;
  flags: Record<string, string | boolean>;
} {
  const args = argv.slice(2); // strip node + script path
  const flags: Record<string, string | boolean> = {};
  let command: string | undefined;

  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (!command) {
      command = arg;
      i++;
    } else {
      i++;
    }
  }
  return { command, flags };
}

function printUsage(): void {
  console.log(`
@kafitra/lynx-cli — Lynx Native Module developer workflow CLI (v${VERSION})

Usage:
  lynx <command> [options]

Commands:
  link                   Scan node_modules, generate Java registry, inject Gradle wiring
  run android            Auto-link, build APK, install and launch on device
  run ios                Build and launch on iOS simulator (macOS only)
  prebuild               Generate a minimal Android host project from template
  dev                    Start JS dev server and print bundle URLs
  doctor                 Check development environment (Node, Java, adb, SDK, devices)

Options for \`link\`:
  --project-root <path>   Root of your host project          [default: cwd]
  --android-dir  <path>   Android directory name             [default: android]
  --java-package <name>   Java package for registry class    [inferred from applicationId]

Options for \`run android\`:
  --project-root <path>   Root of your host project          [default: cwd]
  --android-dir  <path>   Android directory name             [default: android]
  --device <serial>       Target specific device serial
  --no-link               Skip auto-running lynx link

Options for \`run ios\`:
  --project-root <path>   Root of your host project          [default: cwd]
  --ios-dir <path>        iOS directory name                 [default: ios]
  --bundle-id <id>        iOS bundle identifier for simulator launch
  --no-pod-install        Skip pod install

Options for \`prebuild\`:
  --package <id>          Java package / applicationId       [required]
  --android-dir <path>    Android directory name             [default: android]
  --project-root <path>   Root of your host project          [default: cwd]
  --force                 Overwrite existing android directory

Options for \`dev\`:
  --project-root <path>   Root of your host project          [default: cwd]
  --port <number>         Dev server port                    [default: 3000]

Options for \`doctor\`:
  --android-dir <path>    Android directory to check wrapper [default: android]

Other flags:
  --version               Print CLI version
  --help                  Show this help message

Examples:
  npx @kafitra/lynx-cli link
  npx @kafitra/lynx-cli run android --android-dir android-host
  npx @kafitra/lynx-cli run ios --bundle-id com.example.app
  npx @kafitra/lynx-cli prebuild --package com.example.myapp
  npx @kafitra/lynx-cli dev --project-root apps/demo
  npx @kafitra/lynx-cli doctor
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv);

  if (flags["version"]) {
    console.log(`@kafitra/lynx-cli v${VERSION}`);
    process.exit(0);
  }

  if (flags["help"] || !command) {
    printUsage();
    process.exit(0);
  }

  // ── link ──────────────────────────────────────────────────────────────────
  if (command === "link") {
    await runLink({
      projectRoot:
        typeof flags["project-root"] === "string"
          ? flags["project-root"]
          : undefined,
      androidDir:
        typeof flags["android-dir"] === "string"
          ? flags["android-dir"]
          : undefined,
      javaPackage:
        typeof flags["java-package"] === "string"
          ? flags["java-package"]
          : undefined,
    });

    // ── run android / run ios ─────────────────────────────────────────────────
  } else if (command === "run") {
    const subcommand =
      typeof flags["_sub"] === "string"
        ? flags["_sub"]
        : detectSubcommand(process.argv);

    if (subcommand === "android") {
      await runAndroid({
        projectRoot:
          typeof flags["project-root"] === "string"
            ? flags["project-root"]
            : undefined,
        androidDir:
          typeof flags["android-dir"] === "string"
            ? flags["android-dir"]
            : undefined,
        javaPackage:
          typeof flags["java-package"] === "string"
            ? flags["java-package"]
            : undefined,
        noLink: flags["no-link"] === true,
        device:
          typeof flags["device"] === "string" ? flags["device"] : undefined,
      });
    } else if (subcommand === "ios") {
      await runIos({
        projectRoot:
          typeof flags["project-root"] === "string"
            ? flags["project-root"]
            : undefined,
        iosDir:
          typeof flags["ios-dir"] === "string" ? flags["ios-dir"] : undefined,
        bundleId:
          typeof flags["bundle-id"] === "string"
            ? flags["bundle-id"]
            : undefined,
        noPodInstall: flags["no-pod-install"] === true,
      });
    } else {
      log.error(
        `Unknown platform: "${subcommand ?? ""}"\n  Usage: lynx run android | lynx run ios`,
      );
      process.exit(1);
    }

    // ── prebuild ──────────────────────────────────────────────────────────────
  } else if (command === "prebuild") {
    const packageId =
      typeof flags["package"] === "string" ? flags["package"] : null;
    if (!packageId) {
      log.error(
        "Missing required flag: --package <applicationId>\n  Example: lynx prebuild --package com.example.myapp",
      );
      process.exit(1);
    }
    await runPrebuild({
      projectRoot:
        typeof flags["project-root"] === "string"
          ? flags["project-root"]
          : undefined,
      androidDir:
        typeof flags["android-dir"] === "string"
          ? flags["android-dir"]
          : undefined,
      packageId,
      force: flags["force"] === true,
    });

    // ── dev ───────────────────────────────────────────────────────────────────
  } else if (command === "dev") {
    await runDev({
      projectRoot:
        typeof flags["project-root"] === "string"
          ? flags["project-root"]
          : undefined,
      port:
        typeof flags["port"] === "string"
          ? parseInt(flags["port"], 10)
          : undefined,
    });

    // ── doctor ────────────────────────────────────────────────────────────────
  } else if (command === "doctor") {
    await runDoctor({
      androidDir:
        typeof flags["android-dir"] === "string"
          ? flags["android-dir"]
          : undefined,
    });
  } else {
    log.error(`Unknown command: "${command}"`);
    log.blank();
    printUsage();
    process.exit(1);
  }
}

/**
 * For `lynx run android` / `lynx run ios` the platform is a positional arg
 * right after "run". Parse it out from raw argv.
 */
function detectSubcommand(argv: string[]): string | undefined {
  const args = argv.slice(2);
  const runIdx = args.indexOf("run");
  if (runIdx === -1) return undefined;
  const next = args[runIdx + 1];
  return next && !next.startsWith("--") ? next : undefined;
}

main().catch((err: unknown) => {
  log.error(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
