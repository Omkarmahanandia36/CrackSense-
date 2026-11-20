const { contextBridge, ipcRenderer } = require('electron');
const packageJson = require('../package.json');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  electronVersion: process.versions.electron,
  appVersion: packageJson.version,
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onChecking: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('updater:checking', listener);
      return () => ipcRenderer.removeListener('updater:checking', listener);
    },
    onUpdateAvailable: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('updater:available', listener);
      return () => ipcRenderer.removeListener('updater:available', listener);
    },
    onUpdateNotAvailable: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('updater:not-available', listener);
      return () => ipcRenderer.removeListener('updater:not-available', listener);
    },
    onDownloadProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on('updater:download-progress', listener);
      return () => ipcRenderer.removeListener('updater:download-progress', listener);
    },
    onUpdateDownloaded: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('updater:downloaded', listener);
      return () => ipcRenderer.removeListener('updater:downloaded', listener);
    },
    onError: (callback) => {
      const listener = (_event, err) => callback(err);
      ipcRenderer.on('updater:error', listener);
      return () => ipcRenderer.removeListener('updater:error', listener);
    },
  },
});
