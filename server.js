const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const clientes = new Set();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("retry: 2000\n\n");
    res.write(": conectado\n\n");
    clientes.add(res);
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (e) {} }, 25000);
    req.on("close", () => { clearInterval(ping); clientes.delete(res); });
    return;
  }

  if (pathname === "/health") {
    res.writeHead(200, { "Access-Control-Allow-Origin": "*" });
    return res.end("ok");
  }

  if (pathname === "/call") {
    const caja = String(url.searchParams.get("caja") || "").trim();
    if (!caja) {
      res.writeHead(400, { "Access-Control-Allow-Origin": "*" });
      return res.end("Falta el parametro caja. Ej: /call?caja=3");
    }
    broadcast({ tipo: "llamar", caja });
    console.log("Llamado -> Caja " + caja + " (" + clientes.size + " pantalla/s)");
    res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, caja, pantallas: clientes.size }));
  }

  let file;
  if (pathname === "/" || pathname === "/display") file = "display.html";
  else if (pathname === "/caja") file = "caja.html";
  else file = pathname.replace(/^\//, "");

  const base = path.basename(file);
  const candidatos = [path.join(PUBLIC_DIR, base), path.join(__dirname, base)];
  const filePath = candidatos.find((p) => fs.existsSync(p));
  if (!filePath) {
    res.writeHead(404);
    return res.end("No encontrado");
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

function broadcast(msg) {
  const data = "data: " + JSON.stringify(msg) + "\n\n";
  for (const res of clientes) {
    try { res.write(data); } catch (e) { clientes.delete(res); }
  }
}

server.listen(PORT, () => {
  console.log("Llamador de turnos ACTIVO en el puerto " + PORT);
});
