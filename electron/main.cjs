const { app, BrowserWindow, shell, Menu } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(app.getAppPath());
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};
let localServer;
let localOrigin;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); }
      catch { res.writeHead(400).end("Bad request"); return; }
      if (pathname === "/") pathname = "/index.html";
      const target = path.resolve(ROOT, "." + pathname);
      if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
        res.writeHead(403).end("Forbidden"); return;
      }
      fs.stat(target, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found"); return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        });
        fs.createReadStream(target).pipe(res);
      });
    });
    localServer.once("error", reject);
    localServer.listen(41737, "127.0.0.1", () => {
      localOrigin = "http://127.0.0.1:" + localServer.address().port;
      resolve(localOrigin);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 650,
    show: false, autoHideMenuBar: true, backgroundColor: "#eef2f8",
    title: "SchoolVerse SuperBoard",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false }
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== localOrigin) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  win.loadURL(localOrigin);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startLocalServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(error => {
  console.error("SchoolVerse startup failed:", error);
  app.quit();
});
app.on("before-quit", () => { if (localServer) localServer.close(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
