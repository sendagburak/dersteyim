const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const ExcelJS = require('exceljs');
const {JSDOM} = require('../client/node_modules/jsdom');
const React = require('../client/node_modules/react');
const {createRoot} = require('../client/node_modules/react-dom/client');
const {act} = React;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'varyok-ui-'));
process.env.DATA_DIR = path.join(dir, 'data');
process.env.DERSTEYIM_DOCUMENTS_DIR = path.join(dir, 'Documents');
process.env.DERSTEYIM_DESKTOP_DIR = path.join(dir, 'Desktop');
process.env.APP_MODE = 'school';
const {app} = require('../backend/server');
const {closeDatabase} = require('../backend/db');
const day = '2020-01-02';
let server, base, token, classId, vite, dom, root, DailyAttendance;

async function req(url, body) {
  const response = await fetch(base + url, {method:body === undefined ? 'GET' : 'POST', headers:{...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(token ? {Authorization:'Bearer '+token} : {})}, body:body === undefined ? undefined : JSON.stringify(body)});
  const json = await response.json();
  assert.ok(response.ok, `${url}: ${JSON.stringify(json)}`);
  return json;
}
async function waitFor(predicate, message) {
  for (let i=0; i<100; i++) {
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
    if (predicate()) return;
  }
  assert.fail(message);
}
function button(text, within=document) {
  const result = [...within.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
  assert.ok(result, `Düğme bulunamadı: ${text}`);
  return result;
}
async function click(element) { await act(async()=>{element.click();}); }
function lessonButton(studentNo,period,status) {
  const group=document.querySelector(`[role="group"][aria-label="${studentNo} numaralı öğrenci ${period}. ders durumu"]`);
  assert.ok(group, `${studentNo} numaralı öğrencinin ${period}. dersi bulunamadı`);
  return button(status,group);
}
async function exportedRows() {
  const response=await fetch(base+`/api/attendance/export?classId=${classId}&start=${day}&end=${day}`,{headers:{Authorization:'Bearer '+token}});
  assert.equal(response.status,200);
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  return workbook.worksheets[0].getRows(2,workbook.worksheets[0].rowCount-1);
}

before(async()=>{
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base='http://127.0.0.1:'+server.address().port;
  await req('/api/setup/local',{username:'ornek.yonetici',password:'Deneme-Sifresi-2026'});
  token=(await req('/api/auth/login',{usernameOrEmail:'ornek.yonetici',password:'Deneme-Sifresi-2026'})).token;
  await req('/api/classes',{grade_level:6,section:'A',academic_year:'2026-2027'});
  classId=(await req('/api/classes')).classes[0].id;
  await req('/api/students',{class_id:classId,student_no:'101',full_name:'Örnek Öğrenci'});
  await req('/api/students',{class_id:classId,student_no:'102',full_name:'İkinci Öğrenci'});
  dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:base});
  global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;
  Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
  global.IS_REACT_ACT_ENVIRONMENT=true;
  const {createServer}=await import(pathToFileURL(path.resolve(__dirname,'../client/node_modules/vite/dist/node/index.js')).href);
  vite=await createServer({root:path.resolve(__dirname,'../client'),server:{middlewareMode:true},appType:'custom'});
  ({default:DailyAttendance}=await vite.ssrLoadModule('/src/DailyAttendance.jsx'));
  root=createRoot(document.getElementById('root'));
  const request=(url,options={})=>fetch(base+url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}});
  await act(async()=>root.render(React.createElement(DailyAttendance,{request,classes:[{id:classId,name:'6-A',academic_year:'2026-2027'}],periods:[],classId,date:day,today:day,onClassChange:()=>{},onDateChange:()=>{},downloadFile:()=>{},onDirtyChange:()=>{}})));
  await waitFor(()=>document.body.textContent.includes('Öğrenciler (2)'),'Öğrenciler yüklenmedi.');
});
after(async()=>{
  if(root)await act(async()=>root.unmount());
  if(vite)await vite.close();
  if(dom)dom.window.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  closeDatabase();fs.rmSync(dir,{recursive:true,force:true});
});

test('seçili kalan önceki saatler, sonraki saat geldi yapılınca ve Excel kaydedilince değişmez',async()=>{
  const checkboxes=[...document.querySelectorAll('.attendance-period-checkbox')];
  assert.equal(checkboxes.length,8);
  await click(checkboxes[1]);await click(checkboxes[2]);
  for(const period of [1,2,3])await click(lessonButton('101',period,'Gelmedi'));
  await click(checkboxes[3]);
  await click(lessonButton('101',4,'Geldi'));
  await click(button('Seçili derslerin yoklamasını kaydet'));
  await waitFor(()=>!document.querySelector('.attendance-period-checkbox').checked,'Yoklama kaydedilmedi.');
  let rows=await exportedRows();
  const row=rows.find(item=>String(item.getCell(1).value)==='101');
  assert.ok(row);
  assert.deepEqual(row.values.slice(3,8),['Gelmedi','Gelmedi','Gelmedi','Geldi','Kayıt yok']);
  const other=rows.find(item=>String(item.getCell(1).value)==='102');
  assert.deepEqual(other.values.slice(3,7),['Geldi','Geldi','Geldi','Geldi']);

  // Eski saatler seçili kalsa bile gün içindeki sonraki tüm değişimler ayrı kalır.
  for(const checkbox of checkboxes)await click(checkbox);
  await click(lessonButton('101',5,'Geç'));
  await click(lessonButton('101',6,'İzinli'));
  await click(lessonButton('101',7,'Gelmedi'));
  await click(lessonButton('101',8,'Geldi'));
  await click(button('Seçili derslerin yoklamasını kaydet'));
  await waitFor(()=>!document.querySelector('.attendance-period-checkbox').checked,'İkinci yoklama kaydedilmedi.');
  rows=await exportedRows();
  const updated=rows.find(item=>String(item.getCell(1).value)==='101');
  assert.deepEqual(updated.values.slice(3,11),['Gelmedi','Gelmedi','Gelmedi','Geldi','Geç','İzinli','Gelmedi','Geldi']);
});
