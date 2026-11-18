# RI360 as an Android and iOS app (101)

The RI360 website is already set up as a phone app with [Capacitor 8](https://capacitorjs.com). This page explains how that works and how to run it on your phone. For the launch checklist (store rules, trademarks, data rights) see [MOBILE_LAUNCH_RESEARCH.md](MOBILE_LAUNCH_RESEARCH.md).

## How it works

```
frontend/src  ──npm run build:mobile──►  frontend/dist  ──cap sync──►  android/  (Android Studio project)
 (React site)                            (static site)                ios/      (Xcode project)
```

- The app is a small native shell (Java/Kotlin on Android, Swift on iOS) with a full-screen **web view**. The web view loads the built website from inside the app, not from the internet, so it works offline.
- **Capacitor plugins** let the website's JavaScript call native features. RI360 uses:
  - `@capacitor/app` for the Android back button
  - `@capacitor/browser` to open outside links in the system browser
  - `SystemBars` (part of Capacitor core) so the status bar icons follow the paper/pit theme
- That glue code is in `frontend/src/lib/native.ts`. It runs only inside the app. On the website it does nothing.
- You write the app in React as usual. You only touch `android/` or `ios/` for native settings (icons, permissions, signing).

## Files involved

| File | What it is |
|---|---|
| `frontend/capacitor.config.ts` | App ID (`io.github.devarsh44.ri360`), name, and native settings. **The app ID is permanent once uploaded to a store**, so change it now if you want a different one. |
| `frontend/android/` | The Android Studio project. It's committed, apart from build output and the copied website. |
| `frontend/ios/` | The Xcode project (Swift Package Manager, no CocoaPods). |
| `frontend/src/lib/native.ts` | App-only behaviour: links, back button, status bar. |
| `frontend/vite.config.ts` | `--mode mobile` leaves the launch-film videos (~8 MB) out of the app. |

## Changes made for phones

- `viewport-fit=cover` in `index.html`, and the header and footer pad themselves around the notch, status bar and gesture bar (`--safe-area-inset-*`).
- External links open in the system browser instead of trapping the user inside the app.
- The Android back button goes back a page, and closes the app from the overview.
- iOS `Info.plist` declares only standard (exempt) encryption, which skips an export-compliance question on every upload.
- Android targets API 36 (Android 16), which Google Play requires since 31 Aug 2026.

## Everyday commands (run from `frontend/`)

```bash
npm run cap:sync     # build the site for mobile and copy it into android/ and ios/
npm run android      # cap:sync, then open Android Studio
npm run ios          # cap:sync, then open Xcode (macOS only)
```

After any change to the React code, run `npm run cap:sync` and press Run again in Android Studio or Xcode. You only need to repeat `npx cap add` if you delete a platform folder.

## Android: first run (Windows, macOS or Linux)

1. Install **[Android Studio](https://developer.android.com/studio)**. It includes the Java runtime (JDK) and Android SDK that Gradle needs. In the first-run wizard choose **Standard**.
2. In Android Studio go to **Settings → Languages & Frameworks → Android SDK** and make sure **Android 16 (API 36)** is installed.
3. Open a terminal in `frontend/` and run `npm run android`. Android Studio opens the `android/` project. The first Gradle sync takes a few minutes.
4. To run it on a **real phone**, enable *Developer options* (tap *Build number* 7 times in Settings → About phone), turn on *USB debugging*, plug the phone in, and pick it from the device menu. To use an **emulator** instead, open *Device Manager* and create a Pixel device.
5. Press ▶ **Run**. RI360 opens as an app.

To build an installable APK from the command line instead:

```bash
cd frontend/android
./gradlew assembleDebug      # Windows: gradlew.bat assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. You can copy it to an Android phone and install it.

### Debugging the web view

With the app running, open `chrome://inspect` in desktop Chrome. You get full DevTools (console, network, elements) for the app.

## iOS: first run (needs a Mac)

iOS apps can only be built with **Xcode on macOS**. Xcode 26 or later is required for App Store uploads. If you don't have a Mac, use a cloud Mac or a CI service such as Codemagic, Ionic Appflow or GitHub Actions macOS runners.

1. Install Xcode from the Mac App Store and open it once to install components.
2. Clone the repo on the Mac and run `npm ci` then `npm run ios` in `frontend/`.
3. In Xcode, select the **App** target → **Signing & Capabilities** → choose your Team. A free Apple ID can run the app on your own iPhone for 7 days; the paid Developer Program (US$99/year) is needed for TestFlight and the App Store.
4. Pick a simulator or your plugged-in iPhone and press ▶.

To debug the web view on iOS, use Safari's **Develop** menu on the Mac.

## Not done yet (next steps)

- **App icon and splash screen.** Make a 1024×1024 PNG icon and a 2732×2732 splash, put them in `frontend/assets/`, then run `npx @capacitor/assets generate`.
- **Live race data.** The app currently ships with the data it was built with. Load `https://ri360.vercel.app/data/` at runtime (with the bundled copy as an offline fallback) so new races appear without a store update.
- **App-only features** (push notifications for new races, favourites, share), which you need to pass Apple's "minimum functionality" review (4.2).
- **Release signing.** Create an Android upload keystore (keep it backed up and out of git) and set up iOS certificates, then build release versions (`./gradlew bundleRelease` for the Play Store `.aab`).

## Alternative: installable web app (PWA)

Add a `manifest.webmanifest` and a service worker (for example with `vite-plugin-pwa`). Users can then "Add to Home Screen" from the Vercel URL without an app store.
