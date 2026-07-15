const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const clientes = new Set();
const cajas = {}; // ID de dispositivo -> numero de caja
const VIDEOS_DIR = path.join(__dirname, "videos");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".css": "text/css", ".js": "text/javascript",
  ".mp4": "video/mp4", ".webm": "video/webm",
};

function json(res, code, obj) {
  res.writeHead(code, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function broadcast(msg) {
  const d = "data: " + JSON.stringify(msg) + "\n\n";
  for (const r of clientes) { try { r.write(d); } catch (e) { clientes.delete(r); } }
}

// Sirve un archivo con soporte de "Range" (necesario para video)
function serveFile(req, res, fp) {
  const stat = fs.statSync(fp);
  const type = MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (isNaN(start) || isNaN(end) || start > end || start >= stat.size) {
      res.writeHead(416, { "Content-Range": "bytes */" + stat.size }); return res.end();
    }
    res.writeHead(206, { "Content-Type": type, "Content-Range": "bytes " + start + "-" + end + "/" + stat.size, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    return fs.createReadStream(fp, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
  return fs.createReadStream(fp).pipe(res);
}
function servirEnRaiz(req, res, ruta) {
  const rel = decodeURIComponent(ruta).replace(/^\/+/, "");
  if (rel.includes("..")) { res.writeHead(404); return res.end("No encontrado"); }
  for (const dir of [__dirname, path.join(__dirname, "public")]) {
    const fp = path.join(dir, rel);
    if (rel && fp.startsWith(dir) && fs.existsSync(fp) && fs.statSync(fp).isFile()) return serveFile(req, res, fp);
  }
  res.writeHead(404); res.end("No encontrado");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const p = url.pathname;

  if (p === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
    res.write("retry: 2000\n\n"); res.write(": ok\n\n"); clientes.add(res);
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (e) {} }, 25000);
    req.on("close", () => { clearInterval(ping); clientes.delete(res); });
    return;
  }
  if (p === "/health") { res.writeHead(200, { "Access-Control-Allow-Origin": "*" }); return res.end("ok"); }

  if (p === "/config") {
    const device = String(url.searchParams.get("device") || "").trim();
    const caja = String(url.searchParams.get("caja") || "").trim();
    if (!device || !caja) return json(res, 400, { ok: false, error: "faltan device o caja" });
    cajas[device] = caja; console.log("Config: " + device + " -> Caja " + caja);
    return json(res, 200, { ok: true, caja });
  }

  if (p === "/call") {
    let caja = String(url.searchParams.get("caja") || "").trim();
    const device = String(url.searchParams.get("device") || "").trim();
    if (!caja && device) caja = cajas[device] || "";
    if (!caja) return json(res, 200, { ok: false, sinConfigurar: true });
    broadcast({ tipo: "llamar", caja }); console.log("Llamado -> Caja " + caja);
    return json(res, 200, { ok: true, caja, pantallas: clientes.size });
  }

  // Lista automatica de todos los videos de la carpeta /videos
  if (p === "/videos.json") {
    let lista = [];
    try {
      if (fs.existsSync(VIDEOS_DIR)) {
        lista = fs.readdirSync(VIDEOS_DIR)
          .filter(f => /\.(mp4|webm)$/i.test(f))
          .sort()
          .map(f => "/videos/" + encodeURIComponent(f));
      }
    } catch (e) {}
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(lista));
  }

  // Servir cada archivo de video
  if (p.startsWith("/videos/")) {
    const fp = path.join(VIDEOS_DIR, path.basename(decodeURIComponent(p)));
    if (fp.startsWith(VIDEOS_DIR) && fs.existsSync(fp) && fs.statSync(fp).isFile()) return serveFile(req, res, fp);
    res.writeHead(404); return res.end("No encontrado");
  }

  if (p === "/" || p === "/display") return servirEnRaiz(req, res, "display.html");
  if (p === "/caja") return servirEnRaiz(req, res, "caja.html");
  return servirEnRaiz(req, res, p);
});

server.listen(PORT, () => console.log("Llamador de turnos ACTIVO en el puerto " + PORT));
