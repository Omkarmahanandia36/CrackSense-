const { app, BrowserWindow } = require('electron');
const path = require('path');

// Disable GPU disk cache to avoid Windows cache permission locks
app.commandLine.appendSwitch('disable-gpu-cache');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'CrackSense AI – Concrete Surface Inspection',
    backgroundColor: '#06141B', // Match glass dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const fs = require('fs');
  const distIndex = path.join(__dirname, '../frontend/dist/index.html');
  const isDev = Boolean(process.env.ELECTRON_START_URL);

  if (!isDev && fs.existsSync(distIndex)) {
    console.log(`Loading compiled production bundle: ${distIndex}`);
    mainWindow.loadFile(distIndex);
  } else {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    const loadWithRetry = (url, retries = 3) => {
      mainWindow.loadURL(url).catch((err) => {
        if (retries > 0) {
          console.log(`Waiting for frontend dev server at ${url}... (${retries} retries left)`);
          setTimeout(() => loadWithRetry(url, retries - 1), 1000);
        } else if (fs.existsSync(distIndex)) {
          console.log(`Vite server not detected. Loading compiled bundle: ${distIndex}`);
          mainWindow.loadFile(distIndex);
        } else {
          console.error(`Failed to load ${url}:`, err);
        }
      });
    };
    loadWithRetry(startUrl);
  }

  // Clean menu bar
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  app.quit();
});
