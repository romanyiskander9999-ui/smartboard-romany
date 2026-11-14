const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
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

ipcMain.handle("schoolverse:save-board-pdf", async (event, pngDataUrl) => {
  const senderUrl = event.senderFrame?.url;
  let senderOrigin = "";
  try { senderOrigin = new URL(senderUrl).origin; } catch { /* rejected below */ }
  if (!localOrigin || senderOrigin !== localOrigin) throw new Error("طلب غير مصرح به");
  if (typeof pngDataUrl !== "string" || pngDataUrl.length > 35000000) throw new Error("صورة الصفحة غير صالحة أو كبيرة جدًا");
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(pngDataUrl);
  if (!match) throw new Error("صيغة صورة PNG غير صالحة");
  const parent = BrowserWindow.fromWebContents(event.sender);
  const saveOptions = { title: "حفظ السبورة بصيغة PDF", defaultPath: path.join(app.getPath("documents"), "SchoolVerse-Board.pdf"), filters: [{ name: "PDF", extensions: ["pdf"] }] };
  const choice = parent ? await dialog.showSaveDialog(parent, saveOptions) : await dialog.showSaveDialog(saveOptions);
  if (choice.canceled || !choice.filePath) return { canceled: true };
  const html = "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'\"><style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;padding:0}img{width:100%;height:auto;object-fit:contain}</style></head><body><img src=\"data:image/png;base64," + match[1] + "\"></body></html>";
  const printWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    await printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    const pdf = await printWindow.webContents.printToPDF({ pageSize: "A4", landscape: true, printBackground: true, margins: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 } });
    await fs.promises.writeFile(choice.filePath, pdf);
    return { canceled: false, filePath: choice.filePath };
  } finally { if (!printWindow.isDestroyed()) printWindow.close(); }
});



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
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false }
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
