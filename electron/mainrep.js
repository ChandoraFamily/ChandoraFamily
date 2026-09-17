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
  const serverEntry = path.join(
    __dirname,
    "..",
    ".next",
    "standalone",
    "server.js",
  );
  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
    },
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
