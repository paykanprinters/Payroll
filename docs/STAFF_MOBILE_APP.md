# Kan Printers Staff — mobile app (PWA + Android)

Employees can access payslips, leave, loans, savings, and profile through:

1. **PWA** — install from Chrome on Android (Add to Home screen)
2. **Android APK** — download from your website (no Google Play)

Both use the same live staff portal at `https://payroll.kanprinters.co.za/staff`.

---

## PWA (Progressive Web App)

### Employee install

1. Open **https://payroll.kanprinters.co.za/staff/install** on an Android phone (Chrome).
2. Tap **Install app**, or use the browser menu → **Add to Home screen**.
3. Sign in with the email linked to their employee record (portal access must be active).

### Technical notes

- Manifest scope: `/staff/` — installed app opens the staff portal only.
- Service worker caches static assets; Supabase API uses network-first caching.
- After deploying to Vercel, employees get updates automatically on next launch.

---

## Android APK (Capacitor)

The APK is a thin native shell that loads the **live staff URL**. When you deploy web changes, the app updates without republishing to a store.

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (includes JDK)
- `ANDROID_HOME` set (Android SDK)
- Node.js + pnpm

### First-time setup

```bash
pnpm install
pnpm run build:web
pnpm exec cap add android   # only once
pnpm run cap:sync
```

### Build debug APK (for testing)

```bash
pnpm run cap:build:android
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Do **not** distribute debug APKs to employees.

### Signed release APK (production)

See **`docs/ANDROID_RELEASE_APK.md`** for keystore setup, CI, and publishing.

```bash
pnpm run cap:build:android:release
```

Copies signed APK to `public/downloads/kan-printers-staff.apk`. Commit and deploy to Vercel.

Employees download from:

**https://payroll.kanprinters.co.za/downloads/kan-printers-staff.apk**

### Release APK (Android Studio — alternative)

1. Open the Android project: `pnpm run cap:open:android`
2. **Build → Generate Signed Bundle / APK**
3. Copy the signed APK to `public/downloads/kan-printers-staff.apk`

### Local device testing against dev server

```bash
# Terminal 1
pnpm run dev

# Terminal 2 (Android emulator uses 10.0.2.2 for host machine)
set STAFF_APP_SERVER_URL=http://10.0.2.2:8080/staff/login
pnpm run cap:sync
pnpm run cap:open:android
```

Physical device on same Wi‑Fi: use your PC LAN IP, e.g. `http://192.168.1.10:8080/staff/login`.

---

## Supabase Auth

Ensure these URLs are in **Supabase → Authentication → URL configuration**:

- Site URL: `https://payroll.kanprinters.co.za`
- Redirect URLs: `https://payroll.kanprinters.co.za/**`

Capacitor uses the same HTTPS origin when loading the remote URL, so no extra redirect is usually needed.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `pnpm run build:web` | Vite build (includes PWA manifest + service worker) |
| `pnpm run cap:sync` | Sync web assets + config to Android project |
| `pnpm run cap:open:android` | Open Android Studio |
| `pnpm run cap:build:android` | Debug APK build (testing) |
| `pnpm run cap:build:android:release` | Signed release APK → `public/downloads/` |

---

## Employee-facing pages

| URL | Purpose |
|-----|---------|
| `/staff/login` | Sign in |
| `/staff/install` | PWA + APK install instructions |
| `/staff` | Staff dashboard |
| `/downloads/kan-printers-staff.apk` | Direct APK download (when uploaded) |
