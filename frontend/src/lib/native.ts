import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

/**
 * Glue that only runs inside the iOS/Android app (a no-op on the website):
 * - external links open in the system browser instead of inside the app
 * - Android's back button goes back a page, and leaves the app on the overview
 * - status bar icons follow the paper (light) / pit wall (dark) theme
 */
// a full-screen layer (a story card, the intro) can set the status bar for its own background
let barOverride: boolean | null = null;
let syncBars: () => void = () => undefined;

/** Status-bar icons for what is on screen: true = a dark background (light icons), null = follow the theme. */
export function setStatusBarDark(dark: boolean | null): void {
  barOverride = dark;
  syncBars();
}

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native");

  const [{ Browser }, { App }] = await Promise.all([import("@capacitor/browser"), import("@capacitor/app")]);

  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !/^https?:/i.test(a.href) || new URL(a.href).origin === window.location.origin) return;
    e.preventDefault();
    void Browser.open({ url: a.href });
  });

  void App.addListener("backButton", ({ canGoBack }) => {
    const atHome = window.location.hash.replace(/^#\/?/, "") === "";
    if (canGoBack && !atHome) window.history.back();
    else void App.exitApp();
  });

  syncBars = () => {
    const dark = barOverride ?? document.documentElement.dataset.theme === "pit";
    void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  };
  syncBars();
  new MutationObserver(syncBars).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

export const isNative = (): boolean => Capacitor.isNativePlatform();

type Buzz = "tap" | "step" | "success";
let hapticsMod: Promise<typeof import("@capacitor/haptics")> | null = null;

/** A short vibration inside the app; does nothing on the website. */
export function haptic(kind: Buzz = "tap"): void {
  if (!Capacitor.isNativePlatform()) return;
  hapticsMod ??= import("@capacitor/haptics");
  void hapticsMod
    .then(({ Haptics, ImpactStyle, NotificationType }) =>
      kind === "success" ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: kind === "step" ? ImpactStyle.Medium : ImpactStyle.Light }),
    )
    .catch(() => undefined);
}
