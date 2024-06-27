const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile('index.html');

  // Enable touch events
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('DOMContentLoaded', () => {
        document.body.style.touchAction = 'manipulation';
      });
    `);
  });

  // Handle cookies better on iOS
  session.defaultSession.cookies.set({
    url: 'http://yourappurl.com',
    name: 'cookieName',
    value: 'cookieValue',
    domain: 'yourappurl.com',
    secure: true,
    sameSite: 'no_restriction'
  }).then(() => {
    console.log('Cookie set successfully');
  }).catch((error) => {
    console.error('Error setting cookie', error);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
