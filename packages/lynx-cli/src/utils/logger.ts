import pc from "picocolors";

export function info(message: string): void {
  console.log(pc.cyan("ℹ") + "  " + message);
}

export function success(message: string): void {
  console.log(pc.green("✔") + "  " + message);
}

export function warn(message: string): void {
  console.log(pc.yellow("⚠") + "  " + pc.yellow(message));
}

export function error(message: string): void {
  console.error(pc.red("✖") + "  " + pc.red(message));
}

export function step(message: string): void {
  console.log(pc.bold(pc.white("→")) + "  " + message);
}

export function header(message: string): void {
  console.log(pc.bold(pc.magenta(message)));
}

export function blank(): void {
  console.log();
}
