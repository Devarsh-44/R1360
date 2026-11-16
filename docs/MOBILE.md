# Turning RI360 into a mobile app

The website was built so it can be wrapped as a native app without code changes:

- `vite.config.ts` uses `base: "./"`, so assets load from `file://` or `capacitor://`.
- Pages are routed by the URL hash (`#/race/89`), which needs no server rewrites.
- All data is static JSON in `frontend/public/data`, so it works offline once bundled.
- Layouts are checked at phone width (390px).

## Capacitor (iOS + Android)

From `frontend/`:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init RI360 com.rcintel.ri360 --web-dir dist
npm run build
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios        # opens Xcode (macOS)
npx cap open android    # opens Android Studio
```

After each website change: `npm run build && npx cap sync`.

Recommended extras:

- `@capacitor/status-bar`: match the status bar to the paper/pit theme.
- `@capacitor/splash-screen` with the RI360 mark (`public/ri360-mark.svg`).
- App icons: generate them from the mark with `@capacitor/assets`.

## Alternative: installable web app (PWA)

Add a `manifest.webmanifest` and a service worker (for example with `vite-plugin-pwa`). Users can then "Add to Home Screen" from the Vercel URL without an app store.
