import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Strict static production host; optional aggregate shaping includes worker fetches. */
export async function staticHost({root,port=5197,base='/toadoku/',shaping}) {
  const state={root:resolve(root),requests:[],fault:undefined,offline:false,fixtures:{},catalogRoot:undefined};
  const sending=[];let tokens=0,last=performance.now();
  const pump=shaping?setInterval(()=>{
    const now=performance.now();tokens=Math.min(8192,tokens+(now-last)*shaping.bytesPerSecond/1000);last=now;
    let checked=0;
    while(tokens>=1&&sending.length&&checked<sending.length){
      const item=sending.shift();
      if(item.res.destroyed){continue;}
      if(item.blocked){sending.push(item);checked++;continue;}
      checked=0;const count=Math.min(8192,Math.floor(tokens),item.body.length-item.offset);
      const accepted=item.res.write(item.body.subarray(item.offset,item.offset+count));item.offset+=count;tokens-=count;item.entry.sentBodyBytes+=count;
      if(item.offset===item.body.length){item.entry.end=performance.now();item.res.end();continue;}
      if(!accepted){item.blocked=true;item.res.once('drain',()=>item.blocked=false);}
      sending.push(item);
    }
    if(!sending.length)tokens=0;
  },10):undefined;
  const server=createServer(async(req,res)=>{
    const start=performance.now(),url=new URL(req.url,'http://fixture.invalid'),pathname=decodeURIComponent(url.pathname);
    const entry={path:pathname,start,logicalBytes:0,bodyBytes:0,sentBodyBytes:0,status:0,encoding:'identity'};state.requests.push(entry);res.once('close',()=>{entry.closed=true;entry.closedAt=performance.now();});
    const end=(status,body=Buffer.alloc(0),headers={})=>{
      entry.status=status;entry.bodyBytes=body.length;
      const send=()=>{
        if(res.destroyed){entry.end=performance.now();return;}
        res.writeHead(status,headers);
        if(shaping&&body.length){sending.push({res,entry,body,offset:0,blocked:false});}
        else{entry.sentBodyBytes=body.length;entry.end=performance.now();res.end(body);}
      };
      if(shaping)setTimeout(send,shaping.latencyMs);else send();
    };
    if(state.offline){req.socket.destroy();entry.status=0;entry.end=performance.now();return;}
    const fixture=state.fixtures[pathname];if(fixture){const body=Buffer.from(fixture.body);entry.logicalBytes=body.length;end(200,body,{'Content-Type':fixture.mime});return;}
    if(pathname===base.slice(0,-1)){end(301,Buffer.alloc(0),{Location:base+url.search});return;}
    if(!pathname.startsWith(base)){end(404);return;}
    const relative=pathname.slice(base.length)||'index.html';
    const selectedRoot=state.catalogRoot&&relative.startsWith('catalog/')?resolve(state.catalogRoot):state.root;
    const path=resolve(selectedRoot,relative);
    if(!path.startsWith(selectedRoot+sep)){end(403);return;}
    try{
      let bytes=await readFile(path);entry.logicalBytes=bytes.length;const fault=state.fault?.(pathname,bytes);
      if(fault?.wait)await fault.wait;
      if(fault?.status){end(fault.status,Buffer.from(fault.body??''),{'Content-Type':fault.mime??'text/plain'});return;}
      if(fault?.bytes)bytes=Buffer.from(fault.bytes);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
      const headers={'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-cache','ETag':'"fixture-'+bytes.length+'"','X-Pwa-Fixture':'local-simulated-host'};
      if(/gzip/.test(req.headers['accept-encoding']??'')){const compressed=gzipSync(bytes);if(compressed.length<bytes.length){bytes=compressed;headers['Content-Encoding']='gzip';entry.encoding='gzip';}}
      end(200,bytes,headers);
    }catch{end(404);}
  });
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
  return {state,origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(done=>{if(pump)clearInterval(pump);server.close(done);})};
}
