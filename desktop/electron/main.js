const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Disable GPU disk cache to avoid Windows cache permission locks
app.commandLine.appendSwitch('disable-gpu-cache');

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let mainWindow = null;

function setupAutoUpdater(win) {
  autoUpdater.on('checking-for-update', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:available', {
        version: info.version,
        releaseNotes: info.releaseNotes || null,
        releaseDate: info.releaseDate || null,
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:not-available', {
        version: info?.version || null,
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:download-progress', {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || null,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:error', {
        message: err.message || 'Auto-update error occurred',
      });
    }
  });

  // Check on launch (after window loads) and every 6 hours; skip in development
  const isDev = !app.isPackaged || Boolean(process.env.ELECTRON_START_URL);
  if (!isDev) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
          console.warn('Initial update check notice:', err.message);
        });
      }, 3500);
    });

    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('Periodic update check notice:', err.message);
      });
    }, SIX_HOURS_MS);
  }
}

// IPC Handlers for updater requests
ipcMain.handle('updater:check', async () => {
  const isDev = !app.isPackaged || Boolean(process.env.ELECTRON_START_URL);
  if (isDev && !process.env.FORCE_UPDATE_CHECK) {
    return { skipped: true, reason: 'development' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:install', () => {
  // Never install silently: quits and executes installer with UI
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
  if (url && typeof url === 'string') {
    return shell.openExternal(url);
  }
});

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, '../build/icon.ico'))
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'CrackSense AI – Concrete Surface Inspection',
    icon: iconPath,
    backgroundColor: '#06141B', // Match glass dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

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

  // Setup auto updater hooks
  setupAutoUpdater(mainWindow);
}

app.whenReady().then(() => {
  // Explicitly permit camera / media access for live snapshot capture
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        return callback(true);
      }
      callback(false);
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      return permission === 'media';
    });
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  // App cleanup
});

app.on('window-all-closed', function () {
  app.quit();
});
