const fs=require('node:fs');const path=require('node:path');
const config=require('./config');const {db,logAudit}=require('./db');
const protocol=require('./activationProtocol');
const file=path.join(config.DATA_DIR,'installation-key.json');
const localAddress=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
function requireLocal(req){if(!localAddress(req.socket.remoteAddress))throw Object.assign(new Error('Bu işlem okulun ana bilgisayarında localhost adresinden yapılmalıdır.'),{status:403});}
function installation(){if(!fs.existsSync(file)){if(db.prepare('SELECT 1 FROM school_installation').get())throw new Error('Kurulum anahtarı eksik. Veritabanı ve installation-key.json dosyasını aynı yedekten geri yükleyin.');fs.writeFileSync(file,JSON.stringify(protocol.createInstallation()),{flag:'wx',mode:0o600});}return JSON.parse(fs.readFileSync(file,'utf8'));}
function state(){
  const features={email:config.EMAIL_ENABLED,push:config.PUSH_ENABLED};
  if(config.APP_MODE==='central')return {success:true,mode:'central',activated:true,features};
  const binding=db.prepare('SELECT * FROM school_installation WHERE singleton=1').get();
  if(!binding)return {success:true,mode:'school',activated:false,legacyData:db.prepare('SELECT count(*) AS n FROM users').get().n>0,features};
  try{
    const envelope=JSON.parse(binding.grant_json);
    if(envelope.format==='dersteyim-local-school'&&envelope.version===1){
      const school=db.prepare('SELECT * FROM schools WHERE id=?').get(binding.school_id);
      if(!school||db.prepare('SELECT count(*) AS n FROM schools').get().n!==1||db.prepare("SELECT 1 FROM users WHERE role='superadmin' OR school_id IS NULL OR school_id<>? LIMIT 1").get(binding.school_id))throw new Error('Yerel okul kaydı doğrulanamadı.');
      return {success:true,mode:'school',activated:true,localSetup:true,school,features};
    }
    const local=installation(),claims=protocol.verifyGrant(envelope,protocol.issuerPublic());
    const school=db.prepare('SELECT * FROM schools WHERE id=?').get(binding.school_id);
    if(claims.installation_id!==local.installation_id||claims.encryption_public!==local.encryption_public||claims.identity_public!==local.identity_public||!school||school.code!==claims.school.code||school.name!==claims.school.name)throw new Error('Okul kurulum kimliği eşleşmiyor.');
    if(db.prepare('SELECT count(*) AS n FROM schools').get().n!==1||db.prepare("SELECT 1 FROM users WHERE role='superadmin' OR school_id IS NULL OR school_id<>? LIMIT 1").get(school.id))throw new Error('Bu klasörde birden fazla okula ait veri veya merkez hesabı var. Okul kurulumu kilitlendi.');
    return {success:true,mode:'school',activated:true,school:{id:school.id,...claims.school},installationId:local.installation_id,features};
  }catch(e){return {success:false,mode:'school',activated:false,blocked:true,message:e.message,features};}
}
function createLocalAccount(username,pass){
  if(config.APP_MODE!=='school')throw Object.assign(new Error('Yerel kurulum okul modunda kullanılabilir.'),{status:409});
  if(state().activated||db.prepare('SELECT count(*) AS n FROM users').get().n||db.prepare('SELECT count(*) AS n FROM schools').get().n)throw Object.assign(new Error('Bu kurulumda mevcut hesap veya okul verisi var. Var olan kayıtlar korunmuştur.'),{status:409});
  if(typeof username!=='string'||!/^[-_.\p{L}\p{N}]{3,80}$/u.test(username))throw Object.assign(new Error('Kullanıcı adı 3–80 harf, rakam, nokta, alt çizgi veya tire içermelidir.'),{status:400});
  if(typeof pass!=='string'||pass.length<12||pass.length>128||/[\r\n]/.test(pass))throw Object.assign(new Error('Şifre 12–128 karakter olmalı ve satır sonu içermemelidir.'),{status:400});
  const {hashPassword}=require('./kvkk');const files=require('./localFiles');
  const hash=hashPassword(pass);require('./attendanceReport').ensureFolders();let file;
  try{
    return db.transaction(()=>{
      file=files.saveCredential(username,pass,{initial:true});
      const sid=Number(db.prepare('INSERT INTO schools(name,code,city,district,created_at) VALUES(?,?,?,?,?)').run('Okulum','YEREL-001','','',config.formatTurkeyDateTime()).lastInsertRowid);
      const uid=Number(db.prepare("INSERT INTO users(school_id,username,email,password_hash,role,full_name,title,created_at,must_change_password) VALUES(?,?,?,?,'admin',?,'Yerel kullanıcı',?,0)").run(sid,username,'yerel@localhost.invalid',hash,username,config.formatTurkeyDateTime()).lastInsertRowid);
      db.prepare('INSERT INTO school_installation VALUES(1,?,?,?)').run(sid,JSON.stringify({format:'dersteyim-local-school',version:1}),config.formatTurkeyDateTime());
      enforceSchoolDatabase(sid);logAudit({user_id:uid,user_name:username,role:'admin',action:'LOCAL_SETUP',resource_type:'SCHOOL',resource_id:sid});
      return {success:true,message:'Yerel hesap oluşturuldu. Kullanıcı adı ve şifre Belgeler/Dersteyim klasörüne kaydedildi.'};
    })();
  }catch(e){if(file)try{require('node:fs').unlinkSync(file);}catch{}throw e;}
}
function enforceSchoolDatabase(schoolId){
  // Database-level invariants back up request-level tenant checks.
  db.exec(`CREATE TRIGGER IF NOT EXISTS school_one_insert BEFORE INSERT ON schools WHEN EXISTS(SELECT 1 FROM school_installation) BEGIN SELECT RAISE(ABORT,'school_binding_violation'); END;
  CREATE TRIGGER IF NOT EXISTS school_identity_update BEFORE UPDATE ON schools WHEN EXISTS(SELECT 1 FROM school_installation) AND (NEW.id<>OLD.id OR NEW.code<>OLD.code OR NEW.name<>OLD.name) BEGIN SELECT RAISE(ABORT,'school_binding_violation'); END;`);
  for(const table of ['users','classes','students'])for(const action of ['INSERT','UPDATE']){
    const extra=table==='users'?" OR NEW.role='superadmin'":'';
    db.exec(`CREATE TRIGGER IF NOT EXISTS bound_${table}_${action.toLowerCase()} BEFORE ${action} ON ${table} WHEN EXISTS(SELECT 1 FROM school_installation) AND (NEW.school_id IS NULL OR NEW.school_id<>(SELECT school_id FROM school_installation WHERE singleton=1)${extra}) BEGIN SELECT RAISE(ABORT,'school_binding_violation'); END;`);
  }
}
module.exports={state,requireLocal,createLocalAccount};
