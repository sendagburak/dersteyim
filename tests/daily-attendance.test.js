const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'varyok-daily-'));
process.env.DATA_DIR = path.join(dir, 'data');
process.env.DERSTEYIM_DOCUMENTS_DIR = path.join(dir, 'Documents');
process.env.DERSTEYIM_DESKTOP_DIR = path.join(dir, 'Desktop');
process.env.APP_MODE = 'school';
const {app} = require('../backend/server');
const {db, closeDatabase} = require('../backend/db');
let server, base, token, classId, student1, student2, savedVersions, reportPath;
const day = '2020-01-02';
async function req(url, body) {
  const response = await fetch(base + url, {method: body === undefined ? 'GET' : 'POST', headers: {...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(token ? {Authorization:'Bearer '+token} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
  return {status: response.status, body: await response.json()};
}
async function readWorkbook(fileOrBuffer) {
  const book = new ExcelJS.Workbook();
  if (Buffer.isBuffer(fileOrBuffer)) await book.xlsx.load(fileOrBuffer); else await book.xlsx.readFile(fileOrBuffer);
  return book.worksheets[0];
}
function namedRow(sheet, studentNo) {
  const row = sheet.getRows(2, sheet.rowCount - 1).find(r => String(r.getCell(1).value) === studentNo);
  assert.ok(row, `Öğrenci ${studentNo} raporda olmalı`);
  return row;
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await req('/api/setup/local', {username:'yerel.yonetici', password:'Deneme-Sifresi-2026'})).status, 201);
  token = (await req('/api/auth/login', {usernameOrEmail:'yerel.yonetici', password:'Deneme-Sifresi-2026'})).body.token;
  assert.equal((await req('/api/classes', {grade_level:6, section:'A', academic_year:'2026-2027'})).status, 201);
  classId = (await req('/api/classes')).body.classes[0].id;
  for (const [student_no, full_name] of [['101','Örnek Öğrenci'],['102','İkinci Öğrenci']]) assert.equal((await req('/api/students',{class_id:classId,student_no,full_name})).status,201);
  const students = (await req(`/api/students?classId=${classId}`)).body.students;
  student1 = students.find(s=>s.student_no==='101').id;
  student2 = students.find(s=>s.student_no==='102').id;
  const folder=path.join(process.env.DERSTEYIM_DESKTOP_DIR,'Yoklamalar','05-Ocak','02.01.2020');
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'6-A_02.01.2020_00-00.xlsx'),'eski rapor korunacak');
});
after(async () => { await new Promise(resolve=>server.close(resolve)); closeDatabase(); fs.rmSync(dir,{recursive:true,force:true}); });

test('one daily workbook shows every lesson status and the session explanation', async () => {
  const periods=[1,2,3,4].map(period=>({period,records:{[student1]:period<=3?'GELMEDI':'GELDI',[student2]:'GELDI'},note:period===1?'Ders notu örneği':'',expectedSavedTimestamp:null}));
  const result=await req('/api/attendance/save-batch',{classId,date:day,periods});
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.body.export.success,true);
  savedVersions=Object.fromEntries(result.body.periods.map(p=>[p.period,p.saved_timestamp]));
  const daily=await req(`/api/attendance/daily/${classId}?date=${day}`);
  assert.equal(daily.status,200);assert.equal(daily.body.students.length,2);
  assert.equal(daily.body.periods.find(p=>p.period===1).existingRecords[student1],'GELMEDI');
  assert.equal(daily.body.periods.find(p=>p.period===4).existingRecords[student1],'GELDI');
  assert.equal(daily.body.periods.find(p=>p.period===5).existingSession,null);
  reportPath=result.body.export.filename;
  const folder=path.dirname(reportPath), files=fs.readdirSync(folder).filter(x=>x.endsWith('.xlsx'));
  assert.equal(files.length,2,'eski rapor ve yeni günlük rapor korunmalı');
  assert.equal(fs.readFileSync(path.join(folder,'6-A_02.01.2020_00-00.xlsx'),'utf8'),'eski rapor korunacak');
  const sheet=await readWorkbook(reportPath), header=sheet.getRow(1).values;
  assert.deepEqual(header.slice(3,11),['1. Ders','2. Ders','3. Ders','4. Ders','5. Ders','6. Ders','7. Ders','8. Ders']);
  assert.equal(header[11],'Açıklama');assert.equal(header[12],'Ders Notları');
  const first=namedRow(sheet,'101');
  assert.deepEqual(first.values.slice(3,11),['Gelmedi','Gelmedi','Gelmedi','Geldi','Kayıt yok','Kayıt yok','Kayıt yok','Kayıt yok']);
  assert.match(first.getCell(11).value,/1, 2, 3/);assert.match(first.getCell(11).value,/Gelmedi/);assert.match(first.getCell(12).value,/Ders notu örneği/);
  const second=namedRow(sheet,'102');assert.equal(second.getCell(3).value,'Geldi');assert.equal(second.getCell(6).value,'Geldi');
});

test('a conflicting lesson rolls back the entire multi-period save', async () => {
  const records={[student1]:'GELDI',[student2]:'GELDI'};
  const result=await req('/api/attendance/save-batch',{classId,date:day,periods:[{period:1,records,expectedSavedTimestamp:savedVersions[1]},{period:4,records,expectedSavedTimestamp:123}]});
  assert.equal(result.status,409);
  const existing=await req(`/api/attendance/class-students/${classId}?date=${day}&period=1`);
  assert.equal(existing.body.existingRecords[student1],'GELMEDI');
});

test('later attendance updates the same workbook and manual download has the same matrix', async () => {
  const result=await req('/api/attendance/save-batch',{classId,date:day,periods:[{period:5,records:{[student1]:'GELDI',[student2]:'IZINLI'},note:'',expectedSavedTimestamp:null}]});
  assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.export.filename,reportPath);
  assert.equal(fs.readdirSync(path.dirname(reportPath)).filter(x=>x.endsWith('.xlsx')).length,2);
  const sheet=await readWorkbook(reportPath);assert.equal(namedRow(sheet,'101').getCell(7).value,'Geldi');assert.equal(namedRow(sheet,'102').getCell(7).value,'İzinli');
  const response=await fetch(base+`/api/attendance/export?classId=${classId}&start=${day}&end=${day}`,{headers:{Authorization:'Bearer '+token}});
  assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/6-A_02\.01\.2020_\d{2}-\d{2}\.xlsx/);
  const downloaded=await readWorkbook(Buffer.from(await response.arrayBuffer()));assert.deepEqual(namedRow(downloaded,'101').values.slice(3,8),['Gelmedi','Gelmedi','Gelmedi','Geldi','Geldi']);
});

test('parallel saves for different periods do not create competing files or lose a period', async () => {
  assert.equal((await req('/api/classes',{grade_level:6,section:'B',academic_year:'2026-2027'})).status,201);
  const secondClass=(await req('/api/classes')).body.classes.find(c=>c.name==='6-B').id;
  assert.equal((await req('/api/students',{class_id:secondClass,student_no:'201',full_name:'Üçüncü Öğrenci'})).status,201);
  const student=(await req(`/api/students?classId=${secondClass}`)).body.students[0].id;
  const [first,second]=await Promise.all([1,2].map(period=>req('/api/attendance/save-batch',{classId:secondClass,date:day,periods:[{period,records:{[student]:period===1?'GELMEDI':'GELDI'},expectedSavedTimestamp:null}]})));
  assert.equal(first.status,200,JSON.stringify(first));assert.equal(second.status,200,JSON.stringify(second));
  assert.equal(first.body.export.filename,second.body.export.filename);
  assert.equal(fs.readdirSync(path.dirname(first.body.export.filename)).filter(x=>x.startsWith('6-B_')&&x.endsWith('.xlsx')).length,1);
  const sheet=await readWorkbook(first.body.export.filename),row=namedRow(sheet,'201');
  assert.equal(row.getCell(3).value,'Gelmedi');assert.equal(row.getCell(4).value,'Geldi');
});

test('checkbox selection and a later present lesson keep earlier absences in the exported workbook', async () => {
  const {makeDailyDraft,markStudent}=await import('../client/src/dailyAttendanceState.js');
  assert.equal((await req('/api/classes',{grade_level:6,section:'C',academic_year:'2026-2027'})).status,201);
  const currentClass=(await req('/api/classes')).body.classes.find(c=>c.name==='6-C').id;
  assert.equal((await req('/api/students',{class_id:currentClass,student_no:'301',full_name:'Dördüncü Öğrenci'})).status,201);
  const student=(await req(`/api/students?classId=${currentClass}`)).body.students[0].id;
  const fetchDraft=async()=>makeDailyDraft((await req(`/api/attendance/daily/${currentClass}?date=${day}`)).body.periods);
  const saveDraft=async(draft,periods)=>req('/api/attendance/save-batch',{classId:currentClass,date:day,periods:periods.map(period=>({period,records:draft[period].records,note:draft[period].note,expectedSavedTimestamp:draft[period].version}))});
  let draft=markStudent(await fetchDraft(),[1,2,3],student,'GELMEDI');
  assert.equal((await saveDraft(draft,[1,2,3])).status,200);
  draft=markStudent(await fetchDraft(),[4],student,'GELDI');
  const later=await saveDraft(draft,[4]);assert.equal(later.status,200,JSON.stringify(later));
  const row=namedRow(await readWorkbook(later.body.export.filename),'301');
  assert.deepEqual(row.values.slice(3,8),['Gelmedi','Gelmedi','Gelmedi','Geldi','Kayıt yok']);
});

test('a report write failure preserves the old workbook and reports that the attendance was saved', async () => {
  const original=fs.readFileSync(reportPath),rename=fs.renameSync;
  fs.renameSync=(from,to)=>{if(to===reportPath)throw Object.assign(new Error('File is locked'),{code:'EPERM'});return rename(from,to);};
  try{
    const result=await req('/api/attendance/save-batch',{classId,date:day,periods:[{period:6,records:{[student1]:'GELDI',[student2]:'GELDI'},expectedSavedTimestamp:null}]});
    assert.equal(result.status,200);assert.equal(result.body.export.success,false);
    assert.equal((await req(`/api/attendance/class-students/${classId}?date=${day}&period=6`)).body.existingRecords[student1],'GELDI');
    assert.deepEqual(fs.readFileSync(reportPath),original);
  }finally{fs.renameSync=rename;}
});
