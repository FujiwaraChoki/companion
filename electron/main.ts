import { app, BrowserWindow, nativeImage, nativeTheme } from "electron";
import path from "node:path";
import { findAvailablePort } from "./port-finder.js";
import { startBunServer, stopBunServer } from "./bun-server.js";
import { buildMenu } from "./menu.js";

let mainWindow: BrowserWindow | null = null;
let serverPort: number | null = null;

// Determine app root — works both in dev and packaged
function getAppRoot(): string {
  if (app.isPackaged) {
    // In packaged app, resources are in app.asar (unpacked for server files)
    return path.join(process.resourcesPath, "app.asar.unpacked");
  }
  return path.join(__dirname, "..");
}

async function createWindow(): Promise<void> {
  const devUrl = process.env.ELECTRON_DEV_URL;
  let loadUrl: string;

  if (devUrl) {
    // Dev mode — bun run dev is already running externally, just point at Vite
    loadUrl = devUrl;
    console.log(`[electron] Dev mode — loading ${devUrl}`);
  } else {
    // Production mode — spawn our own bun server
    const appRoot = getAppRoot();
    serverPort = await findAvailablePort();
    await startBunServer(serverPort, appRoot);
    loadUrl = `http://127.0.0.1:${serverPort}`;
  }

  buildMenu();

  // Set the dock/window icon based on system theme
  const buildDir = path.join(__dirname, "..", "build");
  function getAppIcon() {
    const variant = nativeTheme.shouldUseDarkColors ? "icon-dark.png" : "icon-light.png";
    return nativeImage.createFromPath(path.join(buildDir, variant));
  }

  const appIcon = getAppIcon();
  if (process.platform === "darwin" && app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  // Update dock icon when system theme changes
  nativeTheme.on("updated", () => {
    const newIcon = getAppIcon();
    if (process.platform === "darwin" && app.dock && !newIcon.isEmpty()) {
      app.dock.setIcon(newIcon);
    }
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 500,
    icon: appIcon.isEmpty() ? undefined : appIcon,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(loadUrl);

  if (devUrl) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  stopBunServer();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  stopBunServer();
});
