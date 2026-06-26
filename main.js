const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const os = require('os');

const { loadAll } = require('./src/core/pluginLoader');
const toolRegistry = require('./src/core/toolRegistry');
const appStore = require('./src/core/appStore');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 640,
    backgroundColor: '#0b0e11', title: 'Soterios System Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    },
    show: false
  });
  mainWindow.loadFile(path.join(__dirname, 'src/ui/pages/shell.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const aboutHandler = () => dialog.showMessageBox(mainWindow, {
    type: 'info', title: 'About Soterios System Tools', message: 'Soterios System Tools',
    detail: `Version ${app.getVersion()}\n\nA local-first desktop toolkit for system maintenance, monitoring, and basic security checks.\n\nNo data is collected or transmitted.`,
    buttons: ['OK']
  });
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [{ label: 'About', click: aboutHandler }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }] : []),
    { label: 'File', submenu: [isMac ? { role: 'close' } : { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [...(isMac ? [] : [{ label: 'About', click: aboutHandler }]), { label: 'Quarantine Folder', click: () => shell.openPath(path.join(os.homedir(), '.soterios-quarantine')) }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  appStore.init(app.getPath('userData'));
  await loadAll();
  buildAppMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// IPC — tools
ipcMain.handle('tools:list', () => toolRegistry.list());
ipcMain.handle('tools:run', async (event, toolId, args) => {
  return toolRegistry.run(toolId, args, {
    appStore, toolRegistry,
    sendProgress: (payload) => event.sender.send(`tools:progress:${toolId}`, payload)
  });
});

// IPC — store
ipcMain.handle('store:snapshot', () => appStore.getSnapshot());
ipcMain.handle('store:settings', () => appStore.getSettings());
ipcMain.handle('store:updateSettings', (event, patch) => appStore.updateSettings(patch || {}));
ipcMain.handle('store:history', (event, kind, limit) => appStore.listHistory(kind, limit));
ipcMain.handle('store:quarantine', () => appStore.listQuarantine());

// IPC — dialogs
ipcMain.handle('dialog:pickFolder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return r.canceled || !r.filePaths.length ? null : r.filePaths[0];
});
ipcMain.handle('dialog:pickFiles', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'] });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('shell:showItemInFolder', (event, filePath) => shell.showItemInFolder(filePath));
