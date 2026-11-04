const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');
const config = require('./config');

// Use Windows' known folders so redirected Documents/Desktop (including OneDrive) work.
function knownFolder(kind) {
  const override = process.env[kind === 'Documents' ? 'DERSTEYIM_DOCUMENTS_DIR' : 'DERSTEYIM_DESKTOP_DIR'];
  if (override) return path.resolve(override);
  if (process.platform === 'win32') {
    const folder = kind === 'Documents' ? 'MyDocuments' : 'DesktopDirectory';
    const command = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);[Console]::Write([Environment]::GetFolderPath([Environment+SpecialFolder]::${folder}))`;
    const resolved = execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
    if (!resolved || !path.isAbsolute(resolved)) throw new Error(`${kind} klasörü bulunamadı.`);
    return resolved;
  }
  return path.join(os.homedir(), kind);
}
function credentialsDir() {
  const profile = crypto.createHash('sha256').update(config.DATA_DIR).digest('hex').slice(0,12);
  const documents = knownFolder('Documents');
  const current = path.join(documents,'VarYok',profile);
  const legacy = path.join(documents,'Dersteyim',profile);
  return !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
}
function credentialPath(username) {
  const name = crypto.createHash('sha256').update(username.toLocaleLowerCase('tr-TR')).digest('hex').slice(0,12);
  return path.join(credentialsDir(), `Kullanici_Bilgileri_${name}.txt`);
}
function saveCredential(username,password,{initial=false}={}) {
  const folder=credentialsDir(); fs.mkdirSync(folder,{recursive:true,mode:0o700});
  const filename=credentialPath(username);
  const content=`VARYOK YEREL GİRİŞ BİLGİLERİ\r\nKullanıcı adı: ${username}\r\nŞifre: ${password}\r\n\r\nBu dosyayı okuyabilen kişiler hesabınıza erişebilir. Güvenli bir Windows hesabında saklayın.\r\n`;
  if(initial){fs.writeFileSync(filename,content,{encoding:'utf8',flag:'wx',mode:0o600});return filename;}
  const temporary=filename+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';
  try{fs.writeFileSync(temporary,content,{encoding:'utf8',flag:'wx',mode:0o600});fs.renameSync(temporary,filename);}catch(e){try{fs.unlinkSync(temporary);}catch{}throw e;}
  return filename;
}
function openCredentialsFolder() {
  const dir=credentialsDir();
  if(!fs.existsSync(dir)) throw Object.assign(new Error('Giriş bilgileri klasörü bulunamadı.'),{status:404});
  const program=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
  return new Promise((resolve,reject)=>{
    const p=spawn(program,[dir],{detached:true,stdio:'ignore',windowsHide:true});
    p.once('error',()=>reject(Object.assign(new Error('Klasör otomatik açılamadı. Belgeler/VarYok klasörünü elle açın.'),{status:500})));
    p.once('spawn',()=>{p.unref();resolve();});
  });
}
module.exports={knownFolder,credentialsDir,credentialPath,saveCredential,openCredentialsFolder};
