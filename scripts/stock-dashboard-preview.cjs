'use strict';
const http=require('http');
const service=require('../cloudfunctions/stock-tracking-live/index.js');
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4396');
 if(url.pathname==='/api/stock-tracking-live'){
  try{const r=await service.handleRequest(req.method,url,req.headers.origin||'');res.writeHead(r.statusCode,r.headers);res.end(r.body)}catch(e){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}return;
 }
 const path=url.pathname==='/stock-dashboard.html'?'/officialwebsite/stock-dashboard.html'+url.search:req.url;
 const proxy=http.request({hostname:'127.0.0.1',port:4397,path,method:req.method,headers:{...req.headers,host:'127.0.0.1:4397'}},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});
 proxy.on('error',()=>{res.writeHead(503);res.end('Start Astro dev on port 4397 first')});req.pipe(proxy);
}).listen(4396,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:4396/officialwebsite/stock-tracking/'));
