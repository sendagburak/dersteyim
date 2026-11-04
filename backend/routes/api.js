const express = require('express');
const crypto = require('node:crypto');
const { db, logAudit } = require('../db');
const { maskFullName, maskParentName, maskTC, maskPhone, maskEmail, encryptSensitiveData, decryptSensitiveData, hashPassword, verifyPassword } = require('../kvkk');
const config = require('../config');
const { formatTurkeyDateTime: nowText, formatTurkeyDateOnly: today, formatTurkeyTimeOnly: time, turkeyDay } = config;
const { parseEOkulStudentList, createEOkulTemplateWorkbook,parseSchedule,createScheduleTemplate } = require('../eOkulParser');
const { deliverNotification } = require('../notificationWorker');
const { mailStatus } = require('../mailer');
const {protectPersonal,personalData}=require('../studentData');
const {publicKey,saveSubscription,removeSubscription,notifyUsers}=require('../push');
const router = express.Router();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const id = (v, name = 'Kayıt') => { const n = Number(v); if (!Number.isSafeInteger(n) || n < 1) fail(400, `${name} geçersiz.`); return n; };
const text = (v, name, max = 250, optional = false) => { if (optional && (v == null || v === '')) return ''; if (typeof v !== 'string' || !v.trim() || v.length > max) fail(400, `${name} zorunludur (en fazla ${max} karakter).`); return v.trim(); };
const email = (v, optional = false) => { const s = text(v, 'E-posta', 254, optional).toLowerCase(); if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail(400, 'E-posta geçersiz.'); return s; };
const password = v => { if (typeof v !== 'string' || v.length < 12 || v.length > 128 || /[\r\n]/.test(v)) fail(400, 'Şifre 12–128 karakter olmalı ve satır sonu içermemelidir.'); return v; };
const isoDate = v => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0,10) !== v) fail(400, 'Tarih YYYY-AA-GG biçiminde olmalıdır.'); return v; };
function audit(req, action, type, resourceId, details = '') { logAudit({ user_id: req.user?.id, user_name: ['parent','student'].includes(req.user?.role)?maskFullName(req.user.full_name):req.user?.full_name, role: req.user?.role, action, resource_type: type, resource_id: resourceId, ip_address: req.ip, device_fingerprint: req.deviceFingerprint, details }); }
function changeCredential(username,pass,operation){
  if(config.APP_MODE!=='school'||!require('../installation').state().localSetup)return db.transaction(operation)();
  const fs=require('node:fs'),files=require('../localFiles'),file=files.credentialPath(username);
  const previous=fs.existsSync(file)?fs.readFileSync(file):null;let written=false;
  try{return db.transaction(()=>{const result=operation();files.saveCredential(username,pass);written=true;return result;})();}
  catch(e){if(written)try{if(previous)fs.writeFileSync(file,previous,{mode:0o600});else fs.unlinkSync(file);}catch{}throw e;}
}
function roles(req, ...allowed) { if (!allowed.includes(req.user.role)) fail(403, 'Bu işlem için yetkiniz yok.'); }
function schoolAccess(req, schoolId) { if(config.APP_MODE==='school'&&req.boundSchool!==Number(schoolId))fail(403,'Bu kurulumda başka bir okula erişilemez.'); if (req.user.role !== 'superadmin' && req.user.school_id !== Number(schoolId)) fail(403, 'Bu okula erişim yetkiniz yok.'); }
const staff = req => roles(req, 'superadmin','admin','teacher');
const admin = req => roles(req, 'superadmin','admin');
function getClass(req, classId, write = false) {
  const row = db.prepare('SELECT * FROM classes WHERE id=?').get(id(classId, 'Sınıf'));
  if (!row) fail(404, 'Sınıf bulunamadı.');
  schoolAccess(req, row.school_id);
  if (req.user.role === 'teacher') { const active=periodsFor(row.school_id).find(p=>time()>=p.start_time&&time()<p.end_time); if(row.academic_year!==config.academicYear()||!active||!db.prepare('SELECT 1 FROM schedules WHERE teacher_id=? AND class_id=? AND day_of_week=? AND period=?').get(req.user.id,row.id,turkeyDay(),active.period))fail(403,'Bu sınıfın bilgileri yalnızca güncel ders saatinizde açılır.'); }
  if (['parent','student'].includes(req.user.role)) {
    if (write || !db.prepare('SELECT 1 FROM student_accounts a JOIN students s ON s.id=a.student_id WHERE a.user_id=? AND (s.class_id=? OR EXISTS (SELECT 1 FROM attendance_records r JOIN attendance_sessions h ON h.id=r.session_id WHERE r.student_id=s.id AND h.class_id=?))').get(req.user.id,row.id,row.id)) fail(403, 'Bu sınıfa erişiminiz yok.');
  }
  return row;
}
function classesFor(req) {
  if (req.user.role === 'superadmin') return db.prepare('SELECT c.*,s.name AS school_name FROM classes c JOIN schools s ON s.id=c.school_id ORDER BY s.name,c.name').all();
  if (req.user.role === 'teacher') { const active=periodsFor(req.user.school_id).find(p=>time()>=p.start_time&&time()<p.end_time); return active?db.prepare('SELECT DISTINCT c.* FROM classes c JOIN schedules s ON c.id=s.class_id WHERE c.school_id=? AND s.teacher_id=? AND s.day_of_week=? AND s.period=? AND c.academic_year=? ORDER BY c.name').all(req.user.school_id,req.user.id,turkeyDay(),active.period,config.academicYear()):[]; }
  if (['parent','student'].includes(req.user.role)) return db.prepare('SELECT DISTINCT c.* FROM classes c WHERE c.school_id=? AND EXISTS (SELECT 1 FROM student_accounts a JOIN students s ON s.id=a.student_id WHERE a.user_id=? AND (s.class_id=c.id OR EXISTS (SELECT 1 FROM attendance_records r JOIN attendance_sessions h ON h.id=r.session_id WHERE r.student_id=s.id AND h.class_id=c.id))) ORDER BY c.academic_year DESC,c.name').all(req.user.school_id,req.user.id);
  return db.prepare('SELECT * FROM classes WHERE school_id=? ORDER BY academic_year DESC,name').all(req.user.school_id);
}
function studentRows(req, classId) {
  getClass(req,classId);
  const sql = `SELECT s.id,s.class_id,s.student_no,s.tc_masked,s.masked_name,s.masked_parent_name,s.masked_parent_email,s.masked_parent_phone,s.gender FROM students s WHERE s.class_id=?`;
  return ['parent','student'].includes(req.user.role) ? db.prepare(sql+' AND s.id IN (SELECT student_id FROM student_accounts WHERE user_id=?) ORDER BY CAST(student_no AS INTEGER),student_no').all(Number(classId),req.user.id) : db.prepare(sql+' ORDER BY CAST(student_no AS INTEGER),student_no').all(Number(classId));
}
const userView = u => ({ id:u.id,username:u.username,email:u.email,role:u.role,full_name:u.full_name,title:u.title,school_id:u.school_id,school_name:u.school_name, must_change_password:!!u.must_change_password, is_owner:u.email?.toLowerCase()===config.OWNER_EMAIL });
const cookieName = 'dersteyim_session_'+crypto.createHash('sha256').update(config.DATA_DIR).digest('hex').slice(0,12);
function sessionToken(req) { const bearer = /^Bearer (\S+)$/.exec(req.get('authorization') || ''); if (bearer) return bearer[1]; return (req.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1); }
function setCookie(req,res,token,maxAge=config.SESSION_HOURS*3600*1000) { res.cookie(cookieName,token,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge,path:'/api'}); }
const loginAttempts = new Map();
function limit(req, key, max = 15) {
  const now=Date.now();
  for(const [k,v] of loginAttempts) if(v.until<now) loginAttempts.delete(k);
  const value=loginAttempts.get(key) || {count:0,until:now+15*60*1000}; value.count++;loginAttempts.set(key,value);
  if(value.count>max) { fail(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.'); }
}
router.use((req,res,next) => {
  req.body ??= {};
  req.deviceFingerprint = req.get('x-device-fingerprint') || 'browser';
  req.sessionToken = sessionToken(req);
  if (req.sessionToken && /^[a-f\d]{64}$/i.test(req.sessionToken)) {
    const u = db.prepare('SELECT u.*,sc.name AS school_name FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN schools sc ON sc.id=u.school_id WHERE s.token=? AND s.expires_at>?').get(req.sessionToken,Date.now());
    if(u && (config.APP_MODE!=='school'||(u.role!=='superadmin'&&u.school_id===req.boundSchool))) req.user=userView(u);
  }
  res.set('Cache-Control','no-store');
  next();
});
router.post('/auth/login',(req,res) => {
  limit(req,`login-ip:${req.ip}`,60);
  const name=text(req.body.usernameOrEmail,'Kullanıcı adı',254);
  limit(req,`login:${req.ip}:${name.toLowerCase()}`);
  const pass=text(req.body.password,'Şifre',256);
  const u=db.prepare('SELECT u.*,s.name AS school_name FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE lower(u.username)=lower(?) OR lower(u.email)=lower(?)').get(name,name);
  if(config.APP_MODE==='school' && u && (u.role==='superadmin'||u.school_id!==req.boundSchool))fail(403,'Bu hesap bu okul kurulumuna ait değil.');
  if(!u || !verifyPassword(pass,u.password_hash)) { audit(req,'LOGIN_FAILED','AUTH',null); fail(401,'Kullanıcı adı veya şifre hatalı.'); }
  const fingerprint=text(req.body.deviceFingerprint || req.deviceFingerprint,'Cihaz kimliği',200);
  let device=db.prepare('SELECT * FROM devices WHERE user_id=? AND device_fingerprint=?').get(u.id,fingerprint);
  if(!device) {
    const approved=!config.REQUIRE_DEVICE_APPROVAL || u.role==='superadmin';
    const d=db.prepare('INSERT INTO devices(user_id,device_fingerprint,device_name,is_approved,last_used_at,created_at) VALUES(?,?,?,?,?,?)').run(u.id,fingerprint,text(req.body.deviceName||'Web tarayıcısı','Cihaz adı',120),Number(approved),nowText(),nowText());
    device={id:Number(d.lastInsertRowid),is_approved:Number(approved)};
  }
  if(!device.is_approved) fail(403,'Bu cihaz okul yöneticisinin onayını bekliyor.');
  db.prepare('UPDATE devices SET last_used_at=? WHERE id=?').run(nowText(),device.id);
  const token=crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
  db.prepare('INSERT INTO sessions(token,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(token,u.id,Date.now()+config.SESSION_HOURS*3600000,nowText());
  setCookie(req,res,token); req.user=userView(u); audit(req,'USER_LOGIN','AUTH',u.id);
  res.json({success:true,token,user:req.user,deviceApproved:true});
});
// No unauthenticated role switching in distributed builds.
router.all('/auth/switch-role',(_req,res)=>res.status(404).json({success:false,message:'Bu uç nokta kaldırıldı.'}));
router.use((req,res,next)=>{ if(!req.user) return res.status(401).json({success:false,message:'Oturum açmanız gerekiyor.'}); if(req.user.must_change_password && !['/auth/me','/auth/password','/auth/logout'].includes(req.path)) return res.status(403).json({success:false,code:'PASSWORD_CHANGE_REQUIRED',message:'Devam etmek için geçici şifrenizi değiştirin.'}); next(); });
router.use((req,res,next)=>{if(req.method==='GET'&&!['/auth/me','/attendance/current-context','/emergency/active','/notifications/inbox'].includes(req.path))res.once('finish',()=>{try{audit(req,'DATA_ACCESSED','API',null,`${req.method} ${req.path} HTTP ${res.statusCode}`);}catch(e){console.error('Erişim günlüğü yazılamadı:',e.message);}});next();});
router.get('/auth/me',(req,res)=>res.json({success:true,user:req.user}));
router.post('/auth/logout',(req,res)=>{db.prepare('DELETE FROM sessions WHERE token=?').run(req.sessionToken);setCookie(req,res,'',0);res.json({success:true});});
router.post('/auth/password',(req,res)=>{
  limit(req,`password:${req.ip}:${req.user.id}`);
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if(!verifyPassword(req.body.currentPassword,u.password_hash)) fail(403,'Mevcut şifre hatalı.');
  const pass=password(req.body.newPassword);
  if(verifyPassword(pass,u.password_hash)) fail(400,'Yeni şifre mevcut şifreden farklı olmalıdır.');
  changeCredential(u.username,pass,()=>{db.prepare('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?').run(hashPassword(pass),u.id);db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(u.id,req.sessionToken);});
  audit(req,'PASSWORD_CHANGED','USER',u.id);res.json({success:true,message:'Şifreniz değiştirildi.'});
});
router.get('/schools',(req,res)=>res.json({success:true,schools:req.user.role==='superadmin'?db.prepare('SELECT * FROM schools ORDER BY name').all():db.prepare('SELECT * FROM schools WHERE id=?').all(req.user.school_id)}));
router.post('/system/backup',async(req,res)=>{
  admin(req);require('../installation').requireLocal(req);
  const fs=require('node:fs'),path=require('node:path'),{backup}=require('node:sqlite'),{knownFolder}=require('../localFiles');
  const root=path.join(knownFolder('Documents'),'VarYok Yedekleri');fs.mkdirSync(root,{recursive:true,mode:0o700});
  const stamp=nowText().replace(/[.: ]/g,'-'),folder=path.join(root,`${stamp}-${crypto.randomBytes(3).toString('hex')}`);fs.mkdirSync(folder,{mode:0o700});
  try{
    await backup(db,path.join(folder,'eyoklama.db'));
    for(const name of ['encryption-key.json','installation-key.json','.key-required']){const src=path.join(config.DATA_DIR,name);if(fs.existsSync(src))fs.copyFileSync(src,path.join(folder,name));}
    fs.writeFileSync(path.join(folder,'BILGI.txt'),'Veritabanı ve şifreleme anahtarı birlikte saklanmalıdır. Şifrelerin bulunduğu Belgeler/VarYok klasörü bu yedeğe dahil değildir. Yedek kişisel veri içerir; güvenli bir yerde tutun.\r\n',{mode:0o600});
  }catch(e){fs.rmSync(folder,{recursive:true,force:true});throw e;}
  audit(req,'BACKUP_CREATED','SYSTEM',null);res.json({success:true,path:folder,message:`Yedek oluşturuldu: ${folder}`});
});
router.post('/schools',(req,res)=>{
  roles(req,'superadmin');
  const b=req.body;const r=db.prepare('INSERT INTO schools(name,code,city,district,created_at) VALUES(?,?,?,?,?)').run(text(b.name,'Okul adı'),text(b.code,'Kurum kodu',30),text(b.city||'Niğde','İl',80),text(b.district||'Merkez','İlçe',80),nowText());
  audit(req,'SCHOOL_CREATED','SCHOOL',Number(r.lastInsertRowid));res.status(201).json({success:true,schoolId:Number(r.lastInsertRowid),message:'Okul eklendi.'});
});
router.get('/users',(req,res)=>{
  admin(req);let sql='SELECT u.id,u.username,u.email,u.role,u.full_name,u.title,u.phone,u.school_id,u.created_at,u.must_change_password,s.name AS school_name,c.full_name AS created_by_name FROM users u LEFT JOIN schools s ON s.id=u.school_id LEFT JOIN users c ON c.id=u.created_by WHERE 1=1';const p=[];
  if(req.user.role!=='superadmin') {sql+=' AND u.school_id=?';p.push(req.user.school_id);}
  else if(req.query.schoolId) {sql+=' AND u.school_id=?';p.push(id(req.query.schoolId));}
  if(req.query.role){sql+=' AND u.role=?';p.push(req.query.role);}res.json({success:true,users:db.prepare(sql+' ORDER BY u.id').all(...p).map(u=>({...u,is_owner:u.email.toLowerCase()===config.OWNER_EMAIL,...(['parent','student'].includes(u.role)?{full_name:maskFullName(u.full_name),email:maskEmail(u.email),phone:maskPhone(u.phone)}:{})}))});
});
router.post('/users/create',(req,res)=>{
  admin(req);const b=req.body;const role=text(b.role,'Rol',20);
  if(!['superadmin','admin','teacher','parent','student'].includes(role)) fail(400,'Geçersiz rol.');
  if(role==='superadmin'&&!req.user.is_owner)fail(403,'Merkez yetkililerini yalnızca program sahibi tanımlayabilir.');
  if(req.user.role==='admin' && ['superadmin','admin'].includes(role)) fail(403,'Yönetici hesabı oluşturma yetkiniz yok.');
  const sid=req.user.role==='admin'?req.user.school_id:id(b.school_id,'Okul');schoolAccess(req,sid);
  if(!db.prepare('SELECT id FROM schools WHERE id=?').get(sid)) fail(404,'Okul bulunamadı.');
  const username=text(b.username,'Kullanıcı adı',80),pass=password(b.password),address=email(b.email),fullName=text(b.full_name,'Ad soyad',150),title=text(b.title,'Unvan',150,true),phone=text(b.phone,'Telefon',30,true);
  if(config.APP_MODE==='school'&&require('../installation').state().localSetup&&!/^[-_.\p{L}\p{N}]{3,80}$/u.test(username))fail(400,'Kullanıcı adı 3–80 harf, rakam, nokta, alt çizgi veya tire içermelidir.');
  const r=changeCredential(username,pass,()=>db.prepare('INSERT INTO users(school_id,username,email,password_hash,role,full_name,title,phone,created_by,created_at,must_change_password) VALUES(?,?,?,?,?,?,?,?,?,?,1)').run(sid,username,address,hashPassword(pass),role,fullName,title,phone,req.user.id,nowText()));
  audit(req,'USER_CREATED','USER',Number(r.lastInsertRowid));res.status(201).json({success:true,userId:Number(r.lastInsertRowid),message:'Kullanıcı oluşturuldu. İlk girişte şifre değiştirilir.'});
});
router.post('/users/:userId/reset-password',(req,res)=>{
  admin(req);const u=db.prepare('SELECT * FROM users WHERE id=?').get(id(req.params.userId));if(!u) fail(404,'Kullanıcı bulunamadı.');schoolAccess(req,u.school_id);
  if(req.user.role!=='superadmin' && ['admin','superadmin'].includes(u.role)) fail(403,'Bu hesabı yönetemezsiniz.');
  if(u.role==='superadmin'&&!req.user.is_owner)fail(403,'Merkez yetkilisinin şifresini yalnızca program sahibi yönetebilir.');
  const pass=password(req.body.password);changeCredential(u.username,pass,()=>{db.prepare('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?').run(hashPassword(pass),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);});audit(req,'PASSWORD_RESET','USER',u.id);res.json({success:true,message:'Geçici şifre tanımlandı; açık oturumlar kapatıldı.'});
});
router.get('/student-accounts',(req,res)=>{admin(req);res.json({success:true,links:db.prepare('SELECT a.*,u.full_name AS user_name,s.masked_name,s.school_id FROM student_accounts a JOIN users u ON u.id=a.user_id JOIN students s ON s.id=a.student_id'+(req.user.role==='superadmin'?'':' WHERE s.school_id=?')).all(...(req.user.role==='superadmin'?[]:[req.user.school_id])).map(l=>({...l,user_name:maskFullName(l.user_name)}))});});
router.post('/student-accounts',(req,res)=>{
  admin(req);const uid=id(req.body.userId),sid=id(req.body.studentId);const u=db.prepare('SELECT * FROM users WHERE id=?').get(uid);const s=db.prepare('SELECT * FROM students WHERE id=?').get(sid);
  if(!u||!s) fail(404,'Kullanıcı veya öğrenci bulunamadı.');schoolAccess(req,s.school_id);
  if(u.school_id!==s.school_id || !['parent','student'].includes(u.role)) fail(400,'Aynı okuldan bir veli/öğrenci hesabı seçin.');
  if(u.role==='student' && db.prepare('SELECT 1 FROM student_accounts WHERE user_id=? AND student_id<>?').get(uid,sid)) fail(409,'Öğrenci hesabı yalnızca kendi kaydına bağlanabilir.');
  db.prepare('INSERT OR IGNORE INTO student_accounts VALUES(?,?)').run(uid,sid);audit(req,'ACCOUNT_LINKED','STUDENT',sid);res.json({success:true,message:'Hesap öğrenciye bağlandı.'});
});
router.delete('/student-accounts/:userId/:studentId',(req,res)=>{admin(req);const s=db.prepare('SELECT * FROM students WHERE id=?').get(id(req.params.studentId));if(!s)fail(404,'Öğrenci bulunamadı.');schoolAccess(req,s.school_id);db.prepare('DELETE FROM student_accounts WHERE user_id=? AND student_id=?').run(id(req.params.userId),s.id);audit(req,'ACCOUNT_UNLINKED','STUDENT',s.id);res.json({success:true});});
router.get('/classes',(req,res)=>res.json({success:true,classes:classesFor(req)}));
router.post('/classes',(req,res)=>{
  admin(req);const b=req.body;const sid=req.user.role==='admin'?req.user.school_id:id(b.school_id,'Okul');schoolAccess(req,sid);
  const grade=id(b.grade_level,'Sınıf düzeyi');if(grade>12)fail(400,'Sınıf düzeyi 1–12 olmalıdır.');
  const section=text(b.section,'Şube',10).toLocaleUpperCase('tr-TR');const year=text(b.academic_year||config.academicYear(),'Eğitim yılı',9);if(!/^\d{4}-\d{4}$/.test(year)||Number(year.slice(5))!==Number(year.slice(0,4))+1)fail(400,'Eğitim yılı geçersiz.');
  if(db.prepare('SELECT id FROM classes WHERE school_id=? AND grade_level=? AND section=? AND academic_year=?').get(sid,grade,section,year))fail(409,'Bu sınıf zaten kayıtlı.');
  const r=db.prepare('INSERT INTO classes(school_id,name,grade_level,section,academic_year) VALUES(?,?,?,?,?)').run(sid,`${grade}-${section}`,grade,section,year);audit(req,'CLASS_CREATED','CLASS',Number(r.lastInsertRowid));res.status(201).json({success:true,message:'Sınıf eklendi.'});
});
router.get('/schedules',(req,res)=>{
  staff(req);let sql='SELECT s.*,c.name AS class_name,c.school_id,u.full_name AS teacher_name FROM schedules s JOIN classes c ON c.id=s.class_id JOIN users u ON u.id=s.teacher_id WHERE 1=1';const p=[];
  if(req.user.role!=='superadmin'){sql+=' AND c.school_id=?';p.push(req.user.school_id);}if(req.user.role==='teacher'){sql+=' AND s.teacher_id=?';p.push(req.user.id);}res.json({success:true,schedules:db.prepare(sql+' ORDER BY s.day_of_week,s.period').all(...p)});
});
router.post('/schedules',(req,res)=>{
  admin(req);const b=req.body,c=getClass(req,b.class_id,true),u=db.prepare('SELECT * FROM users WHERE id=?').get(id(b.teacher_id));
  if(!u||u.role!=='teacher'||u.school_id!==c.school_id)fail(400,'Sınıfla aynı okuldan öğretmen seçin.');
  const day=id(b.day_of_week),period=id(b.period);if(day>7||period>8)fail(400,'Gün/ders saati geçersiz.');
  db.prepare('INSERT INTO schedules(teacher_id,class_id,day_of_week,period,subject) VALUES(?,?,?,?,?)').run(u.id,c.id,day,period,text(b.subject,'Ders adı',100));audit(req,'SCHEDULE_CREATED','CLASS',c.id);res.status(201).json({success:true,message:'Ders programı kaydedildi.'});
});
router.delete('/schedules/:scheduleId',(req,res)=>{admin(req);const s=db.prepare('SELECT * FROM schedules WHERE id=?').get(id(req.params.scheduleId));if(!s)fail(404,'Ders bulunamadı.');getClass(req,s.class_id,true);db.prepare('DELETE FROM schedules WHERE id=?').run(s.id);audit(req,'SCHEDULE_DELETED','CLASS',s.class_id);res.json({success:true,message:'Ders programından kaldırıldı.'});});
function periodsFor(schoolId) { return db.prepare('SELECT l.period,l.name,COALESCE(p.start_time,l.start_time) AS start_time,COALESCE(p.end_time,l.end_time) AS end_time FROM lesson_periods l LEFT JOIN school_periods p ON p.period=l.period AND p.school_id=? ORDER BY l.period').all(schoolId||0); }
router.get('/periods',(req,res)=>{const sid=req.query.schoolId? id(req.query.schoolId):req.user.school_id;schoolAccess(req,sid);res.json({success:true,periods:periodsFor(sid)});});
router.put('/periods',(req,res)=>{
  admin(req);const sid=req.user.role==='admin'?req.user.school_id:id(req.body.schoolId);schoolAccess(req,sid);
  const items=req.body.periods;if(!Array.isArray(items)||items.length!==8)fail(400,'Sekiz ders saatini birlikte gönderin.');let prev='00:00';
  items.forEach((p,i)=>{if(Number(p.period)!==i+1||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.start_time)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.end_time)||p.start_time<prev||p.start_time>=p.end_time)fail(400,'Ders saatleri sıralı ve çakışmadan girilmelidir.');prev=p.end_time;});
  db.transaction(()=>{for(const p of items)db.prepare('INSERT INTO school_periods VALUES(?,?,?,?) ON CONFLICT(school_id,period) DO UPDATE SET start_time=excluded.start_time,end_time=excluded.end_time').run(sid,p.period,p.start_time,p.end_time);})();audit(req,'PERIODS_UPDATED','SCHOOL',sid);res.json({success:true,message:'Ders saatleri güncellendi.'});
});
router.get('/attendance/current-context',(req,res)=>{
  const allClasses=classesFor(req),periods=periodsFor(req.user.school_id),currentPeriod=periods.find(p=>time()>=p.start_time&&time()<p.end_time)||null;
  const teacherSchedules=req.user.role==='teacher'?db.prepare('SELECT s.*,c.name AS class_name,c.academic_year FROM schedules s JOIN classes c ON c.id=s.class_id WHERE s.teacher_id=? AND s.day_of_week=? AND c.school_id=? AND c.academic_year=? ORDER BY s.period').all(req.user.id,turkeyDay(),req.user.school_id,config.academicYear()):[];
  res.json({success:true,academicYear:config.academicYear(),turkeyTime:{full:nowText(),date:today(),time:time(),dayOfWeek:turkeyDay()},periods,currentPeriod,teacherSchedules,allowedClasses:teacherSchedules.filter(s=>s.period===currentPeriod?.period),allClasses,mail:mailStatus()});
});
router.get('/attendance/class-students/:classId',(req,res)=>{
  const current=studentRows(req,req.params.classId),date=req.query.date?isoDate(req.query.date):today();
  const session=db.prepare('SELECT * FROM attendance_sessions WHERE class_id=? AND period=? AND date=?').get(Number(req.params.classId),id(req.query.period||1),date);
  let former=[];if(session){let query='SELECT s.id,s.class_id,s.student_no,s.tc_masked,s.masked_name,s.masked_parent_name,s.masked_parent_email,s.masked_parent_phone,s.gender FROM students s JOIN attendance_records r ON r.student_id=s.id WHERE r.session_id=?';const params=[session.id];if(['parent','student'].includes(req.user.role)){query+=' AND s.id IN (SELECT student_id FROM student_accounts WHERE user_id=?)';params.push(req.user.id);}former=db.prepare(query).all(...params);}
  const students=[...new Map([...current,...former].map(s=>[s.id,s])).values()].sort((a,b)=>String(a.student_no).localeCompare(String(b.student_no),'tr',{numeric:true}));
  const records={};if(session){const allowed=new Set(students.map(s=>s.id));for(const r of db.prepare('SELECT student_id,status FROM attendance_records WHERE session_id=?').all(session.id))if(allowed.has(r.student_id))records[r.student_id]=r.status;}
  res.json({success:true,students,existingSession:session?{id:session.id,note:['parent','student'].includes(req.user.role)?'':session.note,saved_at_turkey_time:session.saved_at_turkey_time,saved_timestamp:session.saved_timestamp}:null,existingRecords:records});
});
router.post('/attendance/save',async(req,res)=>{
  staff(req);const b=req.body,c=getClass(req,b.classId,true),period=id(b.period,'Ders saati'),date=b.date?isoDate(b.date):today();if(period>8)fail(400,'Ders saati 1–8 olmalıdır.');if(date>today())fail(400,'Gelecek tarih için yoklama kaydedilemez.');
  if(req.user.role==='teacher') {
    const p=periodsFor(c.school_id).find(p=>p.period===period);
    if(date!==today()||time()<p.start_time||time()>=p.end_time||!db.prepare('SELECT id FROM schedules WHERE teacher_id=? AND class_id=? AND day_of_week=? AND period=?').get(req.user.id,c.id,turkeyDay(),period))fail(403,'Yalnızca programınızdaki güncel dersin yoklamasını kaydedebilirsiniz.');
  }
  if(!b.records||typeof b.records!=='object'||Array.isArray(b.records))fail(400,'Yoklama kayıtları geçersiz.');
  const pupils=db.prepare('SELECT * FROM students WHERE class_id=? OR id IN (SELECT r.student_id FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id WHERE a.class_id=? AND a.period=? AND a.date=?)').all(c.id,c.id,period,date),ids=new Set(pupils.map(s=>String(s.id)));
  if(!pupils.length)fail(400,'Bu sınıfta kayıtlı öğrenci yok.');
  if(Object.keys(b.records).length!==pupils.length||Object.entries(b.records).some(([sid,s])=>!ids.has(sid)||!['GELDI','GELMEDI','GEC','IZINLI'].includes(s)))fail(400,'Sınıftaki her öğrenci için geçerli bir durum gönderin.');
  const stamp=Date.now(),savedAt=nowText(),note=text(b.note,'Ders notu',2000,true);
  const result=db.transaction(()=>{
    let sess=db.prepare('SELECT * FROM attendance_sessions WHERE class_id=? AND period=? AND date=?').get(c.id,period,date);
    if(sess && db.prepare('SELECT 1 FROM notification_queue WHERE session_id=? AND processing_since IS NOT NULL').get(sess.id))fail(409,'Bu yoklamanın bildirimi gönderiliyor. İşlem bitince tekrar deneyin.');
    if(sess && b.expectedSavedTimestamp!==sess.saved_timestamp)fail(409,'Bu yoklama başka bir oturumda değiştirildi. Listeyi yenileyip tekrar kaydedin.');
    if(!sess && b.expectedSavedTimestamp!=null)fail(409,'Yoklama kaydı değişti. Listeyi yenileyin.');
    const sessionId=sess?sess.id:Number(db.prepare('INSERT INTO attendance_sessions(class_id,period,date,recorded_by_teacher_id,saved_at_turkey_time,saved_timestamp,note) VALUES(?,?,?,?,?,?,?)').run(c.id,period,date,req.user.id,savedAt,stamp,note).lastInsertRowid);
    const version=sess?Math.max(stamp,sess.saved_timestamp+1):stamp;
    if(sess)db.prepare('UPDATE attendance_sessions SET recorded_by_teacher_id=?,saved_at_turkey_time=?,saved_timestamp=?,note=? WHERE id=?').run(req.user.id,savedAt,version,note,sessionId);
    let absentCount=0;
    for(const s of pupils){
      const status=b.records[s.id];db.prepare('INSERT INTO attendance_records(session_id,student_id,status,updated_at) VALUES(?,?,?,?) ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at').run(sessionId,s.id,status,savedAt);
      if(status==='GELMEDI') {
        absentCount++;
        // Idempotent: a pending OR already-sent notice is never inserted again.
        const existing=db.prepare("SELECT id FROM notification_queue WHERE session_id=? AND student_id=? AND status IN ('PENDING','SENT')").get(sessionId,s.id);
        if(!existing && date===today() && (config.EMAIL_ENABLED||config.PUSH_ENABLED))db.prepare("INSERT INTO notification_queue(session_id,student_id,parent_email,parent_phone,student_name_masked,class_name,period_name,teacher_name,absent_time_turkey,scheduled_send_time,status,channel) VALUES(?,?,?,?,?,?,?,?,?,?,'PENDING','EMAIL')").run(sessionId,s.id,'','',s.masked_name,c.name,`${period}. Ders`,req.user.full_name,savedAt,stamp+30*60000);
      } else db.prepare("UPDATE notification_queue SET status='CANCELLED',response_log='Yoklama düzeltildi' WHERE session_id=? AND student_id=? AND status='PENDING'").run(sessionId,s.id);
    }
    audit(req,'ATTENDANCE_SAVED','CLASS',c.id,`${date}, ${period}. ders, gelmeyen: ${absentCount}`);return {sessionId,absentCount,saved_timestamp:version};
  })();
  let report=null;
  if(config.APP_MODE==='school'){
    try{report=await require('../attendanceReport').createReport(c,date);}
    catch(e){console.error('Yoklama Excel dosyası oluşturulamadı:',e.message);report={success:false,message:'Excel dosyası oluşturulamadı. Masaüstü klasörü ve izinlerini kontrol edin.'};}
  }
  res.json({success:true,...result,savedAt,export:report,scheduledSendMinutes:30,message:`Yoklama kaydedildi. Gelmeyen: ${result.absentCount}. ${report?(report.success?'Excel raporu Masaüstü/Yoklamalar klasörüne kaydedildi.':report.message):''} ${!(config.EMAIL_ENABLED||config.PUSH_ENABLED)?'Çevrimdışı okul sürümü: e-posta ve push kapalıdır.':date===today()?'Bildirimler 30 dakika sonra işlenir.':'Geçmiş kayıt için bildirim oluşturulmadı.'}`});
});
function queueItem(req,qid){staff(req);const q=db.prepare('SELECT q.*,a.class_id FROM notification_queue q JOIN attendance_sessions a ON a.id=q.session_id WHERE q.id=?').get(id(qid));if(!q)fail(404,'Bildirim bulunamadı.');getClass(req,q.class_id,true);return q;}
router.get('/attendance/queue',(req,res)=>{
  staff(req);const allowed=new Set(classesFor(req).map(c=>c.id));
  const items=db.prepare('SELECT q.*,a.class_id,s.student_no,s.masked_parent_name AS parent_name FROM notification_queue q JOIN attendance_sessions a ON a.id=q.session_id JOIN students s ON s.id=q.student_id ORDER BY q.id DESC').all().filter(q=>allowed.has(q.class_id)).slice(0,100).map(q=>{const seconds=Math.max(0,Math.floor((Math.max(q.scheduled_send_time,q.next_attempt_at)-Date.now())/1000));return {...q,parent_email:maskEmail(q.parent_email),parent_phone:maskPhone(q.parent_phone),remainingSeconds:seconds,remainingFormatted:`${Math.floor(seconds/60)} dk ${seconds%60} sn`};});
  res.json({success:true,queue:items,mail:mailStatus()});
});
router.post('/attendance/queue/:id/send-now',async(req,res)=>{admin(req);const q=queueItem(req,req.params.id);if(q.status!=='PENDING')fail(409,'Yalnızca bekleyen bildirim gönderilebilir.');const r=await deliverNotification(q.id,true);if(!r.success)fail(409,r.error||'Bildirim gönderilemedi.');audit(req,'NOTIFICATION_MANUAL_SEND','NOTIFICATION',q.id);res.json({success:true,message:'E-posta SMTP sunucusu tarafından kabul edildi.'});});
router.post('/attendance/queue/:id/cancel',(req,res)=>{const q=queueItem(req,req.params.id);if(q.status!=='PENDING'||q.processing_since)fail(409,'Bildirim beklemiyor veya gönderim başladı.');db.prepare("UPDATE notification_queue SET status='CANCELLED',response_log=? WHERE id=?").run(text(req.body.reason||'Yetkili tarafından iptal','Gerekçe',500),q.id);audit(req,'NOTIFICATION_CANCELLED','NOTIFICATION',q.id);res.json({success:true,message:'Bildirim iptal edildi.'});});
router.get('/attendance/history',(req,res)=>{
  const c=getClass(req,req.query.classId),date=req.query.date?isoDate(req.query.date):today(),current=studentRows(req,c.id);
  let sql='SELECT DISTINCT s.id,s.student_no,s.masked_name FROM students s JOIN attendance_records r ON r.student_id=s.id JOIN attendance_sessions h ON h.id=r.session_id WHERE h.class_id=? AND h.date=?';const params=[c.id,date];
  if(['parent','student'].includes(req.user.role)){sql+=' AND s.id IN (SELECT student_id FROM student_accounts WHERE user_id=?)';params.push(req.user.id);}
  const students=[...new Map([...current,...db.prepare(sql).all(...params)].map(s=>[s.id,s])).values()].sort((a,b)=>String(a.student_no).localeCompare(String(b.student_no),'tr',{numeric:true}));
  const sessions=db.prepare('SELECT a.*,l.name AS period_name,u.full_name AS teacher_name FROM attendance_sessions a JOIN lesson_periods l ON l.period=a.period JOIN users u ON u.id=a.recorded_by_teacher_id WHERE a.class_id=? AND a.date=? ORDER BY a.period').all(c.id,date).map(s=>({...s,note:['parent','student'].includes(req.user.role)?'':s.note}));
  const matrix=students.map(s=>({student_no:s.student_no,masked_name:s.masked_name,periods:Object.fromEntries(sessions.map(a=>[a.period,db.prepare('SELECT status FROM attendance_records WHERE session_id=? AND student_id=?').get(a.id,s.id)?.status||'-']))}));res.json({success:true,date,sessions,matrix});
});
router.get('/attendance/export',async(req,res)=>{
  staff(req);const c=getClass(req,req.query.classId),start=isoDate(req.query.start||today()),end=isoDate(req.query.end||start);if(start>end)fail(400,'Başlangıç tarihi bitişten sonra olamaz.');
  const ExcelJS=require('exceljs'),wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Yoklama');ws.columns=[{header:'Tarih',key:'date',width:14},{header:'Ders',key:'period',width:8},{header:'No',key:'student_no',width:12},{header:'Öğrenci (maskeli)',key:'masked_name',width:30},{header:'Durum',key:'status',width:14},{header:'Kaydeden',key:'teacher_name',width:25}];
  const rows=db.prepare("SELECT a.date,a.period,s.student_no,s.masked_name,r.status,u.full_name AS teacher_name FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id JOIN students s ON s.id=r.student_id JOIN users u ON u.id=a.recorded_by_teacher_id WHERE a.class_id=? AND a.date BETWEEN ? AND ? AND r.status='GELMEDI' ORDER BY a.date,a.period,CAST(s.student_no AS INTEGER)").all(c.id,start,end);ws.addRows(rows);ws.getRow(1).font={bold:true};audit(req,'ATTENDANCE_EXPORTED','CLASS',c.id);
  const className=String(c.name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,80)||'Sinif';
  const dateName=start.split('-').reverse().join('.');res.attachment(`${className}_${dateName}_${time().replace(':','-')}.xlsx`);res.send(Buffer.from(await wb.xlsx.writeBuffer()));
});
router.get('/students',(req,res)=>{let students=[];for(const c of classesFor(req))if(!req.query.classId||Number(req.query.classId)===c.id)students.push(...studentRows(req,c.id).map(s=>({...s,class_name:c.name})));res.json({success:true,students});});
router.post('/students',(req,res)=>{
  admin(req);const b=req.body,c=getClass(req,b.class_id,true),tc=text(b.tc,'T.C. kimlik',11,true);if(tc&&!/^\d{11}$/.test(tc))fail(400,'Kimlik numarası 11 rakam olmalıdır.');const name=text(b.full_name,'Ad soyad',150),parent=text(b.parent_name,'Veli adı',150,true),mail=email(b.parent_email,true),phone=text(b.parent_phone,'Telefon',30,true),gender=b.gender||null;if(gender&&!['K','E'].includes(gender))fail(400,'Cinsiyet K veya E olmalıdır.');
  const r=db.prepare('INSERT INTO students(school_id,class_id,student_no,encrypted_tc,tc_masked,full_name,masked_name,parent_name,masked_parent_name,parent_email,masked_parent_email,parent_phone,masked_parent_phone,gender,created_at,encrypted_personal_data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(c.school_id,c.id,text(b.student_no,'Okul numarası',30),encryptSensitiveData(tc)||'',maskTC(tc),'',maskFullName(name),'',maskParentName(parent),'',maskEmail(mail),'',maskPhone(phone),gender,nowText(),protectPersonal({full_name:name,parent_name:parent,parent_email:mail,parent_phone:phone}));audit(req,'STUDENT_CREATED','STUDENT',Number(r.lastInsertRowid));res.status(201).json({success:true,message:'Öğrenci kaydedildi.'});
});
router.post('/kvkk/reveal',(req,res)=>{
  admin(req);limit(req,`reveal:${req.user.id}`);const u=db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);if(!verifyPassword(req.body.adminPassword,u.password_hash)){audit(req,'REVEAL_DENIED','STUDENT',req.body.studentId);fail(403,'Kendi yönetici şifrenizle doğrulayın.');}
  const reason=text(req.body.reason,'Erişim gerekçesi',500),s=db.prepare('SELECT * FROM students WHERE id=?').get(id(req.body.studentId));if(!s)fail(404,'Öğrenci bulunamadı.');schoolAccess(req,s.school_id);audit(req,'FULL_RECORD_VIEWED','STUDENT',s.id,reason);res.json({success:true,auditRecorded:true,revealedData:{student_id:s.id,student_no:s.student_no,real_full_name:personalData(s).full_name,real_tc:decryptSensitiveData(s.encrypted_tc)||'',real_parent_name:personalData(s).parent_name,real_parent_phone:personalData(s).parent_phone,real_parent_email:personalData(s).parent_email}});
});
router.post('/e-okul/import-demo-roster',(_req,res)=>res.status(410).json({success:false,message:'Örnek kayıt ekleme kaldırıldı. Gerçek dosya yükleyin.'}));
router.get('/e-okul/download-template',async(req,res)=>{admin(req);res.attachment(req.query.kind==='schedule'?'ders-programi.xlsx':'ogrenci-listesi.xlsx');res.send(req.query.kind==='schedule'?await createScheduleTemplate():await createEOkulTemplateWorkbook());});
router.post('/e-okul/import',express.raw({type:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/octet-stream'],limit:'5mb'}),async(req,res)=>{
  admin(req);const c=getClass(req,req.query.classId,true);if(!Buffer.isBuffer(req.body)||!req.body.length)fail(400,'XLSX veya UTF-8 CSV dosyası yükleyin.');let filename;try{filename=decodeURIComponent(req.get('x-file-name')||'liste.xlsx');}catch{fail(400,'Dosya adı geçersiz.');}const name=text(filename,'Dosya adı',200);if(!/\.(xlsx|csv)$/i.test(name))fail(400,'Yalnızca XLSX veya CSV desteklenir.');const result=await (req.query.kind==='schedule'?parseSchedule:parseEOkulStudentList)(req.body,c.id,req.user.id,req.user.full_name,name);res.json({success:true,...result,message:`${result.count} kayıt işlendi.`});
});
router.get('/homework',(req,res)=>{const allowed=new Set(classesFor(req).map(c=>c.id));res.json({success:true,homeworks:db.prepare('SELECT h.*,c.name AS class_name,u.full_name AS teacher_name FROM homeworks h JOIN classes c ON c.id=h.class_id JOIN users u ON u.id=h.teacher_id ORDER BY h.id DESC').all().filter(h=>allowed.has(h.class_id))});});
router.post('/homework',(req,res)=>{staff(req);const b=req.body,c=getClass(req,b.classId,true);db.prepare('INSERT INTO homeworks(teacher_id,class_id,subject,title,description,due_date,created_at) VALUES(?,?,?,?,?,?,?)').run(req.user.id,c.id,text(b.subject||'Genel','Ders',100),text(b.title,'Başlık',200),text(b.description,'Açıklama',5000,true),isoDate(b.dueDate),nowText());audit(req,'HOMEWORK_CREATED','CLASS',c.id);res.status(201).json({success:true,message:'Ödev eklendi.'});});
router.delete('/homework/:id',(req,res)=>{staff(req);const h=db.prepare('SELECT * FROM homeworks WHERE id=?').get(id(req.params.id));if(!h)fail(404,'Ödev bulunamadı.');getClass(req,h.class_id,true);if(req.user.role==='teacher'&&h.teacher_id!==req.user.id)fail(403,'Yalnızca kendi ödevinizi kaldırabilirsiniz.');db.prepare('DELETE FROM homeworks WHERE id=?').run(h.id);audit(req,'HOMEWORK_DELETED','HOMEWORK',h.id);res.json({success:true});});
router.get('/announcements',(req,res)=>{
  const allowed=new Set(classesFor(req).map(c=>c.id)),isStaff=['admin','teacher','superadmin'].includes(req.user.role);
  const items=db.prepare('SELECT a.*,c.name AS target_class_name FROM announcements a LEFT JOIN classes c ON c.id=a.target_class_id ORDER BY a.id DESC').all().filter(a=>(req.user.role==='superadmin'||a.school_id===req.user.school_id)&& (a.target_type==='CLASS'?allowed.has(a.target_class_id):a.target_type==='STAFF'?isStaff:true));res.json({success:true,announcements:items});
});
router.post('/announcements',(req,res)=>{
  staff(req);const b=req.body,target=b.targetType||'ALL',priority=b.priority||'NORMAL';if(!['ALL','STAFF','CLASS'].includes(target)||!['NORMAL','IMPORTANT','URGENT'].includes(priority))fail(400,'Duyuru türü/önceliği geçersiz.');
  const c=target==='CLASS'?getClass(req,b.targetClassId,true):null;if(req.user.role==='teacher'&&target!=='CLASS')fail(403,'Öğretmenler yalnızca kendi sınıflarına duyuru ekleyebilir.');
  const sid=c?.school_id||(req.user.role==='superadmin'&&b.schoolId?id(b.schoolId):req.user.school_id);schoolAccess(req,sid);db.prepare('INSERT INTO announcements(created_by_id,author_name,author_role,title,content,target_type,target_class_id,priority,created_at,school_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run(req.user.id,req.user.full_name,req.user.title||req.user.role,text(b.title,'Başlık',200),text(b.content,'İçerik',5000),target,c?.id||null,priority,nowText(),sid);audit(req,'ANNOUNCEMENT_CREATED','SCHOOL',sid);res.status(201).json({success:true,message:'Duyuru yayınlandı.'});
});
router.get('/emergency/active',(req,res)=>{const sid=req.user.role==='superadmin'&&req.query.schoolId?id(req.query.schoolId):req.user.school_id;schoolAccess(req,sid);res.json({success:true,activeAlert:db.prepare('SELECT * FROM emergency_alerts WHERE is_active=1 AND school_id=? ORDER BY id DESC LIMIT 1').get(sid)||null});});
router.post('/emergency/trigger',async(req,res)=>{
  admin(req);const sid=req.user.role==='superadmin'?id(req.body.schoolId||req.user.school_id):req.user.school_id;schoolAccess(req,sid);const type=req.body.alertType;if(!['YANGIN','DEPREM','TAHLIYE','GUVENLIK','SAGLIK'].includes(type))fail(400,'Alarm türü geçersiz.');const message=text(req.body.message,'Mesaj',1000);
  db.transaction(()=>{db.prepare('UPDATE emergency_alerts SET is_active=0,resolved_at=? WHERE school_id=? AND is_active=1').run(nowText(),sid);db.prepare('INSERT INTO emergency_alerts(triggered_by_id,triggered_by_name,alert_type,message,is_active,triggered_at,school_id) VALUES(?,?,?,?,1,?,?)').run(req.user.id,req.user.full_name,type,message,nowText(),sid);})();audit(req,'EMERGENCY_TRIGGERED','SCHOOL',sid,type);const activeAlert=db.prepare('SELECT * FROM emergency_alerts WHERE is_active=1 AND school_id=? ORDER BY id DESC LIMIT 1').get(sid);const delivery=await notifyUsers(db.prepare('SELECT id FROM users WHERE school_id=?').all(sid).map(u=>u.id),'Acil durum: '+type,message);res.json({success:true,activeAlert,delivery,message:config.PUSH_ENABLED?'Okul içi alarm ve bildirim merkezi güncellendi; push gönderimi denendi.':'Okul içi alarm ve bildirim merkezi güncellendi. E-posta ve push kapalıdır.'});
});
router.post('/emergency/resolve',(req,res)=>{admin(req);const sid=req.user.role==='superadmin'?id(req.body.schoolId||req.user.school_id):req.user.school_id;schoolAccess(req,sid);db.prepare('UPDATE emergency_alerts SET is_active=0,resolved_at=? WHERE school_id=? AND is_active=1').run(nowText(),sid);audit(req,'EMERGENCY_RESOLVED','SCHOOL',sid);res.json({success:true,message:'Alarm kapatıldı.'});});
router.get('/devices',(req,res)=>{admin(req);res.json({success:true,devices:db.prepare('SELECT d.*,u.full_name,u.role,u.title FROM devices d JOIN users u ON u.id=d.user_id'+(req.user.role==='superadmin'?'':' WHERE u.school_id=?')+' ORDER BY d.id DESC').all(...(req.user.role==='superadmin'?[]:[req.user.school_id])).map(d=>({...d,full_name:['parent','student'].includes(d.role)?maskFullName(d.full_name):d.full_name}))});});
router.post('/devices/:id/toggle-approval',(req,res)=>{admin(req);const d=db.prepare('SELECT d.*,u.school_id,u.role FROM devices d JOIN users u ON u.id=d.user_id WHERE d.id=?').get(id(req.params.id));if(!d)fail(404,'Cihaz bulunamadı.');schoolAccess(req,d.school_id);if(req.user.role!=='superadmin'&&d.role==='superadmin')fail(403,'Bu cihazı yönetemezsiniz.');const approved=d.is_approved?0:1;db.transaction(()=>{db.prepare('UPDATE devices SET is_approved=?,approved_by=?,approved_at=? WHERE id=?').run(approved,req.user.id,nowText(),d.id);if(!approved)db.prepare('DELETE FROM sessions WHERE user_id=?').run(d.user_id);})();audit(req,'DEVICE_APPROVAL_CHANGED','DEVICE',d.id);res.json({success:true,is_approved:approved});});
router.get('/audit-logs',(req,res)=>{admin(req);const logs=(config.APP_MODE==='school'||req.user.role==='superadmin')?db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 150').all():db.prepare('SELECT a.* FROM audit_logs a JOIN users u ON a.user_id=u.id WHERE u.school_id=? ORDER BY a.id DESC LIMIT 150').all(req.user.school_id);res.json({success:true,logs});});
router.get('/notifications/sent',(req,res)=>{admin(req);const notifications=db.prepare('SELECT * FROM sent_notifications'+(req.user.role==='superadmin'?'':' WHERE school_id=?')+' ORDER BY id DESC LIMIT 100').all(...(req.user.role==='superadmin'?[]:[req.user.school_id])).map(n=>({...n,recipient:maskEmail(n.recipient)}));res.json({success:true,notifications});});
router.get('/push/public-key',(_req,res)=>{if(!config.PUSH_ENABLED)fail(409,'Push bildirimleri bu sürümde pasiftir.');res.json({success:true,publicKey:publicKey()});});
router.post('/push/subscribe',(req,res)=>{saveSubscription(req.user.id,req.body);audit(req,'PUSH_SUBSCRIBED','USER',req.user.id);res.json({success:true,message:'Bu cihaz için bildirim aboneliği etkin.'});});
router.post('/push/unsubscribe',(req,res)=>{removeSubscription(req.user.id,req.body.endpoint);res.json({success:true});});
router.get('/notifications/inbox',(req,res)=>res.json({success:true,notifications:db.prepare('SELECT * FROM user_notifications WHERE user_id=? ORDER BY id DESC LIMIT 100').all(req.user.id)}));
router.post('/notifications/broadcast',async(req,res)=>{admin(req);const sid=req.user.role==='superadmin'?id(req.body.schoolId):req.user.school_id;schoolAccess(req,sid);const title=text(req.body.title,'Başlık',150),body=text(req.body.message,'Mesaj',1000);const result=await notifyUsers(db.prepare('SELECT id FROM users WHERE school_id=?').all(sid).map(u=>u.id),title,body);audit(req,'INSTANT_NOTIFICATION','SCHOOL',sid);res.json({success:true,result,message:config.PUSH_ENABLED?'Bildirim merkezine kaydedildi; izinli cihazlara push gönderimi denendi.':'Bildirim okul içindeki bildirim merkezine kaydedildi. E-posta ve push kapalıdır.'});});
router.get('/settings/status',(req,res)=>{admin(req);res.json({success:true,mail:mailStatus(),deviceApprovalRequired:config.REQUIRE_DEVICE_APPROVAL,version:'1.3.1',features:{email:config.EMAIL_ENABLED,push:config.PUSH_ENABLED},deployment:config.APP_MODE});});
module.exports = router;
