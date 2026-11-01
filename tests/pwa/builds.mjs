import { cp,mkdir,readFile,writeFile,readdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const workspace=process.cwd(),stamp=process.argv[2]??String(Date.now()),root=resolve('prototypes/pwa-validation/releases',stamp),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(root,{recursive:true});
const sourcePatch=spawnSync('git',['diff','--binary','HEAD','--','src','vite.config.ts','tools/pwa/build.ts','package.json','package-lock.json'],{cwd:workspace,encoding:'utf8'}).stdout;await writeFile(join(root,'source.patch'),sourcePatch);
const listed=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','src','tools/pwa','vite.config.ts','svelte.config.js','index.html','package.json','package-lock.json','public','data'],{cwd:workspace,encoding:'utf8'});if(listed.status!==0)throw Error('Source inventory failed');
const sourceFiles=[];for(const path of [...new Set(listed.stdout.split('\0').filter(Boolean))].sort()){const bytes=await readFile(join(workspace,path));sourceFiles.push({path,bytes:bytes.length,sha256:hash(bytes)});}await writeFile(join(root,'source-files.json'),JSON.stringify(sourceFiles,null,2));
const result={sourceFilesSha256:hash(JSON.stringify(sourceFiles,null,2)),sourceFilesCanonicalSha256:hash(JSON.stringify(sourceFiles)),sourceFiles,sourcePatchSha256:hash(sourcePatch),createdAt:new Date().toISOString(),sourceCommit:spawnSync('git',['rev-parse','HEAD'],{cwd:workspace,encoding:'utf8'}).stdout.trim(),variants:[]};
for(const variant of ['A','B','C']){
 let cwd=workspace;
 if(variant!=='A'){
  cwd=join(root,'source-'+variant);await mkdir(cwd,{recursive:true});
  for(const path of ['src','public','tools','data','index.html','vite.config.ts','svelte.config.js','package.json','package-lock.json','tsconfig.json','tsconfig.node.json'])await cp(join(workspace,path),join(cwd,path),{recursive:true});
  await mkdir(join(cwd,'node_modules/workbox-core'),{recursive:true});await cp(join(workspace,'node_modules/workbox-core/LICENSE'),join(cwd,'node_modules/workbox-core/LICENSE'));
  const copyPath=join(cwd,'src/lib/pwa/copy.ts'),before=await readFile(copyPath,'utf8'),after=before.replace('No new update reported.','No new update reported. Fixture '+variant+'.');
  if(before===after)throw Error('Lazy fixture patch did not apply');
  await writeFile(copyPath,after);
  const hintPath=join(cwd,'src/lib/gameplay/hint.worker.ts');await writeFile(hintPath,(await readFile(hintPath,'utf8'))+'\nconsole.info('+JSON.stringify('PWA fixture '+variant)+');\n');
  await writeFile(join(cwd,'fixture-patch.json'),JSON.stringify([{file:'src/lib/pwa/copy.ts',before:'No new update reported.',after:'No new update reported. Fixture '+variant+'.'},{file:'src/lib/gameplay/hint.worker.ts',append:'console.info('+JSON.stringify('PWA fixture '+variant)+');'}]));
 }
 const output=spawnSync(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'build'],{cwd,env:{...process.env,TOADOKU_BASE:'/toadoku/',TOADOKU_RELEASE_MARKER:variant},encoding:'utf8'});
 await writeFile(join(root,'build-'+variant+'.log'),output.stdout+'\n'+output.stderr);
 if(output.status!==0)throw Error('Fixture '+variant+' build failed: '+output.stderr);
 const destination=join(root,variant);await cp(join(cwd,'dist'),destination,{recursive:true});
 const validate=spawnSync(process.execPath,[resolve('tools/pwa/validate.mjs'),destination],{cwd:workspace,encoding:'utf8'});
 await writeFile(join(root,'validate-'+variant+'.log'),validate.stdout+'\n'+validate.stderr);
 if(validate.status!==0)throw Error('Fixture '+variant+' validation failed: '+validate.stderr);
 const release=JSON.parse(await readFile(join(destination,'release.json'),'utf8'));
 const assets={};for(const name of await readdir(join(destination,'assets')))assets[name]=hash(await readFile(join(destination,'assets',name)));
 const record={variant,cwd,destination,buildId:release.buildId,indexSha256:hash(await readFile(join(destination,'index.html'))),workerSha256:hash(await readFile(join(destination,'worker.js'))),assets};
 result.variants.push(record);console.log(JSON.stringify({variant,destination,buildId:record.buildId,workerSha256:record.workerSha256}));
}
const names=result.variants.map(v=>Object.keys(v.assets).find(name=>/^GameDialog-.*\.js$/.test(name)));
if(new Set(names).size!==3)throw Error('Fixture lazy chunks must really differ across A/B/C');
const hintNames=result.variants.map(v=>Object.keys(v.assets).find(name=>/^hint.worker-.*\.js$/.test(name)));if(new Set(hintNames).size!==3)throw Error('Unopened hint worker bytes must differ across A/B/C');
await writeFile(join(root,'fixtures.json'),JSON.stringify(result,null,2));console.log('Fixtures:'+root);
