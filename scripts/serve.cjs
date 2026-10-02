const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'..','preview.html');
http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/preview.html'){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+(process.env.PORT||4173)));
