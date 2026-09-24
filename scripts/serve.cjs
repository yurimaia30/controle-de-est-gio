const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public');
http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const target=file===root?path.join(root,'index.html'):file;
  const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.pdf':'application/pdf','.json':'application/json','.jpg':'image/jpeg'};
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end('Não encontrado');}res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
