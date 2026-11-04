const {test,before,after,mock}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
process.env.APP_MODE='central';process.env.EMAIL_ENABLED='true';process.env.PUSH_ENABLED='true';
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'dersteyim-test-'));
process.env.SMTP_HOST='smtp.test.invalid';process.env.SMTP_FROM='test@example.invalid';
let sendOK=false,mailCount=0,lastMail;
mock.method(require('nodemailer'),'createTransport',()=>({sendMail:async options=>{lastMail=options;mailCount++;if(!sendOK)throw Object.assign(new Error('test failure'),{code:'ETEST'});return {accepted:[options.to],messageId:'test-only'};}}));
const {db,closeDatabase}=require('../backend/db');const {hashPassword,encryptSensitiveData,decryptSensitiveData}=require('../backend/kvkk');const config=require('../backend/config');const {app}=require('../backend/server');const {deliverNotification}=require('../backend/notificationWorker');const ExcelJS=require('exceljs');
const pass='Test-only-pass-2026';let server,base,tokens={},s1,s2,c1,c2,student1,student2,teacher,parent,admin,root;
const req=async(url,body,who,method=body===undefined?'GET':'POST',headers={})=>{const r=await fetch(base+url,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(who?{Authorization:'Bearer '+tokens[who]}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const b=r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer();return {status:r.status,body:b,headers:r.headers};};
before(async()=>{
  const insertSchool=db.prepare('INSERT INTO schools(name,code,created_at) VALUES(?,?,?)');s1=Number(insertSchool.run('Test A','A',config.formatTurkeyDateTime()).lastInsertRowid);s2=Number(insertSchool.run('Test B','B',config.formatTurkeyDateTime()).lastInsertRowid);
  const createUser=(username,role,sid)=>Number(db.prepare('INSERT INTO users(school_id,username,email,password_hash,role,full_name,created_at) VALUES(?,?,?,?,?,?,?)').run(sid,username,username==='root'?config.OWNER_EMAIL:username+'@example.invalid',hashPassword(pass),role,username,config.formatTurkeyDateTime()).lastInsertRowid);
  root=createUser('root','superadmin',s1);admin=createUser('admin','admin',s1);teacher=createUser('teacher','teacher',s1);parent=createUser('parent','parent',s1);createUser('otheradmin','admin',s2);
  c1=Number(db.prepare('INSERT INTO classes(school_id,name,grade_level,section,academic_year) VALUES(?,?,9,?,?)').run(s1,'9-A','A',config.academicYear()).lastInsertRowid);c2=Number(db.prepare('INSERT INTO classes(school_id,name,grade_level,section,academic_year) VALUES(?,?,9,?,?)').run(s2,'9-B','B',config.academicYear()).lastInsertRowid);
  const pupil=(cl,sid,no)=>Number(db.prepare('INSERT INTO students(school_id,class_id,student_no,encrypted_tc,tc_masked,full_name,masked_name,parent_name,masked_parent_name,parent_email,masked_parent_email,parent_phone,masked_parent_phone,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(sid,cl,no,encryptSensitiveData('10000000000'),'100******00','Deneme Öğrenci','Den*** Öğr****','Test Veli','T*** V***','veli@example.invalid','vel*@example.invalid','','',config.formatTurkeyDateTime()).lastInsertRowid);
  student1=pupil(c1,s1,'101');student2=pupil(c2,s2,'201');
  db.prepare('INSERT INTO schedules(teacher_id,class_id,day_of_week,period,subject) VALUES(?,?,?,?,?)').run(teacher,c1,config.turkeyDay(),1,'İngilizce');db.prepare('INSERT INTO school_periods VALUES(?,1,?,?)').run(s1,'00:00','23:59');db.prepare('INSERT INTO student_accounts VALUES(?,?)').run(parent,student1);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  for(const who of ['root','admin','teacher','parent','otheradmin']){const r=await req('/api/auth/login',{usernameOrEmail:who,password:pass});assert.equal(r.status,200);tokens[who]=r.body.token;}
});
after(async()=>{await new Promise(r=>server.close(r));closeDatabase();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
test('5000-compatible app serves real HTML and asset, deep links, health, JSON errors',async()=>{
  const home=await req('/');assert.equal(home.status,200);const html=Buffer.from(home.body).toString();assert.match(html,/<div id="root"><\/div>/);const src=/src="([^"]+\.js)"/.exec(html)[1];assert.equal((await req(src)).status,200);assert.equal((await req('/some/frontend/route')).status,200);assert.equal((await req('/api/unknown',undefined,'admin')).status,404);assert.equal((await req('/api/health')).body.status,'UP');assert.equal((await req('/missing.js')).status,404);
});
test('Unauthenticated APIs denied; developer role bypass removed; malformed input is JSON 400',async()=>{
  for(const p of ['/api/students','/api/users','/api/schools','/api/attendance/queue','/api/audit-logs'])assert.equal((await req(p)).status,401);
  assert.equal((await req('/api/auth/switch-role',{roleOrUsername:'root'})).status,404);
  assert.equal((await req('/api/auth/login',{})).status,400);assert.equal((await req('/api/auth/login',{usernameOrEmail:'root',password:'wrong'})).status,401);
  const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);assert.equal((await r.json()).success,false);
});
test('Same-origin session cookie, foreign origin denied, logout invalidates bearer',async()=>{
  const r=await req('/api/auth/login',{usernameOrEmail:'root',password:pass});assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await req('/api/auth/me',undefined,undefined,'GET',{Cookie:cookie})).status,200);
  assert.equal((await req('/api/schools',{name:'blocked'},'root','POST',{Origin:'https://other.invalid'})).status,403);
  const t=r.body.token;await req('/api/auth/logout',{},undefined,'POST',{Authorization:'Bearer '+t});assert.equal((await req('/api/auth/me',undefined,undefined,'GET',{Authorization:'Bearer '+t})).status,401);
});
test('School isolation and teacher/parent restrictions cannot be spoofed',async()=>{
  assert.equal((await req(`/api/attendance/class-students/${c2}`,undefined,'admin')).status,403);
  assert.equal((await req('/api/users',undefined,'teacher')).status,403);
  assert.equal((await req('/api/schools',{name:'bad'},'admin')).status,403);
  assert.equal((await req('/api/users/create',{creatorId:root,role:'superadmin'},'admin')).status,403);
  assert.equal((await req('/api/attendance/save',{classId:c1,period:1,records:{[student1]:'GELDI'}},'parent')).status,403);
  const p=await req(`/api/attendance/class-students/${c1}`,undefined,'parent');assert.equal(p.body.students.length,1);assert.equal(p.body.students[0].full_name,undefined);
  assert.equal((await req(`/api/attendance/class-students/${c2}`,undefined,'parent')).status,403);
  assert.equal((await req('/api/kvkk/reveal',{studentId:student1,adminPassword:pass,reason:'test'},'teacher')).status,403);
  assert.equal((await req('/api/kvkk/reveal',{studentId:student1,adminPassword:'admin123',reason:'test'},'admin')).status,403);
  const r=await req('/api/kvkk/reveal',{studentId:student1,adminPassword:pass,reason:'Test erişimi'},'admin');assert.equal(r.body.revealedData.real_tc,'10000000000');
});
test('Turkey date/time computed once, ISO dates stable across UTC midnight',()=>{
  assert.equal(config.formatTurkeyDateOnly('2026-10-26T22:15:00Z'),'2026-10-27');assert.equal(config.formatTurkeyTimeOnly('2026-10-26T22:15:00Z'),'01:15');assert.equal(config.turkeyDay('2026-10-25T22:15:00Z'),1);
});
let savedVersion;
test('Attendance complete roster validation, server actor and timestamps, queue cancellation and duplicate guard',async()=>{
  const payload={classId:c1,period:1,records:{[student1]:'GELMEDI'}};
  assert.equal((await req('/api/attendance/save',{...payload,records:{}},'admin')).status,400);
  assert.equal((await req('/api/attendance/save',{...payload,records:{[student2]:'GELDI'}},'admin')).status,400);
  assert.equal((await req('/api/attendance/save',{...payload,records:{[student1]:'FAKE'}},'admin')).status,400);
  const a=await req('/api/attendance/save',{...payload,teacherId:root,simulatedAbsentTime:'fake'},'teacher');assert.equal(a.status,200);savedVersion=a.body.saved_timestamp;
  const sess=db.prepare('SELECT * FROM attendance_sessions WHERE id=?').get(a.body.sessionId);assert.equal(sess.recorded_by_teacher_id,teacher);assert.equal(sess.date,config.formatTurkeyDateOnly());assert.notEqual(sess.saved_at_turkey_time,'fake');
  assert.equal(db.prepare("SELECT count(*) AS n FROM notification_queue WHERE status='PENDING'").get().n,1);
  assert.equal((await req('/api/attendance/save',payload,'teacher')).status,409);
  const b=await req('/api/attendance/save',{...payload,expectedSavedTimestamp:savedVersion},'teacher');assert.equal(b.status,200);savedVersion=b.body.saved_timestamp;assert.equal(db.prepare('SELECT count(*) AS n FROM notification_queue').get().n,1);
  const c=await req('/api/attendance/save',{...payload,expectedSavedTimestamp:savedVersion,records:{[student1]:'GEC'}},'teacher');assert.equal(c.status,200);savedVersion=c.body.saved_timestamp;assert.equal(db.prepare("SELECT status FROM notification_queue").get().status,'CANCELLED');
  const d=await req('/api/attendance/save',{...payload,expectedSavedTimestamp:savedVersion},'teacher');savedVersion=d.body.saved_timestamp;assert.equal(d.status,200);
});
test('SMTP failure never marked sent; pending cancellation prevents send; repeated sends blocked',async()=>{
  const q=db.prepare("SELECT * FROM notification_queue WHERE status='PENDING'").get();const r=await req(`/api/attendance/queue/${q.id}/send-now`,{},'admin');assert.equal(r.status,409);assert.equal(db.prepare('SELECT status FROM notification_queue WHERE id=?').get(q.id).status,'PENDING');assert.equal(db.prepare('SELECT count(*) AS n FROM sent_notifications').get().n,0);
  sendOK=true;const sent=await req(`/api/attendance/queue/${q.id}/send-now`,{},'admin');assert.equal(sent.status,200);assert.equal(db.prepare('SELECT status FROM notification_queue WHERE id=?').get(q.id).status,'SENT');assert.equal(db.prepare('SELECT count(*) AS n FROM sent_notifications').get().n,1);assert.match(lastMail.html,/VarYok/);
  const count=mailCount;assert.equal((await req(`/api/attendance/queue/${q.id}/send-now`,{},'admin')).status,409);assert.equal(mailCount,count);
  const cancelled=db.prepare("SELECT id FROM notification_queue WHERE status='CANCELLED'").get();assert.equal((await deliverNotification(cancelled.id,true)).success,false);assert.equal(mailCount,count);
});
test('History and export read durable saved state; duplicate absences do not resend',async()=>{
  const r=await req(`/api/attendance/history?classId=${c1}`,undefined,'admin');assert.equal(r.body.matrix[0].periods[1],'GELMEDI');
  assert.equal((await req(`/api/attendance/export?classId=${c1}&start=${config.formatTurkeyDateOnly()}`,undefined,'admin')).status,200);
  const n=db.prepare('SELECT count(*) AS n FROM notification_queue').get().n;
  assert.equal((await req('/api/attendance/save',{classId:c1,period:1,records:{[student1]:'GELMEDI'},expectedSavedTimestamp:savedVersion},'teacher')).status,200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM notification_queue').get().n,n);
});
test('Real XLSX upload handles Turkish headers and update without confusing S.No; invalid import rolls back',async()=>{
  async function upload(rows){const w=new ExcelJS.Workbook();const sh=w.addWorksheet('Test');rows.forEach(r=>sh.addRow(r));const buf=await w.xlsx.writeBuffer();const r=await fetch(base+`/api/e-okul/import?classId=${c1}`,{method:'POST',headers:{Authorization:'Bearer '+tokens.admin,'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent('öğrenci.xlsx')},body:buf});return {status:r.status,body:await r.json()};}
  const headers=['S.No','Öğrenci No','Adı Soyadı','T.C. Kimlik No','Veli Adı Soyadı','Veli E-Posta','Cinsiyeti'];
  const a=await upload([headers,[1,'302','Test Aktarım','','Test Veli','','K']]);assert.equal(a.status,200,JSON.stringify(a));assert.equal(a.body.count,1);const imported=db.prepare('SELECT * FROM students WHERE student_no=?').get('302');assert.equal(imported.full_name,'');assert.equal(require('../backend/studentData').personalData(imported).full_name,'Test Aktarım');assert.ok(imported.encrypted_personal_data);
  const b=await upload([headers,[1,'302','Ad Güncellendi','','Test Veli','','K']]);assert.equal(b.status,200);assert.equal(db.prepare('SELECT count(*) AS n FROM students WHERE student_no=?').get('302').n,1);
  const n=db.prepare('SELECT count(*) AS n FROM students').get().n;const bad=await upload([headers,[1,'303','İlk Satır','','','','K'],[2,'304','','','','','K']]);assert.equal(bad.status,400);assert.equal(db.prepare('SELECT count(*) AS n FROM students').get().n,n);
});
test('Announcements/emergency scoped by school; parent cannot publish; staff messages hidden',async()=>{
  assert.equal((await req('/api/announcements',{title:'Staff',content:'private',targetType:'STAFF'},'admin')).status,201);
  assert.equal((await req('/api/announcements',undefined,'parent')).body.announcements.length,0);
  assert.equal((await req('/api/announcements',{title:'Bad',content:'bad'},'parent')).status,403);
  assert.equal((await req('/api/emergency/trigger',{alertType:'YANGIN',message:'Test only'},'admin')).status,200);
  assert.equal((await req('/api/emergency/active',undefined,'otheradmin')).body.activeAlert,null);
  assert.equal((await req('/api/emergency/active',undefined,'parent')).body.activeAlert.message,'Test only');
  assert.equal((await req('/api/emergency/resolve',undefined,'admin','POST')).status,200);
});
test('First login password change enforced and logout after reset invalidates sessions',async()=>{
  const r=await req('/api/users/create',{creatorId:root,role:'teacher',school_id:s2,username:'newteacher',email:'newteacher@example.invalid',password:pass,full_name:'Yeni öğretmen'},'admin');assert.equal(r.status,201);
  const created=db.prepare('SELECT * FROM users WHERE id=?').get(r.body.userId);assert.equal(created.school_id,s1);
  const auth=await req('/api/auth/login',{usernameOrEmail:'newteacher',password:pass});tokens.new=auth.body.token;assert.equal(auth.body.user.must_change_password,true);assert.equal((await req('/api/classes',undefined,'new')).status,403);
  assert.equal((await req('/api/auth/password',{currentPassword:pass,newPassword:'My-new-test-pass-2026'},'new')).status,200);assert.equal((await req('/api/classes',undefined,'new')).status,200);
  assert.equal((await req(`/api/users/${created.id}/reset-password`,{password:'Other-test-password-2026'},'admin')).status,200);assert.equal((await req('/api/auth/me',undefined,'new')).status,401);
});
test('Login throttling cannot be bypassed by forwarded IP header',async()=>{
  let r;for(let i=0;i<16;i++)r=await req('/api/auth/login',{usernameOrEmail:'baduser',password:'wrong'},undefined,'POST',{'X-Forwarded-For':`1.2.3.${i}`});assert.equal(r.status,429);
});

test('Name masking applies to each part including short and multi-part names',()=>{const {maskFullName}=require('../backend/kvkk');assert.equal(maskFullName('Ali Can'),'A** C**');assert.equal(maskFullName('Su Beren Yılmaz'),'S* Ber** Yıl***');assert.equal(maskFullName('Muhammed Emin Berat Aksoy'),'Muh***** Emi* Ber** Aks**');});
test('Only owner can appoint central peers; parent names masked in user, link and device lists',async()=>{for(const [url,key,field] of [['/api/users','users','full_name'],['/api/student-accounts','links','user_name'],['/api/devices','devices','full_name']]){const rows=(await req(url,undefined,'admin')).body[key];const row=rows.find(r=>r.role==='parent'||r.user_id===parent);assert.ok(row,url);assert.notEqual(row[field],'parent');assert.match(row[field],/\*/);} assert.equal((await req('/api/users/create',{role:'superadmin',school_id:s1,username:'peer',email:'peer@example.invalid',password:pass,full_name:'Merkez Yetkilisi'},'root')).status,201);const login=await req('/api/auth/login',{usernameOrEmail:'peer',password:pass});tokens.peer=login.body.token;await req('/api/auth/password',{currentPassword:pass,newPassword:'Changed-peer-pass-2026'},'peer');assert.equal((await req('/api/users/create',{role:'superadmin'},'peer')).status,403);assert.equal((await req(`/api/users/${root}/reset-password`,{password:'Try-new-pass-2026'},'peer')).status,403);});
test('Push subscriptions reject arbitrary endpoints and broadcast is stored without fake sent mail',async()=>{const {validEndpoint}=require('../backend/push');assert.equal(validEndpoint('http://127.0.0.1/private'),false);assert.equal(validEndpoint('https://fcm.googleapis.com.evil.invalid/a'),false);assert.equal(validEndpoint('https://fcm.googleapis.com/test'),true);assert.equal((await req('/api/push/subscribe',{endpoint:'https://evil.invalid/a',keys:{}},'parent')).status,400);assert.ok((await req('/api/push/public-key',undefined,'parent')).body.publicKey);assert.equal((await req('/api/notifications/broadcast',{title:'Duyuru',message:'Deneme'},'admin')).status,200);assert.ok((await req('/api/notifications/inbox',undefined,'parent')).body.notifications.some(n=>n.title==='Duyuru'));assert.equal((await req('/api/notifications/broadcast',{title:'Bad',message:'Bad'},'parent')).status,403);});

test('Schedule file import is atomic, validates same-school teacher and does not duplicate',async()=>{const csv=Buffer.from('Öğretmen Kullanıcı Adı;Gün;Ders Saati;Ders Adı\nteacher;1;8;İngilizce\n');const upload=async b=>{const r=await fetch(base+`/api/e-okul/import?classId=${c1}&kind=schedule`,{method:'POST',headers:{Authorization:'Bearer '+tokens.admin,'Content-Type':'application/octet-stream','X-File-Name':'program.csv'},body:b});return {status:r.status,body:await r.json()};};const a=await upload(csv);assert.equal(a.status,200,JSON.stringify(a));const n=db.prepare('SELECT count(*) AS n FROM schedules').get().n;assert.equal((await upload(csv)).status,200);assert.equal(db.prepare('SELECT count(*) AS n FROM schedules').get().n,n);assert.equal((await upload(Buffer.from('Öğretmen Kullanıcı Adı;Gün;Ders Saati;Ders Adı\nunknown;1;7;Test\n'))).status,400);assert.equal(db.prepare('SELECT count(*) AS n FROM schedules').get().n,n);});
test('Attendance periods remain independent, parent sees own saved period',async()=>{const pupils=db.prepare('SELECT id FROM students WHERE class_id=?').all(c1);const records=Object.fromEntries(pupils.map(s=>[s.id,'GELDI']));const r=await req('/api/attendance/save',{classId:c1,period:2,records},'admin');assert.equal(r.status,200);const h=await req(`/api/attendance/history?classId=${c1}`,undefined,'parent');assert.equal(h.body.matrix.length,1);assert.equal(h.body.matrix[0].periods[1],'GELMEDI');assert.equal(h.body.matrix[0].periods[2],'GELDI');});
