import { spawn, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** Detect the package manager used in a directory. */
function detectPm(dir: string): string {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

/**
 * Open a new terminal window running the dev server.
 * - Windows: tries Windows Terminal (`wt`), falls back to `start cmd /k`
 * - macOS:   uses `open -a Terminal` with an AppleScript inline command
 * - Linux:   tries common emulators in order
 */
export function openDevServerTerminal(projectRoot: string, port = 3000): void {
  const pm = detectPm(projectRoot);
  const cmd = `${pm} run dev`;

  if (process.platform === "win32") {
    _openWindows(projectRoot, cmd);
  } else if (process.platform === "darwin") {
    _openMacOS(projectRoot, cmd);
  } else {
    _openLinux(projectRoot, cmd);
  }
}

// ── Windows ──────────────────────────────────────────────────────────────────

function _openWindows(cwd: string, cmd: string): void {
  // Try Windows Terminal first
  const wtAvailable = _commandExists("wt");
  if (wtAvailable) {
    // wt new-tab --title "Lynx Dev Server" --startingDirectory <cwd> cmd /k <cmd>
    spawn(
      "wt",
      [
        "new-tab",
        "--title",
        "Lynx Dev Server",
        "--startingDirectory",
        cwd,
        "cmd",
        "/k",
        cmd,
      ],
      { detached: true, stdio: "ignore", shell: false },
    ).unref();
    return;
  }

  // Fallback: plain cmd window
  spawn("cmd", ["/c", "start", "cmd", "/k", `cd /d "${cwd}" && ${cmd}`], {
    detached: true,
    stdio: "ignore",
    shell: false,
  }).unref();
}

// ── macOS ─────────────────────────────────────────────────────────────────────

function _openMacOS(cwd: string, cmd: string): void {
  const script = `tell application "Terminal"
    do script "cd '${cwd}' && ${cmd}"
    activate
  end tell`;
  spawn("osascript", ["-e", script], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

// ── Linux ─────────────────────────────────────────────────────────────────────

function _openLinux(cwd: string, cmd: string): void {
  const emulators: Array<[string, string[]]> = [
    [
      "gnome-terminal",
      ["--", "bash", "-c", `cd '${cwd}' && ${cmd}; exec bash`],
    ],
    ["xfce4-terminal", ["-e", `bash -c "cd '${cwd}' && ${cmd}; exec bash"`]],
    ["konsole", ["--", "bash", "-c", `cd '${cwd}' && ${cmd}; exec bash`]],
    [
      "x-terminal-emulator",
      ["-e", `bash -c "cd '${cwd}' && ${cmd}; exec bash"`],
    ],
    ["xterm", ["-e", `bash -c "cd '${cwd}' && ${cmd}; exec bash"`]],
  ];

  for (const [bin, args] of emulators) {
    if (_commandExists(bin)) {
      spawn(bin, args, { detached: true, stdio: "ignore" }).unref();
      return;
    }
  }

  // Last resort: background process (no new window)
  const [prog, ...rest] = cmd.split(" ");
  spawn(prog!, rest, { cwd, detached: true, stdio: "ignore" }).unref();
}

// ── Helper ────────────────────────────────────────────────────────────────────

function _commandExists(bin: string): boolean {
  try {
    const check =
      process.platform === "win32" ? `where ${bin}` : `which ${bin}`;
    execSync(check, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
