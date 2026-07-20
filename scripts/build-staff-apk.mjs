#!/usr/bin/env node
/**
 * Build the Kan Printers Staff Android APK.
 *
 *   pnpm run cap:build:android           # debug (local testing)
 *   pnpm run cap:build:android:release   # signed release → public/downloads
 *
 * Release signing: android/keystore.properties (see keystore.properties.example)
 * or ANDROID_KEYSTORE_* env vars via scripts/prepare-android-signing.mjs.
 *
 * Requires Android SDK (ANDROID_HOME) and JDK 17+.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const gradle = isWindows ? "gradlew.bat" : "./gradlew";
const release = process.argv.includes("--release");
const skipCopy = process.argv.includes("--no-copy");

function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWindows });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasReleaseSigning() {
  const propsPath = path.join(root, "android", "keystore.properties");
  if (fs.existsSync(propsPath)) return true;
  return Boolean(
    process.env.ANDROID_KEYSTORE_BASE64 &&
      process.env.ANDROID_KEYSTORE_PASSWORD &&
      process.env.ANDROID_KEY_ALIAS &&
      process.env.ANDROID_KEY_PASSWORD
  );
}

if (release && !hasReleaseSigning()) {
  console.error("\nRelease APK requires signing configuration.");
  console.error("  Local: copy android/keystore.properties.example → android/keystore.properties");
  console.error("  CI:    set ANDROID_KEYSTORE_* secrets (see docs/ANDROID_RELEASE_APK.md)\n");
  process.exit(1);
}

if (release && process.env.ANDROID_KEYSTORE_BASE64 && !fs.existsSync(path.join(root, "android", "keystore.properties"))) {
  console.log("Preparing signing from ANDROID_KEYSTORE_* env…");
  run(isWindows ? "node.exe" : "node", ["scripts/prepare-android-signing.mjs"]);
}

console.log("1/3 Building web assets for Capacitor shell…");
run(isWindows ? "pnpm.cmd" : "pnpm", ["run", "build:web"]);

console.log("2/3 Syncing Capacitor Android project…");
run(isWindows ? "pnpm.cmd" : "pnpm", ["exec", "cap", "sync", "android"]);

const gradleTask = release ? "assembleRelease" : "assembleDebug";
console.log(`3/3 Assembling Android ${release ? "release" : "debug"} APK…`);
run(gradle, [gradleTask], path.join(root, "android"));

const apkPath = release
  ? path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk")
  : path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");

if (!fs.existsSync(apkPath)) {
  console.error("\nExpected APK not found:", apkPath);
  process.exit(1);
}

const stat = fs.statSync(apkPath);
console.log(`\n${release ? "Release" : "Debug"} APK built (${Math.round(stat.size / 1024)} KB):`);
console.log(apkPath);

const publicApk = path.join(root, "public", "downloads", "kan-printers-staff.apk");

if (release && !skipCopy) {
  fs.mkdirSync(path.dirname(publicApk), { recursive: true });
  fs.copyFileSync(apkPath, publicApk);
  console.log("\nCopied for employee download:");
  console.log(publicApk);
  console.log("\nNext: commit public/downloads/kan-printers-staff.apk and deploy to Vercel.");
  console.log("URL: https://payroll.kanprinters.co.za/downloads/kan-printers-staff.apk");
} else if (!release) {
  console.log("\nFor signed release (production download):");
  console.log("  pnpm run cap:build:android:release");
  console.log("\nSee docs/ANDROID_RELEASE_APK.md");
}
