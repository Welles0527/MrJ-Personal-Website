'use strict';
const http=require('http');
// Local-only transport uses Python's existing system proxy support.
// Production cloud function continues to use native fetch.
const nativeFetch=global.fetch;
const execFile=require('util').promisify(require('child_process').execFile);
global.fetch=async(url,options)=>{
 if(new URL(url).hostname.endsWith('.eastmoney.com')){
  const program="import sys,urllib.request; r=urllib.request.urlopen(urllib.request.Request(sys.argv[1],headers={'User-Agent':'Mozilla/5.0'}),timeout=20);sys.stdout.buffer.write(r.read())";
  let stdout;try { ({stdout}=await execFile('python',['-c',program,String(url)],{encoding:'buffer',maxBuffer:8*1024*1024,timeout:25000,windowsHide:true,signal:options?.signal})); } catch { throw Error('行情源分页连接中断'); }
  return new Response(stdout,{status:200});
 }
 return nativeFetch(url,options);
};
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
