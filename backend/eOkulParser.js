const ExcelJS=require('exceljs');
const {Readable}=require('node:stream');
const {db,logAudit}=require('./db');
const {maskFullName,maskParentName,maskTC,maskEmail,maskPhone,encryptSensitiveData,decryptSensitiveData}=require('./kvkk');
const {protectPersonal,personalData}=require('./studentData');
const {formatTurkeyDateTime}=require('./config');
const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const value=v=>{if(v&&typeof v==='object'){if(v.formula||v.sharedFormula)throw new Error('Formüllü hücreler desteklenmez; değer olarak yapıştırın.');if(v.richText)return v.richText.map(t=>t.text).join('');if(v.text)return String(v.text);return '';}return String(v??'').trim();};
async function loadSheet(buffer,filename){
  const wb=new ExcelJS.Workbook();let ws;
  try {
    if(/\.csv$/i.test(filename)){ws=await wb.csv.read(Readable.from([buffer]),{parserOptions:{delimiter:buffer.toString('utf8').split('\n')[0].includes(';')?';':','}});}
    else {
      const zip=await require('unzipper').Open.buffer(buffer);
      if(zip.files.length>1000||zip.files.reduce((sum,e)=>sum+e.uncompressedSize,0)>25*1024*1024)throw new Error('Dosyanın açılmış boyutu 25 MB sınırını aşıyor.');
      await wb.xlsx.load(buffer,{ignoreNodes:['drawing','picture','extLst','hyperlinks']});ws=wb.worksheets[0];
    }
  }catch(e){throw Object.assign(new Error(`Dosya okunamadı: ${e.message}`),{status:400});}
  if(!ws||ws.rowCount<2||ws.rowCount>2001||ws.columnCount>40)throw Object.assign(new Error('Dosyada 1–2000 öğrenci ve en fazla 40 sütun olmalıdır.'),{status:400});
  return ws;
}
async function parseEOkulStudentList(buffer,classId,userId,userName,filename='liste.xlsx') {
  const c=db.prepare('SELECT * FROM classes WHERE id=?').get(classId);if(!c)throw new Error('Sınıf bulunamadı.');
  const ws=await loadSheet(buffer,filename);
  const headers=ws.getRow(1).values.map(norm);
  const get=(row,names)=>{for(const n of names){const i=headers.indexOf(n);if(i>0)return value(row.getCell(i).value);}return '';};
  const rows=[],seen=new Set(),errors=[];
  for(let i=2;i<=ws.rowCount;i++){
    const r=ws.getRow(i);if(!r.hasValues)continue;
    try{
      const no=get(r,['ogrencino','okulno','okulnumarasi','ogrencinumarasi','numara']),name=get(r,['adisoyadi','adsoyad','ogrenciadisoyadi','ogrenciadi']);
      const tc=get(r,['tckimlikno','tckimliknumarasi','tcno','tc']),parent=get(r,['veliadisoyadi','veliadsoyad','veliadi','veli']),mail=get(r,['velieposta','veliepostaadresi','eposta','email']),phone=get(r,['veliceptelefonu','velitelefonu','telefon','gsm']),gender=get(r,['cinsiyeti','cinsiyet']).toLocaleUpperCase('tr-TR');
      if(!no||no.length>30||!name||name.length>150)throw new Error('Öğrenci No ve Adı Soyadı zorunludur.');
      if(seen.has(no))throw new Error('Okul numarası dosyada tekrarlanıyor.');seen.add(no);
      if(tc&&!/^\d{11}$/.test(tc))throw new Error('T.C. kimlik 11 rakam olmalıdır.');
      if(parent.length>150||phone.length>30||mail.length>254)throw new Error('Veli bilgileri çok uzun.');
      if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))throw new Error('Veli e-posta adresi geçersiz.');
      if(gender&&!['K','E'].includes(gender))throw new Error('Cinsiyet K veya E olmalıdır.');
      rows.push({no,name,tc,parent,mail:mail.toLowerCase(),phone,gender:gender||null});
    }catch(e){errors.push(`Satır ${i}: ${e.message}`);}
  }
  if(errors.length)throw Object.assign(new Error(errors.slice(0,10).join('\n')+'\nHiçbir kayıt değiştirilmedi.'),{status:400});
  if(!rows.length)throw Object.assign(new Error('İçe aktarılabilir öğrenci yok.'),{status:400});
  const stmt=db.prepare(`INSERT INTO students(school_id,class_id,student_no,encrypted_tc,tc_masked,full_name,masked_name,parent_name,masked_parent_name,parent_email,masked_parent_email,parent_phone,masked_parent_phone,gender,created_at,encrypted_personal_data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(school_id,student_no) DO UPDATE SET class_id=excluded.class_id,encrypted_tc=excluded.encrypted_tc,tc_masked=excluded.tc_masked,full_name=excluded.full_name,masked_name=excluded.masked_name,parent_name=excluded.parent_name,masked_parent_name=excluded.masked_parent_name,parent_email=excluded.parent_email,masked_parent_email=excluded.masked_parent_email,parent_phone=excluded.parent_phone,masked_parent_phone=excluded.masked_parent_phone,gender=excluded.gender,encrypted_personal_data=excluded.encrypted_personal_data`);
  db.transaction(()=>{
    for(const s of rows){
      const old=db.prepare('SELECT * FROM students WHERE school_id=? AND student_no=?').get(c.school_id,s.no);
      if(old && db.prepare('SELECT 1 FROM notification_queue WHERE student_id=? AND processing_since IS NOT NULL').get(old.id))throw Object.assign(new Error('Bir öğrenci için bildirim gönderimi sürüyor. Daha sonra tekrar deneyin.'),{status:409});
      if(old&&old.class_id!==c.id)db.prepare("UPDATE notification_queue SET status='CANCELLED',response_log='Öğrenci sınıfı değişti' WHERE student_id=? AND status='PENDING'").run(old.id);
      if(old){const previous=personalData(old);const previousTC=old.encrypted_tc?decryptSensitiveData(old.encrypted_tc):'';if(previousTC===null)throw new Error('Öğrenci kimlik verisi çözülemedi. Şifreleme anahtarını kontrol edin.');s.tc=s.tc||previousTC;s.parent=s.parent||previous.parent_name||'';s.mail=s.mail||previous.parent_email||'';s.phone=s.phone||previous.parent_phone||'';s.gender=s.gender||old.gender||null;}
      stmt.run(c.school_id,c.id,s.no,encryptSensitiveData(s.tc)||'',maskTC(s.tc),'',maskFullName(s.name),'',maskParentName(s.parent),'',maskEmail(s.mail),'',maskPhone(s.phone),s.gender,formatTurkeyDateTime(),protectPersonal({full_name:s.name,parent_name:s.parent,parent_email:s.mail,parent_phone:s.phone}));
    }
    logAudit({user_id:userId,user_name:userName,role:'admin',action:'STUDENT_LIST_IMPORTED',resource_type:'CLASS',resource_id:c.id,details:`${rows.length} kayıt içe aktarıldı.`});
  })();
  return {count:rows.length,errors:[]};
}
async function createEOkulTemplateWorkbook(){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Öğrenci Listesi');ws.addRow(['Öğrenci No','T.C. Kimlik No','Adı Soyadı','Cinsiyeti','Veli Adı Soyadı','Veli E-Posta','Veli Cep Telefonu']);ws.addRow(['ORNEK-001','','Örnek Öğrenci','K','Örnek Veli','','']);ws.columns.forEach(c=>c.width=24);ws.getRow(1).font={bold:true};return Buffer.from(await wb.xlsx.writeBuffer());}
async function createScheduleTemplate(){const w=new ExcelJS.Workbook(),s=w.addWorksheet('Ders Programı');s.addRow(['Öğretmen Kullanıcı Adı','Gün','Ders Saati','Ders Adı']);s.addRow(['ogretmen.kullaniciadi',1,1,'İngilizce']);s.columns.forEach(c=>c.width=30);return Buffer.from(await w.xlsx.writeBuffer());}
async function parseSchedule(buffer,classId,userId,userName,filename){
  const sheet=await loadSheet(buffer,filename),headers=sheet.getRow(1).values.map(norm),rows=[];
  const c=db.prepare('SELECT school_id FROM classes WHERE id=?').get(classId);
  const cols=['ogretmenkullaniciadi','gun','derssaati','dersadi'].map(h=>headers.indexOf(h));if(cols.some(i=>i<1))throw Object.assign(new Error('Ders programı sütunları şablonla eşleşmiyor.'),{status:400});
  for(let i=2;i<=sheet.rowCount;i++){const row=sheet.getRow(i);if(!row.hasValues)continue;const [username,dayValue,periodValue,subject]=cols.map(n=>value(row.getCell(n).value));const teacher=db.prepare("SELECT * FROM users WHERE username=? AND role='teacher' AND school_id=?").get(username,c.school_id),day=Number(dayValue),period=Number(periodValue);if(!teacher||!Number.isInteger(day)||day<1||day>7||!Number.isInteger(period)||period<1||period>8||!subject||subject.length>100)throw Object.assign(new Error(`Satır ${i}: Öğretmen, gün, saat veya ders adı geçersiz. Hiçbir ders eklenmedi.`),{status:400});rows.push({teacher,day,period,subject});}
  db.transaction(()=>{for(const r of rows){const existing=db.prepare('SELECT * FROM schedules WHERE class_id=? AND day_of_week=? AND period=?').get(classId,r.day,r.period);if(existing){if(existing.teacher_id===r.teacher.id&&existing.subject===r.subject)continue;throw Object.assign(new Error('Sınıfın bu saatinde ders var. Mevcut dersi program ekranından kaldırın.'),{status:409});}db.prepare('INSERT INTO schedules(teacher_id,class_id,day_of_week,period,subject) VALUES(?,?,?,?,?)').run(r.teacher.id,classId,r.day,r.period,r.subject);}logAudit({user_id:userId,user_name:userName,role:'admin',action:'SCHEDULE_IMPORTED',resource_type:'CLASS',resource_id:classId,details:`${rows.length} program satırı işlendi.`});})();return {count:rows.length};
}
module.exports={parseEOkulStudentList,createEOkulTemplateWorkbook,parseSchedule,createScheduleTemplate};
