const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const ExcelJS=require('exceljs');
const {db}=require('./db');const config=require('./config');const {knownFolder}=require('./localFiles');
const MONTHS=['05-Ocak','06-Şubat','07-Mart','08-Nisan','09-Mayıs','10-Haziran','11-Temmuz','12-Ağustos','01-Eylül','02-Ekim','03-Kasım','04-Aralık'];
const STATUS={GELDI:'Geldi',GELMEDI:'Gelmedi',GEC:'Geç',IZINLI:'İzinli'};
const COLORS={'Geldi':'E4F4EC','Gelmedi':'FCE7E7','Geç':'FFF3D4','İzinli':'E8EEFF','Kayıt yok':'F1F3F5'};
const reportLocks=new Map();
function root(){return path.join(knownFolder('Desktop'),'Yoklamalar');}
function ensureFolders(){const base=root();for(const month of MONTHS.filter(m=>m!=='12-Ağustos'))fs.mkdirSync(path.join(base,month),{recursive:true,mode:0o700});return base;}
function safeName(value){const name=String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,80);return name||'Sinif';}
function dateLabel(date){return date.split('-').reverse().join('.');}
function reportName(schoolClass,date,at=new Date()){return `${safeName(schoolClass.name)}_${dateLabel(date)}_${config.formatTurkeyTimeOnly(at).replace(':','-')}.xlsx`;}
function addDailySheet(book,schoolClass,date,title='Günlük Yoklama'){
  const sessions=db.prepare('SELECT id,period,note FROM attendance_sessions WHERE class_id=? AND date=? ORDER BY period').all(schoolClass.id,date);
  const pupils=db.prepare(`SELECT s.id,s.student_no,s.masked_name FROM students s WHERE s.class_id=? OR EXISTS
    (SELECT 1 FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id WHERE r.student_id=s.id AND a.class_id=? AND a.date=?)
    ORDER BY CAST(s.student_no AS INTEGER),s.student_no`).all(schoolClass.id,schoolClass.id,date);
  const records=db.prepare(`SELECT a.period,r.student_id,r.status FROM attendance_records r
    JOIN attendance_sessions a ON a.id=r.session_id WHERE a.class_id=? AND a.date=?`).all(schoolClass.id,date);
  const states=new Map(records.map(r=>[`${r.student_id}:${r.period}`,STATUS[r.status]||'Kayıt yok']));
  const notes=sessions.filter(s=>s.note).map(s=>`${s.period}. ders: ${s.note}`).join(' | ');
  const sheet=book.addWorksheet(title);
  sheet.columns=[{header:'Öğrenci No',key:'student_no',width:12},{header:'Öğrenci (maskeli)',key:'student',width:24},
    ...Array.from({length:8},(_,i)=>({header:`${i+1}. Ders`,key:`period${i+1}`,width:11})),
    {header:'Açıklama',key:'summary',width:38},{header:'Ders Notları',key:'notes',width:30}];
  sheet.getRow(1).font={name:'Calibri',bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF18335C'}};
  sheet.getRow(1).alignment={vertical:'middle',wrapText:true};sheet.getRow(1).height=25;
  sheet.views=[{state:'frozen',xSplit:2,ySplit:1}];sheet.autoFilter={from:'A1',to:'L1'};
  sheet.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:1',margins:{left:.25,right:.25,top:.4,bottom:.4,header:.2,footer:.2}};
  sheet.headerFooter.oddHeader=`&CVarYok · ${String(schoolClass.name).replace(/&/g,'&&')} · ${dateLabel(date)}`;
  sheet.headerFooter.oddFooter='&R Sayfa &P / &N';
  let absentStudents=0;
  for(const pupil of pupils){
    const values=Array.from({length:8},(_,i)=>states.get(`${pupil.id}:${i+1}`)||'Kayıt yok');
    if(values.includes('Gelmedi'))absentStudents++;
    const summary=['Gelmedi','Geldi','Geç','İzinli','Kayıt yok'].map(label=>{
      const nums=values.flatMap((value,i)=>value===label?[i+1]:[]);
      return nums.length?`${label}: ${nums.join(', ')}. ders`:null;
    }).filter(Boolean).join(' | ');
    const row=sheet.addRow([pupil.student_no,pupil.masked_name,...values,summary,notes]);
    row.alignment={vertical:'middle',wrapText:true};
    row.getCell(12).alignment={vertical:'middle',wrapText:true,indent:1};
    for(let i=0;i<values.length;i++){const cell=row.getCell(i+3);cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+COLORS[values[i]]}};cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};}
  }
  return {sheet,absentStudents};
}
function buildWorkbook(schoolClass,start,end=start,at=new Date()){
  const book=new ExcelJS.Workbook();book.creator='VarYok';book.created=at;
  const dates=start===end?[start]:db.prepare('SELECT DISTINCT date FROM attendance_sessions WHERE class_id=? AND date BETWEEN ? AND ? ORDER BY date').all(schoolClass.id,start,end).map(x=>x.date);
  if(!dates.length)dates.push(start);
  let absentStudents=0;
  for(const date of dates)absentStudents+=addDailySheet(book,schoolClass,date,dates.length===1?'Günlük Yoklama':dateLabel(date)).absentStudents;
  return {book,absentStudents};
}
async function writeReport(schoolClass,date,at){
  const base=ensureFolders(),label=dateLabel(date),month=Number(date.slice(5,7));
  const dir=path.join(base,MONTHS[month-1],label);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const {book,absentStudents}=buildWorkbook(schoolClass,date,date,at),buffer=Buffer.from(await book.xlsx.writeBuffer());
  const existing=db.prepare('SELECT file_name FROM daily_report_files WHERE class_id=? AND date=?').get(schoolClass.id,date);
  const prefix=`${safeName(schoolClass.name)}_${label}_`;
  if(existing){
    const name=existing.file_name;
    if(path.basename(name)!==name||!name.startsWith(prefix)||!name.endsWith('.xlsx'))throw new Error('Günlük rapor dosya adı geçersiz.');
    const filename=path.join(dir,name),temp=path.join(dir,`.varyok-${crypto.randomBytes(12).toString('hex')}.tmp`);
    try{fs.writeFileSync(temp,buffer,{flag:'wx',mode:0o600});fs.renameSync(temp,filename);}
    finally{try{fs.unlinkSync(temp);}catch{}}
    return {success:true,filename,absences:absentStudents};
  }
  const stem=reportName(schoolClass,date,at).slice(0,-5);
  for(let n=1;n<=999;n++){
    const name=`${stem}${n===1?'':`-${String(n).padStart(2,'0')}`}.xlsx`,filename=path.join(dir,name);
    try{
      fs.writeFileSync(filename,buffer,{flag:'wx',mode:0o600});
      db.prepare('INSERT INTO daily_report_files(class_id,date,file_name) VALUES(?,?,?)').run(schoolClass.id,date,name);
      return {success:true,filename,absences:absentStudents};
    }catch(e){if(e.code!=='EEXIST')throw e;}
  }
  throw new Error('Aynı dakika için çok fazla rapor oluşturuldu.');
}
function createReport(schoolClass,date,at=new Date()){
  const key=`${schoolClass.id}:${date}`,previous=reportLocks.get(key)||Promise.resolve();
  const current=previous.catch(()=>{}).then(()=>writeReport(schoolClass,date,at));
  reportLocks.set(key,current);
  return current.finally(()=>{if(reportLocks.get(key)===current)reportLocks.delete(key);});
}
module.exports={root,ensureFolders,reportName,buildWorkbook,createReport};
