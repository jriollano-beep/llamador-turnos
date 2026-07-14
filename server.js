const http = require("http");
const zlib = require("zlib");

const PORT = process.env.PORT || 3000;
const clientes = new Set();

// Memoria: qué número de caja tiene cada iPad (por su ID de dispositivo)
const cajas = {};

const HTML_DISPLAY = zlib.gunzipSync(Buffer.from("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", "base64")).toString("utf8");
const HTML_CAJA = zlib.gunzipSync(Buffer.from("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", "base64")).toString("utf8");

function enviarHTML(res, html) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
function json(res, code, obj) {
  res.writeHead(code, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function broadcast(msg) {
  const data = "data: " + JSON.stringify(msg) + "\n\n";
  for (const res of clientes) { try { res.write(data); } catch (e) { clientes.delete(res); } }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const p = url.pathname;

  if (p === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
    res.write("retry: 2000\n\n");
    res.write(": ok\n\n");
    clientes.add(res);
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (e) {} }, 25000);
    req.on("close", () => { clearInterval(ping); clientes.delete(res); });
    return;
  }

  if (p === "/health") { res.writeHead(200, { "Access-Control-Allow-Origin": "*" }); return res.end("ok"); }

  if (p === "/config") {
    const device = String(url.searchParams.get("device") || "").trim();
    const caja = String(url.searchParams.get("caja") || "").trim();
    if (!device || !caja) return json(res, 400, { ok: false, error: "faltan device o caja" });
    cajas[device] = caja;
    console.log("Config: dispositivo " + device + " -> Caja " + caja);
    return json(res, 200, { ok: true, caja });
  }

  if (p === "/call") {
    let caja = String(url.searchParams.get("caja") || "").trim();
    const device = String(url.searchParams.get("device") || "").trim();
    if (!caja && device) caja = cajas[device] || "";
    if (!caja) return json(res, 200, { ok: false, sinConfigurar: true });
    broadcast({ tipo: "llamar", caja });
    console.log("Llamado -> Caja " + caja);
    return json(res, 200, { ok: true, caja, pantallas: clientes.size });
  }

  if (p === "/" || p === "/display") return enviarHTML(res, HTML_DISPLAY);
  if (p === "/caja") return enviarHTML(res, HTML_CAJA);
  res.writeHead(404); res.end("No encontrado");
});

server.listen(PORT, () => console.log("Llamador de turnos ACTIVO en el puerto " + PORT));
