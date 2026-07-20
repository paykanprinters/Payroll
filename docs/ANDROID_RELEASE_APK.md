# Signed release APK — staff Android app

Production staff APKs must be **signed** (not debug). This doc covers one-time keystore setup, local builds, CI, and what to do after the APK is built.

---

## One-time: create a signing keystore

On a secure machine (not committed to git):

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/staff-release.keystore \
  -alias kan-staff \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore file and passwords in your company password manager. **Loss of the keystore means you cannot update the installed app** — employees would need to uninstall and reinstall.

---

## Local signed release build

1. Copy the example properties file:

   ```bash
   cp android/keystore.properties.example android/keystore.properties
   ```

2. Edit `android/keystore.properties` with your keystore path, alias, and passwords.

3. Build and copy to the public download folder:

   ```bash
   pnpm run cap:build:android:release
   ```

   Output:
   - Gradle: `android/app/build/outputs/apk/release/app-release.apk`
   - Employee download copy: `public/downloads/kan-printers-staff.apk`

4. **Bump version** before each republish (in `android/app/build.gradle` or `android/gradle.properties`):

   ```properties
   staffVersionCode=2
   staffVersionName=1.0.1
   ```

   `versionCode` must increase for Android to treat it as an update.

---

## GitHub Actions (team builds)

Workflow: **Actions → Android release APK → Run workflow**

### Required repository secrets

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of `staff-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | e.g. `kan-staff` |
| `ANDROID_KEY_PASSWORD` | Key password |

Encode keystore for the secret:

```bash
base64 -i android/staff-release.keystore | pnpm exec -- node -e "process.stdout.write(require('fs').readFileSync(0,'utf8').trim())"
# Paste output into ANDROID_KEYSTORE_BASE64
```

Or: `base64 -i android/staff-release.keystore | pbcopy` (macOS)

The workflow uploads **`kan-printers-staff-release`** artifact (30-day retention). Download it from the Actions run.

---

## What follows after the APK is built

### 1. Publish for employee download

```bash
# If built locally (release script already copied):
git add public/downloads/kan-printers-staff.apk
git commit -m "Update staff Android APK v1.0.1"
git push
```

Vercel deploys → APK available at:

**https://payroll.kanprinters.co.za/downloads/kan-printers-staff.apk**

If built in CI, download the artifact, copy to `public/downloads/kan-printers-staff.apk`, then commit and push.

### 2. Tell employees

Point them to **Settings → Staff portal → Install** (`/staff/install`) or the direct download link.

First install: enable **Install unknown apps** for Chrome/files when prompted.

### 3. Updates

Because the app loads the **live staff URL**, most fixes deploy via **Vercel only** — no new APK needed.

Publish a **new APK** when you change:

- Native Capacitor plugins or Android permissions
- App ID, signing, or WebView shell behavior
- Minimum/target SDK requirements

### 4. Reinstall vs update

- Same signing key + higher `versionCode` → Android updates in place.
- New signing key → employees must uninstall the old app first.

### 5. Optional next hardening

- [ ] Internal testing track (Firebase App Distribution)
- [ ] Certificate pinning for `payroll.kanprinters.co.za`
- [ ] Play Console private / internal app sharing (if you move off direct APK)

---

## Scripts reference

| Command | Purpose |
|---------|---------|
| `pnpm run cap:build:android` | Debug APK (dev/testing) |
| `pnpm run cap:build:android:release` | Signed release + copy to `public/downloads/` |
| `node scripts/prepare-android-signing.mjs` | Decode CI secrets → `keystore.properties` |

See also: `docs/STAFF_MOBILE_APP.md`
