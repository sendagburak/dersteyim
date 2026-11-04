const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DATA_DIR,APP_MODE,formatTurkeyDateTime}=require('../backend/config');
const {db,closeDatabase}=require('../backend/db');
const {hashPassword}=require('../backend/kvkk');
function ensureSetup(){
  if(APP_MODE==='school'){const s=require('../backend/installation').state();if(s.blocked)throw new Error(s.message);console.log(s.activated?'Yerel okul kurulumu hazır.':'İlk açılışta yerel hesap oluşturulacak.');return;}

  const marker=path.join(DATA_DIR,'.setup-complete');
  if(fs.existsSync(marker))return;
  let root=db.prepare("SELECT * FROM users WHERE role='superadmin' ORDER BY id LIMIT 1").get();
  if(!root || root.must_change_password){
    const pass=process.env.INITIAL_ADMIN_PASSWORD||crypto.randomBytes(18).toString('base64url');
    if(pass.length<12)throw new Error('INITIAL_ADMIN_PASSWORD en az 12 karakter olmalıdır.');
    db.transaction(()=>{
      if(!root){
        const sid=Number(db.prepare('INSERT INTO schools(name,code,city,district,created_at) VALUES(?,?,?,?,?)').run(process.env.INITIAL_SCHOOL_NAME||'Okulum','YEREL-001','Niğde','Merkez',formatTurkeyDateTime()).lastInsertRowid);
        const r=db.prepare("INSERT INTO users(school_id,username,email,password_hash,role,full_name,title,created_at,must_change_password) VALUES(?,?,?,?,'superadmin',?,?,?,1)").run(sid,process.env.INITIAL_ADMIN_USERNAME||'yerel.yonetim',process.env.INITIAL_ADMIN_EMAIL||require('../backend/config').OWNER_EMAIL,hashPassword(pass),'Yerel Yönetici','Ana yetkili',formatTurkeyDateTime());root=db.prepare('SELECT * FROM users WHERE id=?').get(Number(r.lastInsertRowid));
      }else db.prepare('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?').run(hashPassword(pass),root.id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(root.id);
    })();
    fs.writeFileSync(path.join(DATA_DIR,'ilk-giris.txt'),`DERSTEYİM — İLK GİRİŞ\nKullanıcı adı: ${root.username}\nGeçici şifre: ${pass}\nİlk girişte şifrenizi değiştirin. Bu dosyayı sonrasında silin.\nDiğer mevcut hesapların bilinen örnek şifreleri devre dışıdır; kullanıcı yönetiminden geçici şifre verin.\n`,{mode:0o600});
    console.log('İlk giriş bilgileri data/ilk-giris.txt dosyasına yazıldı.');
  }
  fs.writeFileSync(marker,'1.1.0',{mode:0o600});
}
if(require.main===module){try{ensureSetup();console.log('Kurulum hazır. Başlatmak için baslat.bat veya npm start.');}finally{closeDatabase();}}
module.exports={ensureSetup};
