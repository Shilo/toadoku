import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test');
const [label='baseline',root='prototypes/pwa-validation/baseline-ecc8c30',repetitionsText='3']=process.argv.slice(2);
const repetitions=Number(repetitionsText), dir=resolve('prototypes/pwa-validation/performance',label);
await mkdir(dir,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventory={};
for(const name of await readdir(resolve(root,'assets')))inventory[name]=hash(await readFile(resolve(root,'assets',name)));
const host=await staticHost({root,port:5197,shaping:{latencyMs:150,bytesPerSecond:200000}}), samples=[];
host.state.catalogRoot=resolve('public');
try {
for(let sample=0;sample<repetitions;sample++){
  const profile=resolve(dir,'profile-'+sample+'-'+Date.now());
  const context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:360,height:800},deviceScaleFactor:3});
  const page=context.pages()[0],cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  // Aggregate server response shaping covers page and service-worker requests alike.
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const network=[],received=[],pending=new Map();
  cdp.on('Network.dataReceived',e=>received.push({requestId:e.requestId,timestamp:e.timestamp,dataLength:e.dataLength,encodedDataLength:e.encodedDataLength}));
  cdp.on('Network.requestWillBeSent',e=>pending.set(e.requestId,{url:e.request.url,type:e.type,start:e.timestamp,wallTime:e.wallTime}));
  cdp.on('Network.loadingFinished',e=>{const r=pending.get(e.requestId);if(r)network.push({...r,encodedDataLength:e.encodedDataLength,end:e.timestamp});});
  await page.addInitScript(()=>{
    window.__pwaPerf={longTasks:[],input:[]};
    const pending=new Set();
    const hasGeometry=element=>!!element&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
    const candidate=kind=>{
      if(document.hidden||document.querySelector('dialog[open]'))return false;
      if(kind==='usefulMenu')return !!document.querySelector('.menu-more:not(:disabled)');
      const keys=[...document.querySelectorAll('.dock button')];
      return document.querySelectorAll('.cell').length===81&&keys.length===10&&keys.every(key=>!key.disabled)&&!document.querySelector('.concealed');
    };
    const observer=new MutationObserver(checkReady);
    function checkReady(){
      for(const kind of ['usefulMenu','usefulBoard']){
        if(window.__pwaPerf[kind]!==undefined||pending.has(kind)||!candidate(kind))continue;
        pending.add(kind);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          pending.delete(kind);
          const target=document.querySelector(kind==='usefulMenu'?'.menu-more':'.board');
          if(candidate(kind)&&hasGeometry(target))window.__pwaPerf[kind]=performance.now();
          if(window.__pwaPerf.usefulMenu!==undefined&&window.__pwaPerf.usefulBoard!==undefined)observer.disconnect();
        }));
      }
    }
    observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class','hidden']});
    checkReady();

    try{new PerformanceObserver(list=>window.__pwaPerf.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});}catch{}
    addEventListener('keydown',e=>{if(e.isTrusted&&/^[1-9]$/.test(e.key)){const start=performance.now(),delay=Math.max(0,start-e.timeStamp);requestAnimationFrame(()=>window.__pwaPerf.input.push({delay,paint:performance.now()-start}));}},true);
  });
  const requestStart=host.state.requests.length;
  await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});
  const menuMore=page.locator('.menu-more');
  await page.waitForFunction(()=>window.__pwaPerf?.usefulMenu!==undefined);
  const menuMs=await page.evaluate(()=>window.__pwaPerf.usefulMenu),menuRequests=host.state.requests.slice(requestStart).map(e=>({...e}));
  await page.getByRole('button',{name:'Quick Play',exact:true}).click();
  await page.getByRole('button',{name:'Easy',exact:true}).click();
  await page.waitForFunction(()=>window.__pwaPerf?.usefulBoard!==undefined);
  const boardMs=await page.evaluate(()=>window.__pwaPerf.usefulBoard),boardRequests=host.state.requests.slice(requestStart).map(e=>({...e}));
  const first=page.locator('[data-clue="false"]').first();
  for(let i=0;i<20;i++)await first.press(String(i%2+1));
  await page.waitForFunction(()=>window.__pwaPerf.input.length===20);
  const perf=await page.evaluate(()=>({...window.__pwaPerf,controller:navigator.serviceWorker?.controller?.scriptURL??null,timeOrigin:performance.timeOrigin,heap:performance.memory?.usedJSHeapSize,resources:performance.getEntriesByType('resource').map(e=>({name:e.name,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,start:e.startTime,duration:e.duration}))}));
  const completeBy=ms=>network.filter(r=>(r.end-r.start+r.wallTime)*1000<=perf.timeOrigin+ms);
  const completedToMenu=completeBy(menuMs),completedToBoard=completeBy(boardMs);
  const documentRequest=network.find(r=>r.type==='Document');
  const receivedBy=ms=>received.filter(e=>documentRequest&&(e.timestamp-documentRequest.start+documentRequest.wallTime)*1000<=perf.timeOrigin+ms);
  const receivedToMenu=receivedBy(menuMs),receivedToBoard=receivedBy(boardMs);
  const repeatStart=host.state.requests.length;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__pwaPerf?.usefulMenu!==undefined);
  const repeatMenuMs=await page.evaluate(()=>window.__pwaPerf.usefulMenu);
  await page.getByRole('button',{name:'Quick Play',exact:true}).click();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.waitForFunction(()=>window.__pwaPerf?.usefulBoard!==undefined);
  const repeatBoardMs=await page.evaluate(()=>window.__pwaPerf.usefulBoard);const repeatController=await page.evaluate(()=>navigator.serviceWorker?.controller?.scriptURL??null);
  samples.push({sample,menuMs,boardMs,menuRequests,boardRequests,completedToMenu,completedToBoard,receivedToMenu,receivedToBoard,perf,network,received,repeat:{menuMs:repeatMenuMs,boardMs:repeatBoardMs,controller:repeatController,scenario:'Early same-profile reload before optional shell setup; may be uncontrolled',requests:host.state.requests.slice(repeatStart).map(e=>({...e}))},browserVersion:context.browser().version()});
  console.log(JSON.stringify({label,sample,menuMs,boardMs,completedEncodedToBoard:completedToBoard.reduce((n,e)=>n+e.encodedDataLength,0),receivedBodyToBoard:receivedToBoard.reduce((n,e)=>n+e.encodedDataLength,0),repeatMenuMs,repeatBoardMs,serverWrittenToBoard:boardRequests.reduce((n,e)=>n+(e.sentBodyBytes??0),0),serverFullBodiesRequestedToBoard:boardRequests.reduce((n,e)=>n+e.bodyBytes,0),logicalToBoard:boardRequests.reduce((n,e)=>n+e.logicalBytes,0),maxLongTask:Math.max(0,...perf.longTasks.map(e=>e.duration)),inputP95:[...perf.input].sort((a,b)=>a.delay-b.delay)[18]}));
  await writeFile(resolve(dir,'results.partial.json'),JSON.stringify({label,root:resolve(root),samples},null,2));
  await context.close();
}

}finally{await host.close();}
await writeFile(resolve(dir,'results.json'),JSON.stringify({label,root:resolve(root),conditions:{readiness:'Page-side visible/enabled DOM plus two animation frames, conservative paint proxy, not compositor instrumentation',latency:150,downloadBytesPerSecond:200000,cpuThrottle:4,compression:'gzip when smaller; aggregate actual server response-body shaping; headers not rate-limited; CPU4x page only; not Pages/mobile evidence',samples:repetitions},indexSha256:hash(await readFile(resolve(root,'index.html'))),assets:inventory,samples},null,2));
