import type { CapacitorConfig } from "@capacitor/cli";

// Android can't run a Node.js server on-device the way Electron does on
// Windows, so the standard approach (and the one used here) is: deploy this
// Next.js app - API routes included - to a host (Vercel, Render, your own
// Node server, etc.), then have Capacitor's WebView load that live URL.
// Swap `server.url` for your production domain before building the APK.
// During development, point it at your machine's LAN IP so a physical
// device or emulator can reach `next dev`.
const config: CapacitorConfig = {
  appId: "com.lineage.app",
  appName: "Lineage",
  webDir: "out", // unused when server.url is set, but required by the CLI
  server: {
    url: "http://192.168.1.6:3000/",
    // This address is only for local Android testing. Use a deployed HTTPS
    // address before distributing an APK.
    cleartext: true,
  },
  android: {
    backgroundColor: "#EAE3D3",
    webContentsDebuggingEnabled: true,
    allowMixedContent: true,
  },
};

export default config;
