#!/usr/bin/env node
/**
 * Build the Kan Printers Staff Android APK (debug by default).
 * Requires Android Studio / JDK 17+ and ANDROID_HOME configured.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const gradle = isWindows ? "gradlew.bat" : "./gradlew";

function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWindows });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("1/3 Building web assets for Capacitor shell...");
run(isWindows ? "pnpm.cmd" : "pnpm", ["run", "build:web"]);

console.log("2/3 Syncing Capacitor Android project...");
run(isWindows ? "pnpm.cmd" : "pnpm", ["exec", "cap", "sync", "android"]);

console.log("3/3 Assembling Android debug APK...");
run(gradle, ["assembleDebug"], path.join(root, "android"));

const apkPath = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk"
);

console.log("\nDebug APK built:");
console.log(apkPath);
console.log("\nCopy to public/downloads for employee download:");
console.log("  public/downloads/kan-printers-staff.apk");
console.log("\nFor a signed release APK, open Android Studio:");
console.log("  pnpm run cap:open:android");
