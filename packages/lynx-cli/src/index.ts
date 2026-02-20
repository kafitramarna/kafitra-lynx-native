#!/usr/bin/env node
import * as log from "./utils/logger.js";
import { runLink } from "./commands/link.js";

const VERSION = "0.1.0";

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
@kafitra/lynx-cli — Lynx Native Module auto-linking CLI (v${VERSION})

Usage:
  lynx <command> [options]

Commands:
  link         Scan node_modules, generate Java registry, and inject Gradle wiring

Options for \`link\`:
  --project-root <path>   Root of your host project        [default: cwd]
  --android-dir  <path>   Android directory name           [default: android]
  --java-package <name>   Java package for registry class  [inferred from applicationId]

Other flags:
  --version                Print CLI version
  --help                   Show this help message

Examples:
  npx @kafitra/lynx-cli link
  npx @kafitra/lynx-cli link --android-dir android-host
  npx @kafitra/lynx-cli link --project-root /path/to/project --java-package com.example.app
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
  } else {
    log.error(`Unknown command: "${command}"`);
    log.blank();
    printUsage();
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  log.error(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
