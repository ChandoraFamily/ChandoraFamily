// Electron entry point for the Windows desktop build.
//
// Because this app has real API routes (not just static pages), we can't
// ship it as static HTML. Instead we bundle the Next.js "standalone" server
// (see next.config.js -> output: 'standalone') and run it as a child Node
// process on a local port, then point a normal BrowserWindow at it. From
// the user's point of view it behaves like a native desktop app; under the
// hood it's the same Next.js app that runs on the web.

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const PORT = 4173;
let serverProcess;
let mainWindow;

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("Timed out waiting for the local server."));
          } else {
            setTimeout(check, 300);
          }
        });
    };
    check();
  });
}

function startServer() {
  // The Next.js "standalone" build outputs a self-contained server.js.
  const serverEntry = path.join(
    __dirname,
    "..",
    ".next",
    "standalone",
    "server.js",
  );
  serverProcess = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: "inherit",
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#EAE3D3",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "..", "build", "icon.ico"),
  });

  await waitForServer(`http://localhost:${PORT}`);
  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
