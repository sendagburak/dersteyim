// Exercises the production Electron entry point with an isolated test profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

if (!process.versions.electron) {
  assert.equal(process.platform,'win32','Bu test Windows üzerinde çalışır.');
  const {spawnSync}=require('node:child_process');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'varyok-close-'));
  try {
    const electron=require('../desktop/node_modules/electron');
    const result=spawnSync(electron,[__filename],{
      env:{...process.env,DERSTEYIM_TEST_PROFILE_DIR:path.join(dir,'Profile'),DERSTEYIM_DOCUMENTS_DIR:path.join(dir,'Documents'),DERSTEYIM_DESKTOP_DIR:path.join(dir,'Desktop'),DERSTEYIM_NODE:process.execPath,DERSTEYIM_CLOSE_TEST_RESULT:path.join(dir,'passed')},
      stdio:'inherit',timeout:60000,windowsHide:false
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,'Electron kapanış testi başarısız oldu.');
    assert.ok(fs.existsSync(path.join(dir,'passed')),'Pencere ve yerel servis düzgün kapanmadı.');
  } finally {fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
} else {
  const {app,dialog}=require('electron');
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let calls=0,closed=false;
  const timeout=setTimeout(()=>{console.error('Pencere kapanış testi zaman aşımına uğradı.');app.exit(1);},45000);
  dialog.showMessageBoxSync=()=>++calls===1?1:0;
  dialog.showErrorBox=(title,message)=>{console.error(title,message);app.exit(1);};
  app.on('browser-window-created',(_event,window)=>{
    window.webContents.once('did-finish-load',async()=>{
      try {
        await window.webContents.executeJavaScript("window.addEventListener('beforeunload', event => { event.preventDefault(); event.returnValue = ''; }); document.body.click();",true);
        window.close();
        await delay(500);
        assert.equal(calls,1,'Kaydedilmemiş değişiklik uyarısı gösterilmedi.');
        assert.equal(window.isDestroyed(),false,'Düzenlemeye dön seçilince pencere açık kalmalı.');
        window.once('closed',()=>{closed=true;});
        window.close();
        await delay(500);
        assert.equal(calls,2,'Çıkış onayı ikinci kez gösterilmedi.');
        assert.equal(closed,true,'Kaydetmeden çık seçilince pencere kapanmalı.');
      } catch(error) {console.error(error.stack||error);app.exit(1);}
    });
  });
  app.on('will-quit',()=>{
    clearTimeout(timeout);
    const control=path.join(process.env.DERSTEYIM_TEST_PROFILE_DIR,'okul-verileri','server-control.json');
    if(closed&&calls===2&&!fs.existsSync(control)){
      fs.writeFileSync(process.env.DERSTEYIM_CLOSE_TEST_RESULT,'ok');
      console.log('Kaydedilmemiş değişiklikte kal/çık seçimleri ve yerel servisin kapanması doğrulandı.');
    }
  });
  require('../desktop/main.cjs');
}
