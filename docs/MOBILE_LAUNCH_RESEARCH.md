# RI360 mobile launch: checks, concerns and open problems

Researched 18 November 2026. Store rules change often, so re-check the official pages before you submit.

## TL;DR: the five things that can actually stop you

| # | Problem | Why it matters | What to do |
|---|---|---|---|
| 1 | **"F1 / Formula 1" trademarks** | F1, FORMULA ONE, FORMULA 1, GRAND PRIX are marks of Formula One Licensing B.V., and F1 actively defends them. Apple Guideline 5.2 and Google's IP policy reject apps that use other people's marks in the name, icon, screenshots or keywords. | Keep the name **RI360** (no "F1" in title, subtitle, icon or screenshots). Describe it as "motorsport race analytics". Keep the existing "Not affiliated with Formula 1" line and add the full trademark notice in the app and store listing. |
| 2 | **Apple 4.2 "Minimum functionality"** | A Capacitor shell around a website is the #1 rejection for apps like this: "not sufficiently different from browsing the web." | Add real app value before submitting (see "Make it more than a website" below). |
| 3 | **Stale data** | The app bundles `frontend/public/data` at build time. The daily GitHub Action only updates Vercel, so an installed app would never see a new race without a store release. | Load data from `ri360.vercel.app/data/` at runtime, with the bundled copy as an offline fallback. |
| 4 | **Data rights** | Timing data originates from Formula 1's timing service. FastF1 and OpenF1 are unofficial projects; neither grants a commercial licence to the underlying data. A free, ad-free portfolio app is low risk; charging money or running ads raises it a lot. | Launch free with no ads. Don't monetise until you've checked the OpenF1/FastF1 licence files and, ideally, had a lawyer look. |
| 5 | **Google Play's 12-tester rule** | New *personal* Play accounts must run a closed test with at least 12 opted-in testers for 14 continuous days before production access, per app. | Line up 12+ real testers now, or register an organisation account (needs a D-U-N-S number, which can take up to ~30 days). |

## 1. Accounts, money and identity

- **Apple Developer Program:** US$99/year. Needs an Apple ID with 2FA. You need **a Mac with Xcode 26+** (required for uploads since 28 April 2026); without one, use a cloud Mac or a CI service such as Codemagic, Ionic Appflow or GitHub macOS runners.
- **Google Play Console:** US$25 one-time, plus ID verification.
- **Android developer verification:** from 30 Sept 2026 (Brazil, Indonesia, Singapore, Thailand), and globally in 2027, all apps on certified Android devices must come from a verified developer, even outside Play. A Play Console account covers this, but finish the verification.
- **Individual vs organisation:** As an individual, your **legal name** shows as the seller. In the EU (Digital Services Act "trader" rules) traders must publicly show an address, phone and email on the App Store. A free app with no ads or purchases can declare itself a non-trader. If you'd rather not publish personal details later, register a company first.
- **Bundle ID:** `docs/MOBILE.md` uses `com.rcintel.ri360`. Choose it carefully, because it can never change after the first upload. Use a domain you control, e.g. `app.ri360` or `com.<yourname>.ri360`.

## 2. Make it more than a website (Apple 4.2)

Reviewers often switch on airplane mode and look for things a browser can't do. RI360 already works offline, which helps. Add a few of these:

- **Push notification "New race analysed"** when the daily job adds a race (the most natural one). This needs a small push backend (Firebase Cloud Messaging plus an APNs key) that the GitHub Action can trigger.
- **Favourite drivers/teams** saved on the device, and a home screen that shows them first.
- **Native share sheet** for a race trace or strategy result (exporting a chart image).
- **Home-screen widget** (latest race winner, next race): the strongest "native" signal, but it needs Swift/Kotlin code.
- Haptics on the strategy lab sliders, a native status bar and splash screen (`@capacitor/status-bar`, `@capacitor/splash-screen`).
- No visible "website" chrome: hide the GitHub repo link or open it in the system browser, and make sure there's no "open the website" style footer as the main content.

## 3. Code and build fixes found in this repo

- **`index.html` is missing `viewport-fit=cover`.** `app.css` already uses `env(safe-area-inset-*)`, but on iOS those values are 0 unless the viewport meta includes `viewport-fit=cover`, so the sticky header will sit under the notch / Dynamic Island once full-screen.
- **Don't bundle `public/media`** (≈8.4 MB of launch-film MP4s) into the app; exclude them or stream them from Vercel. Data is ≈8.2 MB across 157 races, which is fine, but it grows each race, which is another reason for runtime loading.
- **External links** (`target="_blank"` in `Home.tsx`, `Method.tsx`, `ui.tsx`) should open with `@capacitor/browser` or the system browser, not inside the app web view.
- **Hash routing** (`#/race/89`) works in Capacitor. For deep links from push notifications, map them to these hashes.
- **Android back button:** handle it with `@capacitor/app` so it goes back a page instead of closing the app.
- **Android target SDK:** new apps and updates must target **Android 16 (API 36)** since 31 Aug 2026. Use a current Capacitor major and confirm `targetSdkVersion` is 36.
- **iOS:** build with the iOS 26 SDK. Check how the layout looks with iOS 26's Liquid Glass system UI around it.
- **Theme:** the app reads `prefers-color-scheme`; sync the native status bar colour with paper/pit themes.
- **Hover-only interactions:** the charts must work with tap (tooltips on touch). Test on a real phone, not only a resized browser.
- **Performance:** hand-built SVG charts with many laps can be slow on older Android web views. Test on a cheap Android device.
- **The backend's OpenAI-key route** (`backend/api/routes/ai_analysis.py`) must never be called from the app with a key inside the bundle. Today the frontend doesn't use the API at all; keep it that way or put a server in between.

## 4. Store listing and compliance paperwork

- **Privacy policy URL:** required by both stores, even if you collect nothing. Host it on ri360.vercel.app.
- **Apple privacy "nutrition label" and Google "Data safety" form:** today the app collects nothing (only `localStorage` for the theme). Push notifications or analytics change the answers, so update the forms when you add them.
- **Apple privacy manifest:** Capacitor plugins ship their own; make sure your final build includes them, or uploads get warnings or rejections for "required reason" APIs.
- **Age rating:** fill in Apple's updated questionnaire (new 13+/16+/18+ tiers) and Google's IARC questionnaire. Expect 4+ / Everyone.
- **Export compliance:** HTTPS only, so answer "uses exempt encryption" (set `ITSAppUsesNonExemptEncryption = NO`).
- **Screenshots:** iPhone 6.9", iPad (if you support iPad), Android phone, and the Play feature graphic (1024×500). Avoid F1 logos, team logos, car liveries and driver photos, which are all separate IP. Driver names, codes and team names as plain text in data are generally fine.
- **Support URL and contact email** (use a dedicated address, not your personal one).
- **App Review notes:** explain that it's an independent analytics project, where the data comes from, and that it's unaffiliated. This preempts 5.2 questions.
- **Accessibility:** Dynamic Type / font scaling, VoiceOver labels on the charts, colour contrast in both themes.

## 5. Data and legal concerns (most uncertain area)

- **Trademark notice to add:** "RI360 is unofficial and is not associated with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V." (FastF1 and OpenF1 use this same wording.)
- **FastF1 (2019–2023):** the live-timing archive now needs an F1TV login. You're redistributing processed derivatives of that data. Low risk for a free hobby app, but it's FOM's data.
- **OpenF1 (2024+):** free and unauthenticated, but I couldn't confirm a clear licence for commercial reuse. Read its LICENSE file and ask the maintainers before monetising. Also add a fallback in case it changes, rate-limits or disappears.
- **Team colours:** fine as colours. Avoid official team logos and names styled like logos.
- **Takedown risk:** even a compliant app can get a trademark complaint through Apple's dispute form. Keep the name brand-neutral so a complaint can't force a rename.
- **Monetisation:** ads or subscriptions make you a trader (EU address disclosure), weaken any "fan/educational" argument, and need ATT/consent flows. Recommendation: launch free, measure interest, and decide later.

## 6. Operations after launch

- **Updates:** decide how new races reach users (remote JSON fetch vs a release every race weekend; the second isn't sustainable). Over-the-air web-bundle updates (e.g. Capgo, Appflow Live Updates) are allowed for JS/HTML changes that don't alter the app's purpose.
- **Versioning:** `versionCode`/`CFBundleVersion` must go up with each upload; automate this in CI.
- **Crash/error reporting:** add something (Sentry etc.) before launch, and update the privacy forms to match.
- **Signing keys:** use Play App Signing; back up the upload keystore and your Apple certificates/API key somewhere safe. A lost Android upload key is painful to recover.
- **Annual Apple renewal:** if it lapses, the app disappears from the store.
- **Off-season:** F1 has a ~3-month winter break. Plan content (season reviews, strategy lab) so the app isn't dead for a quarter.

## 7. Cheaper alternative to start with

Ship as a **PWA** first (manifest + service worker via `vite-plugin-pwa`). No fees, no review, no 12-tester rule, and the daily data updates just work. Use it to gauge demand, then do the store apps once you've added the native features above. You can also put the PWA on Play through a Trusted Web Activity (Bubblewrap); it's Android-only and still needs the 12-tester test.

## Suggested order

1. Decide name, bundle ID, individual vs organisation account.
2. Fix `viewport-fit`, external links, back button; switch data to runtime fetch with bundled fallback.
3. Add push notifications for new races, plus favourites and share.
4. Write the privacy policy, trademark notice and support page.
5. Start the Google closed test (14 days) and TestFlight at the same time.
6. Submit to both stores with clear review notes.

## Sources

- Apple SDK minimum requirements: https://developer.apple.com/news/upcoming-requirements/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Store content/trademark disputes: https://www.apple.com/legal/intellectual-property/dispute-forms/app-store
- Google Play target API level: https://developer.android.com/google/play/requirements/target-sdk
- Google Play testing requirements for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Android developer verification: https://support.google.com/android-developer-console/answer/16561738
- EU trader requirements on the App Store: https://9to5mac.com/2024/08/15/app-store-eu-developers-address/ and https://techcrunch.com/2025/02/18/apple-purges-apps-without-contact-info-from-eu-app-store-as-dsa-deadline-hits
- 4.2 rejections for web-wrapper apps: https://capgo.app/blog/how-to-pass-app-store-review-2026/ and https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper
- OpenF1: https://github.com/br-g/openf1
- FastF1 disclaimer: https://docs.fastf1.dev
