// Electron entry point for the Windows desktop build.

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const DEV_PORT = 3000;
const PROD_PORT = 4173;

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

function startProductionServer() {
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
      PORT: String(PROD_PORT),
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });
}

function setupEscapeToQuit() {
  mainWindow.webContents.on("before-input-events", (event, input) => {
    if (input.key === "Escape" && input.type === "keyDown") {
      app.quit();
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    // fullscreen: true,
    frame: true,
    backgroundColor: "#EAE3D3",
    autoHideMenuBar: true,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },

    icon: path.join(__dirname, "..", "build", "icon.ico"),
  });

  setupEscapeToQuit();

  if (app.isPackaged) {
    // Production / installed Electron app
    startProductionServer();

    await waitForServer(`http://localhost:${PROD_PORT}`);

    mainWindow.loadURL(`http://localhost:${PROD_PORT}`);
  } else {
    // Development
    await waitForServer(`http://localhost:${DEV_PORT}`);

    mainWindow.loadURL(`http://localhost:${DEV_PORT}`);
  }
}

app.whenReady().then(() => {
  createWindow().catch((error) => {
    console.error("Failed to create Electron window:", error);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
