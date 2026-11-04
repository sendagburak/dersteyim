const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
test('desktop backend starts on loopback, answers, and shuts down without opening a browser',async()=>{
 const {startBackend}=require('../desktop/backend-process.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dersteyim-window-'));
 let service;
 try{service=await startBackend({nodeBinary:process.execPath,root:path.resolve(__dirname,'..'),dataDir:path.join(dir,'data'),extraEnv:{DERSTEYIM_DOCUMENTS_DIR:path.join(dir,'Documents'),DERSTEYIM_DESKTOP_DIR:path.join(dir,'Desktop')}});
  assert.match(service.url,/^http:\/\/127\.0\.0\.1:\d+$/);const h=await (await fetch(service.url+'/api/health')).json();assert.equal(h.application,'dersteyim');assert.equal(h.instanceId,service.instanceId);
  const s=await (await fetch(service.url+'/api/setup/status')).json();assert.equal(s.activated,false);await service.stop();await assert.rejects(()=>fetch(service.url+'/api/health',{signal:AbortSignal.timeout(500)}));service=null;
 }finally{if(service)await service.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
test('a leftover service for the same data is stopped before a new one starts',async()=>{
 const {startBackend}=require('../desktop/backend-process.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dersteyim-restart-'));const opts={nodeBinary:process.execPath,root:path.resolve(__dirname,'..'),dataDir:path.join(dir,'data')};let old,next;
 try{old=await startBackend(opts);next=await startBackend(opts);assert.notEqual(old.instanceId,next.instanceId);await assert.rejects(()=>fetch(old.url+'/api/health',{signal:AbortSignal.timeout(500)}));const r=await fetch(next.url+'/api/health');assert.equal(r.status,200);}
 finally{if(next)await next.stop();if(old)await old.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
test('desktop package contains the public key needed to read existing signed school records',()=>{
 const config=require('../desktop/package.json');const resource=config.build.extraResources.find(entry=>entry.to==='dersteyim/resources');assert.ok(resource,'Windows package must include legacy public verification key');
 const packageRoot=fs.mkdtempSync(path.join(os.tmpdir(),'dersteyim-layout-'));try{const from=path.resolve(__dirname,'../desktop',resource.from);fs.cpSync(from,path.join(packageRoot,'resources'),{recursive:true});const key=require('../backend/activationProtocol').issuerPublic(packageRoot);assert.equal(require('node:crypto').createPublicKey(key).asymmetricKeyType,'ed25519');}finally{fs.rmSync(packageRoot,{recursive:true,force:true});}
});
