/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" bundles a minimal Node server + only the deps that are
  // actually used. Electron's main process spawns this server directly
  // (see electron/main.js), which is what lets the same Next.js app -
  // API routes included - run inside a Windows desktop shell.
  output: process.env.BUILD_TARGET === "electron" ? "standalone" : undefined,
  reactStrictMode: true,
  images: {
    // Person photos may be uploaded/stored locally or point at remote URLs.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permission-Policy",
            value: "camera=(), microphone=(), geolocation-()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
