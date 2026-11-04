const fs=require('node:fs');const path=require('node:path');
const ExcelJS=require('exceljs');
const {db}=require('./db');const config=require('./config');const {knownFolder}=require('./localFiles');
const MONTHS=['05-Ocak','06-Şubat','07-Mart','08-Nisan','09-Mayıs','10-Haziran','11-Temmuz','12-Ağustos','01-Eylül','02-Ekim','03-Kasım','04-Aralık'];
function root(){return path.join(knownFolder('Desktop'),'Yoklamalar');}
function ensureFolders(){const base=root();for(const month of MONTHS.filter(m=>m!=='12-Ağustos'))fs.mkdirSync(path.join(base,month),{recursive:true,mode:0o700});return base;}
function safeName(value){const name=String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,80);return name||'Sinif';}
async function createReport(schoolClass,date,at=new Date()) {
  const base=ensureFolders(),[year,month,day]=date.split('-'),dateLabel=`${day}.${month}.${year}`;
  const dir=path.join(base,MONTHS[Number(month)-1],dateLabel);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const now=config.formatTurkeyTimeOnly(at).replace(':','-');const stem=`${safeName(schoolClass.name)}_${dateLabel}_${now}`;
  const rows=db.prepare(`SELECT s.student_no,s.masked_name,a.period,a.saved_at_turkey_time,u.full_name AS teacher_name
    FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id
    JOIN students s ON s.id=r.student_id JOIN users u ON u.id=a.recorded_by_teacher_id
    WHERE a.class_id=? AND a.date=? AND r.status='GELMEDI'
    ORDER BY a.period,CAST(s.student_no AS INTEGER),s.student_no`).all(schoolClass.id,date);
  const book=new ExcelJS.Workbook();book.creator='VarYok';book.created=at;
  const sheet=book.addWorksheet('Gelmeyenler');sheet.columns=[
    {header:'Öğrenci No',key:'student_no',width:18},{header:'Öğrenci (maskeli)',key:'masked_name',width:34},
    {header:'Ders',key:'period',width:12},{header:'Yoklama kayıt zamanı',key:'saved_at_turkey_time',width:24},{header:'Kaydeden',key:'teacher_name',width:26}
  ];sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.addRows(rows);
  if(!rows.length)sheet.addRow(['Gelmeyen öğrenci yok.']);
  const buffer=Buffer.from(await book.xlsx.writeBuffer());
  for(let n=1;n<=999;n++){
    const name=`${stem}${n===1?'':`-${String(n).padStart(2,'0')}`}.xlsx`,filename=path.join(dir,name);
    try{fs.writeFileSync(filename,buffer,{flag:'wx',mode:0o600});return {success:true,filename,absences:rows.length};}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  throw new Error('Aynı dakika için çok fazla rapor oluşturuldu.');
}
module.exports={root,ensureFolders,createReport};
