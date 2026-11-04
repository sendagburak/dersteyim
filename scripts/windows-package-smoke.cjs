// Exercises the actual unpacked Windows application with synthetic data only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const ExcelJS = require('exceljs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  if (process.platform !== 'win32') throw new Error('Bu test yalnızca Windows üzerinde çalışır.');
  const exe = path.resolve(process.argv[2] || '');
  assert.ok(fs.existsSync(exe), `EXE bulunamadı: ${exe}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dersteyim-smoke-'));
  const profile = path.join(tmp, 'Profile');
  const documents = path.join(tmp, 'Documents');
  const desktop = path.join(tmp, 'Desktop');
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(exe, [], {
    env: { ...process.env, DERSTEYIM_TEST_PROFILE_DIR: profile, DERSTEYIM_DOCUMENTS_DIR: documents, DERSTEYIM_DESKTOP_DIR: desktop },
    stdio: 'ignore', windowsHide: false
  });
  let spawnError;
  child.once('error', error => { spawnError = error; });
  let control;
  try {
    const controlFile = path.join(profile, 'okul-verileri', 'server-control.json');
    for (let i = 0; i < 180; i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`EXE erken kapandı: ${child.exitCode}`);
      try { control = JSON.parse(fs.readFileSync(controlFile, 'utf8')); break; } catch {}
      await delay(500);
    }
    assert.ok(control && Number.isInteger(control.port), 'Paketlenmiş uygulama zamanında başlamadı.');
    const base = `http://127.0.0.1:${control.port}`;
    async function request(route, body, token) {
      const response = await fetch(base + route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)
      });
      const json = await response.json();
      assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(json)}`);
      return json;
    }
    const health = await request('/api/health');
    assert.equal(health.application, 'dersteyim');
    assert.equal(health.instanceId, control.instanceId);
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /<html/i);
    await request('/api/setup/local', { username: 'ornek.yonetim', password: 'Ornek-Yalnizca-Test-2026' });
    const login = await request('/api/auth/login', { usernameOrEmail: 'ornek.yonetim', password: 'Ornek-Yalnizca-Test-2026' });
    assert.equal(login.user.role, 'admin');
    const token = login.token;
    await request('/api/classes', { grade_level: 6, section: 'A', academic_year: '2035-2036' }, token);
    const classes = await request('/api/classes', undefined, token);
    const cls = classes.classes.find(item => item.name === '6-A' && item.academic_year === '2035-2036');
    assert.ok(cls, 'Gelecek eğitim yılı sınıfı oluşturulamadı.');
    await request('/api/students', { class_id: cls.id, student_no: '101', full_name: 'Deneme Öğrenci' }, token);
    const students = await request(`/api/students?classId=${cls.id}`, undefined, token);
    const pupil = students.students.find(item => item.student_no === '101');
    assert.ok(pupil, 'Örnek öğrenci oluşturulamadı.');
    const lessons = [1,2,3,4].map(period => ({period, records:{[pupil.id]:period<=3?'GELMEDI':'GELDI'}, expectedSavedTimestamp:null, note:period===1?'Örnek ders notu':''}));
    const saved = await request('/api/attendance/save-batch', { classId: cls.id, periods: lessons }, token);
    assert.equal(saved.export.success, true, 'Excel raporu yazılamadı.');
    const reportsRoot = path.join(desktop, 'Yoklamalar');
    const reports = fs.readdirSync(reportsRoot, { recursive: true }).filter(name => String(name).endsWith('.xlsx'));
    assert.equal(reports.length, 1);
    assert.match(String(reports[0]), /6-A_\d{2}\.\d{2}\.\d{4}_\d{2}-\d{2}\.xlsx$/);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(reportsRoot, reports[0]));
    const row=workbook.worksheets[0].getRow(2);
    assert.equal(String(row.getCell(1).value),'101');
    assert.deepEqual(row.values.slice(3,8),['Gelmedi','Gelmedi','Gelmedi','Geldi','Kayıt yok']);
    assert.match(row.getCell(11).value,/Gelmedi/);assert.match(row.getCell(12).value,/Örnek ders notu/);
    const later=await request('/api/attendance/save-batch',{classId:cls.id,periods:[{period:5,records:{[pupil.id]:'GELDI'},expectedSavedTimestamp:null}]},token);
    assert.equal(later.export.filename,saved.export.filename);
    const updatedReports=fs.readdirSync(reportsRoot,{recursive:true}).filter(name=>String(name).endsWith('.xlsx'));
    assert.equal(updatedReports.length,1,'Gün içinde sınıf için tek güncel rapor bulunmalı.');
    const updated=new ExcelJS.Workbook();await updated.xlsx.readFile(saved.export.filename);
    assert.equal(updated.worksheets[0].getRow(2).getCell(7).value,'Geldi');
    const credentialsRoot = path.join(documents, 'VarYok');
    assert.ok(fs.readdirSync(credentialsRoot, { recursive: true }).some(name => String(name).endsWith('.txt')));
    console.log('Paketlenmiş EXE başladı; örnek hesap, gelecek yıl ve yoklama XLSX kontrol edildi.');
  } finally {
    if (control?.token) {
      try { await fetch(`http://127.0.0.1:${control.port}/internal/shutdown`, { method: 'POST', headers: { 'X-Control-Token': control.token }, signal: AbortSignal.timeout(2000) }); } catch {}
    }
    if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    await delay(500);
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
