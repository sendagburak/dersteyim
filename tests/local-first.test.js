const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dersteyim-local-'));
process.env.DATA_DIR=path.join(dir,'data');process.env.APP_MODE='school';
process.env.EMAIL_ENABLED='true';process.env.PUSH_ENABLED='true';process.env.DERSTEYIM_DOCUMENTS_DIR=path.join(dir,'Documents');process.env.DERSTEYIM_DESKTOP_DIR=path.join(dir,'Desktop');
const {app}=require('../backend/server');const {db,closeDatabase}=require('../backend/db');
const ExcelJS=require('exceljs');
let server,base,token,classId,studentId,version;
const req=async(url,body,auth=token)=>{const r=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(auth?{Authorization:'Bearer '+auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(r=>server.close(r));closeDatabase();fs.rmSync(dir,{recursive:true,force:true});});
test('first user initializes one local school without a grant and receives a local credential file',async()=>{
  assert.equal((await req('/api/setup/status')).body.activated,false);
  const bad=await req('/api/setup/local',{username:'okul',password:'short'},null);assert.equal(bad.status,400);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,0);
  const result=await req('/api/setup/local',{username:'okul.yonetim',password:'Ornek-Yalnizca-Test-2026'},null);
  assert.equal(result.status,201,JSON.stringify(result));assert.equal((await req('/api/setup/status')).body.activated,true);
  assert.equal((await req('/api/setup/local',{username:'ikinci',password:'Baska-Yalnizca-Test-2026'},null)).status,409);
  const entries=fs.readdirSync(path.join(process.env.DERSTEYIM_DOCUMENTS_DIR,'VarYok'),{recursive:true}).filter(x=>x.endsWith('.txt'));
  assert.equal(entries.length,1);const contents=fs.readFileSync(path.join(process.env.DERSTEYIM_DOCUMENTS_DIR,'VarYok',entries[0]),'utf8');
  assert.match(contents,/okul\.yonetim/);assert.match(contents,/Ornek-Yalnizca-Test-2026/);
  const auth=await req('/api/auth/login',{usernameOrEmail:'okul.yonetim',password:'Ornek-Yalnizca-Test-2026'},null);assert.equal(auth.status,200);token=auth.body.token;assert.equal(auth.body.user.role,'admin');
});
test('the first local account can start and resolve an emergency without any extra users',async()=>{
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);
  const started=await req('/api/emergency/trigger',{alertType:'DEPREM',message:'Yalnızca test amaçlı.'});
  assert.equal(started.status,200,JSON.stringify(started));
  assert.equal(started.body.activeAlert.alert_type,'DEPREM');
  assert.equal((await req('/api/emergency/active')).body.activeAlert.alert_type,'DEPREM');
  assert.equal((await req('/api/emergency/resolve',{})).status,200);
  assert.equal((await req('/api/emergency/active')).body.activeAlert,null);
});
test('attendance creates daily class XLSX of absent students in month/day folders',async()=>{
  const c=await req('/api/classes',{grade_level:6,section:'A',academic_year:'2026-2027'});assert.equal(c.status,201);classId=db.prepare('SELECT id FROM classes').get().id;
  assert.equal((await req('/api/students',{class_id:classId,student_no:'101',full_name:'Deneme Öğrenci',parent_name:'Test Veli'})).status,201);
  studentId=db.prepare('SELECT id FROM students').get().id;
  const r=await req('/api/attendance/save',{classId,period:1,records:{[studentId]:'GELMEDI'}});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.export.success,true,JSON.stringify(r));version=r.body.saved_timestamp;
  const exportRoot=path.join(process.env.DERSTEYIM_DESKTOP_DIR,'Yoklamalar');const entries=fs.readdirSync(exportRoot,{recursive:true});
  assert.ok(entries.some(x=>x.startsWith('01-Eylül')));assert.ok(entries.some(x=>x.startsWith('11-Temmuz')));
  const reports=entries.filter(x=>x.endsWith('.xlsx'));assert.equal(reports.length,1);assert.match(reports[0],/6-A_\d{2}\.\d{2}\.\d{4}_\d{2}-\d{2}\.xlsx$/);
  const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(path.join(exportRoot,reports[0]));assert.match(JSON.stringify(wb.worksheets[0].getSheetValues()),/Den/);assert.match(JSON.stringify(wb.worksheets[0].getSheetValues()),/101/);
});
test('updating a saved lesson writes a fresh report and does not overwrite the earlier file',async()=>{
  const r=await req('/api/attendance/save',{classId,period:1,records:{[studentId]:'GELDI'},expectedSavedTimestamp:version});assert.equal(r.status,200);assert.equal(r.body.export.success,true);
  const root=path.join(process.env.DERSTEYIM_DESKTOP_DIR,'Yoklamalar');assert.equal(fs.readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.xlsx')).length,2);
});
test('password change updates the local credentials file',async()=>{
  const r=await req('/api/auth/password',{currentPassword:'Ornek-Yalnizca-Test-2026',newPassword:'Degistirilmis-Test-2026'});assert.equal(r.status,200);
  const root=path.join(process.env.DERSTEYIM_DOCUMENTS_DIR,'VarYok');const entry=fs.readdirSync(root,{recursive:true}).find(x=>x.endsWith('.txt'));const contents=fs.readFileSync(path.join(root,entry),'utf8');assert.match(contents,/Degistirilmis-Test-2026/);assert.doesNotMatch(contents,/Ornek-Yalnizca-Test-2026/);
});
test('additional local user credentials are saved and password reset replaces the correct file',async()=>{
 const initial='Ogretmen-Test-Sifresi-2026',changed='Yenilenmis-Test-Sifresi-2026';
 const create=await req('/api/users/create',{role:'teacher',username:'test.ogretmen',email:'teacher@example.invalid',password:initial,full_name:'Test Öğretmen'});assert.equal(create.status,201,JSON.stringify(create));
 const root=path.join(process.env.DERSTEYIM_DOCUMENTS_DIR,'VarYok');
 const txt=()=>fs.readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.txt')).map(x=>fs.readFileSync(path.join(root,x),'utf8'));
 assert.ok(txt().some(x=>x.includes('test.ogretmen')&&x.includes(initial)));
 const reset=await req(`/api/users/${create.body.userId}/reset-password`,{password:changed});assert.equal(reset.status,200);assert.ok(txt().some(x=>x.includes('test.ogretmen')&&x.includes(changed)));assert.ok(!txt().some(x=>x.includes(initial)));
});
test('manual class export contains absences only and uses the class, date, and time in its filename',async()=>{
 const saved=await req('/api/attendance/save',{classId,period:2,records:{[studentId]:'GELMEDI'}});assert.equal(saved.status,200);
 const res=await fetch(base+`/api/attendance/export?classId=${classId}`,{headers:{Authorization:'Bearer '+token}});assert.equal(res.status,200);assert.match(res.headers.get('content-disposition'),/6-A_\d{2}\.\d{2}\.\d{4}_\d{2}-\d{2}/);
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));const contents=JSON.stringify(wb.worksheets[0].getSheetValues());assert.match(contents,/GELMEDI/);assert.doesNotMatch(contents,/GELDI/);
});
test('backup copies a consistent database and encryption key under Documents',async()=>{
 const r=await req('/api/system/backup',{});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.success,true);assert.ok(r.body.path.startsWith(process.env.DERSTEYIM_DOCUMENTS_DIR));
 assert.ok(fs.existsSync(path.join(r.body.path,'eyoklama.db')));assert.ok(fs.existsSync(path.join(r.body.path,'encryption-key.json')));
 const {DatabaseSync}=require('node:sqlite');const snapshot=new DatabaseSync(path.join(r.body.path,'eyoklama.db'),{readOnly:true});try{assert.equal(snapshot.prepare('SELECT COUNT(*) n FROM students').get().n,1);assert.ok(snapshot.prepare('SELECT COUNT(*) n FROM attendance_records').get().n>0);}finally{snapshot.close();}
});
test('a report write failure is reported without losing the saved attendance',async()=>{
 const prior=process.env.DERSTEYIM_DESKTOP_DIR;const bad=path.join(dir,'not-a-desktop');fs.writeFileSync(bad,'not a directory');process.env.DERSTEYIM_DESKTOP_DIR=bad;
 try{const r=await req('/api/attendance/save',{classId,period:3,records:{[studentId]:'GELMEDI'}});assert.equal(r.status,200);assert.equal(r.body.export.success,false);assert.match(r.body.message,/oluşturulamadı/);assert.equal(db.prepare('SELECT count(*) n FROM attendance_sessions WHERE id=?').get(r.body.sessionId).n,1);}
 finally{process.env.DERSTEYIM_DESKTOP_DIR=prior;}
});
test('school mode rejects foreign Host names and foreign-origin writes',async()=>{
 const badStatus=await new Promise((resolve,reject)=>{const http=require('node:http'),u=new URL(base+'/api/setup/status');const r=http.request(u,{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});assert.equal(badStatus,403);
 const cross=await fetch(base+'/api/system/backup',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}'});assert.equal(cross.status,403);
});

test('school mode keeps email and push disabled even if flags are enabled',async()=>{const s=await req('/api/setup/status');assert.equal(s.body.features.email,false);assert.equal(s.body.features.push,false);const r=await req('/api/push/public-key');assert.equal(r.status,409);});
