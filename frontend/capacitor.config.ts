import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor turns the built website (dist/) into the iOS and Android apps.
// appId is the app's permanent store identity: it can't change after the first upload.
const config: CapacitorConfig = {
  appId: "io.github.devarsh44.ri360",
  appName: "RI360",
  webDir: "dist",
  plugins: {
    SystemBars: {
      // Android: draw edge to edge and expose --safe-area-inset-* to CSS.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
