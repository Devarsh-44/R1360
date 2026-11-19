import { Capacitor } from "@capacitor/core";
import { openStory } from "./router";

/**
 * "Race analysed" alerts, app only. Every phone that opts in subscribes to one Firebase topic; the
 * daily data workflow sends a single message to it when a new race lands (scripts in
 * backend/data_pipeline/notify_new_races.py). No accounts, and no list of devices on our side.
 */
const TOPIC = "race-analysed";
const CHANNEL = "race-analysed";
const PREF = "ri360-race-alerts";

export type AlertsChoice = "on" | "off" | "later" | null;

export const pushSupported = (): boolean => Capacitor.isNativePlatform();

export function alertsChoice(): AlertsChoice {
  try {
    return (localStorage.getItem(PREF) as AlertsChoice) ?? null;
  } catch {
    return null;
  }
}

function save(v: Exclude<AlertsChoice, null>) {
  try {
    localStorage.setItem(PREF, v);
  } catch {
    /* private mode */
  }
}

// A Capacitor plugin object can't be a promise's result (the promise would call its "then" as a
// native method), so it travels wrapped in a plain object.
const messaging = () => import("@capacitor-firebase/messaging").then((m) => ({ fm: m.FirebaseMessaging }));

/** Ask for permission (if needed) and subscribe. Resolves to what happened, so the UI can say so. */
export async function enableAlerts(): Promise<"on" | "denied" | "unavailable"> {
  if (!pushSupported()) return "unavailable";
  try {
    const { fm } = await messaging();
    let perm = await fm.checkPermissions();
    if (perm.receive !== "granted") perm = await fm.requestPermissions();
    if (perm.receive !== "granted") {
      save("off");
      return "denied";
    }
    await fm.subscribeToTopic({ topic: TOPIC });
    save("on");
    return "on";
  } catch {
    // Firebase isn't configured in this build (no google-services.json) or the device has no Play services
    return "unavailable";
  }
}

export async function disableAlerts(): Promise<void> {
  save("off");
  if (!pushSupported()) return;
  try {
    await (await messaging()).fm.unsubscribeFromTopic({ topic: TOPIC });
  } catch {
    /* nothing to undo */
  }
}

/** "Not now" on the prompt: don't ask again; the switch on the Stories page still works. */
export function snoozeAlerts() {
  save("later");
}

/** App start: open the race story when an alert is tapped, and keep an opted-in phone subscribed. */
export async function initPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const { fm } = await messaging();
    await fm.addListener("notificationActionPerformed", (e) => {
      const id = Number((e.notification.data as { raceId?: string } | undefined)?.raceId);
      if (Number.isFinite(id) && id > 0) openStory(id);
    });
    if (Capacitor.getPlatform() === "android")
      await fm.createChannel({ id: CHANNEL, name: "Race analysed", description: "A new race is in the app", importance: 4, visibility: 1 });
    if (alertsChoice() === "on" && (await fm.checkPermissions()).receive === "granted") await fm.subscribeToTopic({ topic: TOPIC });
  } catch {
    /* Firebase not configured in this build: alerts stay off */
  }
}
