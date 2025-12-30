import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;

function startServer() {
    const isDev = !app.isPackaged;
    let scriptPath;

    if (isDev) {
        scriptPath = path.join(__dirname, '../server/index.js');
    } else {
        // In production, also use relative path (bundled in asar)
        scriptPath = path.join(__dirname, '../server/index.js');
    }

    // Ensure DB persists in AppData
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'financial.db');

    console.log('Starting server at:', scriptPath);
    console.log('Database path:', dbPath);

    if (fs.existsSync(scriptPath)) {
        serverProcess = fork(scriptPath, [], {
            env: { ...process.env, DB_PATH: dbPath, PORT: 3002 }
        });

        serverProcess.on('message', (msg) => {
            console.log('Server message:', msg);
        });

        serverProcess.on('error', (err) => {
            console.error('Server failed to start:', err);
        });
    } else {
        console.error('Server script not found at:', scriptPath);
    }
}

function createWindow() {
    // ... existing createWindow code ...
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true, // Hide menu bar for cleaner look
        titleBarStyle: 'default',
        backgroundColor: '#ffffff'
    });

    // Determine if we are in development or production
    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:5177');
        // Open DevTools in development
        // win.webContents.openDevTools();
        console.log('Running in Development Mode');
    } else {
        // In production, load the index.html from the dist folder
        // Adjust logic to find dist entry relative to this file
        // Assuming main.js is in /electron/, and dist is in root /dist/
        win.loadFile(path.join(__dirname, '../dist/index.html'));
        console.log('Running in Production Mode');
    }
}

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (serverProcess) serverProcess.kill();
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) serverProcess.kill();
});
