# Race-analysed notifications

The morning after a Grand Prix, the app can send:

> **🏁 São Paulo GP · analysed**
> Norris won from P3 on inters, softs, softs and inters. Verstappen climbed 11 places. Tap for the story.

Tapping the notification opens that race's story in the app.

## How it works

1. **In the app** (`frontend/src/lib/push.ts`): a user opts in from the prompt at the end of a story, or with the **Race analysed alerts** switch on the Stories page. The phone then subscribes to the Firebase Cloud Messaging topic `race-analysed`. There are no accounts, and RI360 keeps no list of devices.
2. **The daily data job** (`.github/workflows/update-data.yml`) commits any race it adds. It then runs `backend/data_pipeline/notify_new_races.py` with the new race ids.
3. **The script** writes the message from the race file. It waits until ri360.vercel.app serves that race, then sends one message to the topic. If a catch-up run adds several races, only the newest is announced.

Until the setup below is done:
- the app shows "Race alerts aren't available on this build yet" when someone turns alerts on;
- the workflow logs the message instead of sending it.

Nothing breaks.

## One-time setup (about 15 minutes)

### 1. Create the Firebase project
1. Go to https://console.firebase.google.com, choose **Create a project**, and name it `ri360`. Google Analytics isn't needed.
2. In the project, click **Add app → Android**:
   - **Package name:** `io.github.devarsh44.ri360` (it must match exactly)
   - **App nickname:** RI360
   - Leave the SHA-1 field empty; messaging doesn't need it.
3. Download **google-services.json** and put it at `frontend/android/app/google-services.json`.
   - It isn't a secret: it identifies the project and ends up inside the app anyway. It's fine to commit.

### 2. Let the daily job send messages
1. In Firebase, open **Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
   - **This file is a secret.** Never commit it or paste it into chat.
2. On GitHub, open the repo, then **Settings → Secrets and variables → Actions → New repository secret**:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** the entire contents of that JSON file
3. Delete the downloaded key file from your computer once it's saved.

### 3. Rebuild the app
```bash
npm run cap:sync --prefix frontend
```
Then build and install as usual. Turn on **Race analysed alerts** on the Stories page.

### 4. Send a test
To test without waiting for a race:

1. On GitHub, open **Actions → Update race data → Run workflow**. It only sends when a race was actually added.
2. Or send a one-off message from **Firebase console → Messaging → New campaign → Notifications**:
   - **Target:** topic `race-analysed`
   - **Additional options → Custom data:** `raceId` = `157`

## iPhone (later)
iPhones need an Apple Developer account ($99 a year) and an **APNs key** uploaded under **Firebase → Project settings → Cloud Messaging**. You also need `GoogleService-Info.plist` in `frontend/ios/App/App/`. The code is already cross-platform.

## Play Store
In the **Data safety** form, declare **Device or other IDs** (the push token):
- **Collected:** yes, for app functionality
- **Shared:** no
- **Optional:** yes, since users opt in

Also add one line to the privacy policy saying that turning on race alerts registers the device with Firebase Cloud Messaging to receive them.
