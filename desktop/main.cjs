const {app,BrowserWindow,dialog,session}=require('electron');
const path=require('node:path');const {startBackend}=require('./backend-process.cjs');
app.setName('Dersteyim');
let mainWindow,service,quitting=false;
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else {
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
 app.whenReady().then(async()=>{
  const root=app.isPackaged?path.join(process.resourcesPath,'dersteyim'):path.resolve(__dirname,'..');
  const nodeBinary=process.env.DERSTEYIM_NODE||path.join(root,'bin','node.exe');
  const dataDir=path.join(app.getPath('userData'),'okul-verileri');
  service=await startBackend({nodeBinary,root,dataDir});
  const origin=service.url;
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
   const allowed=details.url.startsWith(origin+'/')||details.url.startsWith('blob:')||details.url.startsWith('data:');callback({cancel:!allowed});
  });
  mainWindow=new BrowserWindow({width:1280,height:820,minWidth:800,minHeight:600,show:false,autoHideMenuBar:true,title:'Dersteyim',backgroundColor:'#f8fafc',icon:path.join(root,'assets','dersteyim.ico'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,devTools:!app.isPackaged}});
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('closed',()=>{mainWindow=null;});
  await mainWindow.loadURL(origin+'/');
 }).catch(error=>{dialog.showErrorBox('Dersteyim açılamadı',`${error.message}\n\nUygulama verilerindeki dersteyim.log dosyasını kontrol edin.`);app.quit();});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(quitting||!service)return;event.preventDefault();quitting=true;service.stop().catch(()=>{}).finally(()=>app.quit());});
}
