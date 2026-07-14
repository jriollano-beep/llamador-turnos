const http=require("http");
const fs=require("fs");
const path=require("path");
const zlib=require("zlib");

const PORT=process.env.PORT||3000;
const clientes=new Set();
const cajas={}; // ID de dispositivo -> numero de caja

const HTML_DISPLAY=zlib.gunzipSync(Buffer.from("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","base64")).toString("utf8");
const HTML_CAJA=zlib.gunzipSync(Buffer.from("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","base64")).toString("utf8");

const MIME={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",".css":"text/css",".js":"text/javascript",".html":"text/html; charset=utf-8"};

function enviarHTML(res,html){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(html);}
function json(res,code,obj){res.writeHead(code,{"Access-Control-Allow-Origin":"*","Content-Type":"application/json"});res.end(JSON.stringify(obj));}
function broadcast(msg){const d="data: "+JSON.stringify(msg)+"\n\n";for(const r of clientes){try{r.write(d);}catch(e){clientes.delete(r);}}}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://"+req.headers.host);
  const p=url.pathname;

  if(p==="/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive","Access-Control-Allow-Origin":"*"});
    res.write("retry: 2000\n\n");res.write(": ok\n\n");clientes.add(res);
    const ping=setInterval(()=>{try{res.write(": ping\n\n");}catch(e){}},25000);
    req.on("close",()=>{clearInterval(ping);clientes.delete(res);});
    return;
  }
  if(p==="/health"){res.writeHead(200,{"Access-Control-Allow-Origin":"*"});return res.end("ok");}

  if(p==="/config"){
    const device=String(url.searchParams.get("device")||"").trim();
    const caja=String(url.searchParams.get("caja")||"").trim();
    if(!device||!caja)return json(res,400,{ok:false,error:"faltan device o caja"});
    cajas[device]=caja;console.log("Config: "+device+" -> Caja "+caja);
    return json(res,200,{ok:true,caja});
  }

  if(p==="/call"){
    let caja=String(url.searchParams.get("caja")||"").trim();
    const device=String(url.searchParams.get("device")||"").trim();
    if(!caja&&device)caja=cajas[device]||"";
    if(!caja)return json(res,200,{ok:false,sinConfigurar:true});
    broadcast({tipo:"llamar",caja});console.log("Llamado -> Caja "+caja);
    return json(res,200,{ok:true,caja,pantallas:clientes.size});
  }

  if(p==="/"||p==="/display")return enviarHTML(res,HTML_DISPLAY);
  if(p==="/caja")return enviarHTML(res,HTML_CAJA);

  const base=path.basename(p);
  for(const dir of [path.join(__dirname,"public"),__dirname]){
    const fp=path.join(dir,base);
    if(base && fs.existsSync(fp) && fs.statSync(fp).isFile()){
      res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream","Cache-Control":"public, max-age=86400"});
      return fs.createReadStream(fp).pipe(res);
    }
  }
  res.writeHead(404);res.end("No encontrado");
});

server.listen(PORT,()=>console.log("Llamador de turnos ACTIVO en el puerto "+PORT));
