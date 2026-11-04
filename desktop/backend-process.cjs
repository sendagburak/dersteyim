const fs=require('node:fs');const net=require('node:net');const path=require('node:path');const {spawn}=require('node:child_process');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
async function stopPrevious(dataDir){
 let old;try{old=JSON.parse(fs.readFileSync(path.join(dataDir,'server-control.json'),'utf8'));}catch{return;}
 if(!Number.isInteger(old.port)||old.port<1||old.port>65535||typeof old.instanceId!=='string'||typeof old.token!=='string')return;
 const url=`http://127.0.0.1:${old.port}`;let health;
 try{const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(600)});health=await response.json();}catch{return;}
 if(health.application!=='dersteyim'||health.instanceId!==old.instanceId)return;
 const response=await fetch(url+'/internal/shutdown',{method:'POST',headers:{'X-Control-Token':old.token},signal:AbortSignal.timeout(1500)});
 if(!response.ok)throw new Error('Önceki Dersteyim oturumu kapatılamadı.');
 for(let i=0;i<120;i++){try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(200)});}catch{return;}await delay(100);}
 throw new Error('Önceki Dersteyim oturumu kapanmadı.');
}
async function startBackend({nodeBinary,root,dataDir,extraEnv={}}){
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});await stopPrevious(dataDir);const port=await freePort(),url=`http://127.0.0.1:${port}`;
 const log=fs.createWriteStream(path.join(dataDir,'dersteyim.log'),{flags:'a',mode:0o600});
 const child=spawn(nodeBinary,[path.join(root,'backend','server.js')],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...extraEnv,APP_MODE:'school',DATA_DIR:dataDir,HOST:'127.0.0.1',PORT:String(port),EMAIL_ENABLED:'false',PUSH_ENABLED:'false',NO_BROWSER:'1'}});
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.once('exit',()=>log.end());
 let spawnError;child.once('error',e=>{spawnError=e;});let control,health;
 const stop=async()=>{
  if(child.exitCode!==null||child.signalCode!==null)return;
  try{if(control)await fetch(url+'/internal/shutdown',{method:'POST',headers:{'X-Control-Token':control.token},signal:AbortSignal.timeout(1500)});}catch{}
  for(let i=0;i<120&&child.exitCode===null&&child.signalCode===null;i++)await delay(100);
  if(child.exitCode===null&&child.signalCode===null){child.kill();for(let i=0;i<30&&child.exitCode===null&&child.signalCode===null;i++)await delay(100);}
 };
 try{
  for(let i=0;i<150;i++){
   if(spawnError)throw spawnError;
   if(child.exitCode!==null||child.signalCode!==null)throw new Error('Uygulamanın yerel servisi açılmadı. Günlük dosyasını kontrol edin.');
   try{
    const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(300)});health=await response.json();
    control=JSON.parse(fs.readFileSync(path.join(dataDir,'server-control.json'),'utf8'));
    if(response.ok&&health.application==='dersteyim'&&control.pid===child.pid&&control.port===port&&health.instanceId===control.instanceId)return {url,instanceId:control.instanceId,stop};
   }catch{}
   await delay(100);
  }
  throw new Error('Uygulama zamanında açılamadı. Günlük dosyasını kontrol edin.');
 }catch(e){await stop();throw e;}
}
module.exports={startBackend};
