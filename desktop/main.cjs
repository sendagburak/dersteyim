const {app,BrowserWindow,dialog,session}=require('electron');
const path=require('node:path');const {startBackend}=require('./backend-process.cjs');const {schoolDataPath}=require('./data-path.cjs');
app.setName('VarYok');
// Allows an isolated synthetic profile in automated Windows package tests.
if(process.env.DERSTEYIM_TEST_PROFILE_DIR)app.setPath('userData',path.resolve(process.env.DERSTEYIM_TEST_PROFILE_DIR));
let mainWindow,service,quitting=false;
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else {
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
 app.whenReady().then(async()=>{
  const root=app.isPackaged?path.join(process.resourcesPath,'dersteyim'):path.resolve(__dirname,'..');
  const nodeBinary=process.env.DERSTEYIM_NODE||path.join(root,'bin','node.exe');
  const legacyUserData=process.env.DERSTEYIM_TEST_PROFILE_DIR?null:path.join(app.getPath('appData'),'Dersteyim');
  const dataDir=schoolDataPath(app.getPath('userData'),legacyUserData);
  service=await startBackend({nodeBinary,root,dataDir});
  const origin=service.url;
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
   const allowed=details.url.startsWith(origin+'/')||details.url.startsWith('blob:')||details.url.startsWith('data:');callback({cancel:!allowed});
  });
  mainWindow=new BrowserWindow({width:1280,height:820,minWidth:800,minHeight:600,show:false,autoHideMenuBar:true,title:'VarYok',backgroundColor:'#f8fafc',icon:path.join(root,'assets','varyok.ico'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,devTools:!app.isPackaged}});
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('closed',()=>{mainWindow=null;});
  await mainWindow.loadURL(origin+'/');
 }).catch(error=>{dialog.showErrorBox('VarYok açılamadı',`${error.message}\n\nUygulama verilerindeki dersteyim.log dosyasını kontrol edin.`);app.quit();});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(quitting||!service)return;event.preventDefault();quitting=true;service.stop().catch(()=>{}).finally(()=>app.quit());});
}
