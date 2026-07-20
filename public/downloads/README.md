# APK downloads

Production staff APK (signed release):

`kan-printers-staff.apk`

Employees download from:

`https://payroll.kanprinters.co.za/downloads/kan-printers-staff.apk`

## Build (signed release)

```bash
# One-time: android/keystore.properties — see android/keystore.properties.example
pnpm run cap:build:android:release
```

Full guide: **`docs/ANDROID_RELEASE_APK.md`**

Debug builds (testing only — do not distribute):

```bash
pnpm run cap:build:android
```
