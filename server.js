const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const clientes = new Set();
const cajas = {}; // ID de dispositivo -> numero de caja

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".css": "text/css", ".js": "text/javascript",
};

function json(res, code, obj) {
  res.writeHead(code, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function broadcast(msg) {
  const d = "data: " + JSON.stringify(msg) + "\n\n";
  for (const r of clientes) { try { r.write(d); } catch (e) { clientes.delete(r); } }
}
function servirArchivo(res, file) {
  const base = path.basename(file);
  for (const dir of [path.join(__dirname, "public"), __dirname]) {
    const fp = path.join(dir, base);
    if (base && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
      return fs.createReadStream(fp).pipe(res);
    }
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

  if (p === "/" || p === "/display") return servirArchivo(res, "display.html");
  if (p === "/caja") return servirArchivo(res, "caja.html");
  return servirArchivo(res, p);
});

server.listen(PORT, () => console.log("Llamador de turnos ACTIVO en el puerto " + PORT));
