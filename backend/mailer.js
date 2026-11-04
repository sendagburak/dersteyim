const nodemailer = require('nodemailer');
const { SMTP_CONFIG,EMAIL_ENABLED } = require('./config');
let transporter;
const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mailStatus() {
  if(!EMAIL_ENABLED)return {configured:false,enabled:false,mode:'PASSIVE',message:'E-posta gönderimi kapalıdır. Okul içi kayıtlar internet olmadan çalışır.'};

  return { configured: !!(SMTP_CONFIG.host && SMTP_CONFIG.from), mode: SMTP_CONFIG.host && SMTP_CONFIG.from ? 'SMTP' : 'DISABLED', message: SMTP_CONFIG.host && SMTP_CONFIG.from ? 'SMTP yapılandırılmış; gönderim sırasında bağlantı doğrulanır.' : 'SMTP tanımlanmamış. E-posta gönderilmez; bildirimler kuyrukta bekler.' };
}
async function sendAbsenteeEmail(item) {
  if(!mailStatus().configured) return {success:false,error:'SMTP ayarları eksik. SMTP_HOST ve SMTP_FROM tanımlayın.'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.parentEmail||'')) return {success:false,error:'Geçerli veli e-posta adresi bulunmuyor.'};
  if(!transporter) transporter=nodemailer.createTransport({host:SMTP_CONFIG.host,port:SMTP_CONFIG.port,secure:SMTP_CONFIG.port===465,requireTLS:SMTP_CONFIG.port!==465,auth:SMTP_CONFIG.user?{user:SMTP_CONFIG.user,pass:SMTP_CONFIG.pass}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
  const subject=`Öğrenci yoklama bildirimi — ${item.studentMaskedName} (${item.className})`;
  const body=`Öğrenci: ${item.studentMaskedName}\nSınıf: ${item.className}\nDers: ${item.periodName}\nDurum: GELMEDİ\nKayıt zamanı (Türkiye): ${item.absentTimeTurkey}\nKaydeden: ${item.teacherName}\nMazeret veya kayıt düzeltme talepleri için okul idaresiyle iletişime geçiniz.`;
  try {
    const result=await transporter.sendMail({from:SMTP_CONFIG.from,to:item.parentEmail,subject,text:body,html:`<div lang="tr" style="font:16px sans-serif;max-width:600px;margin:auto"><h2>Dersteyim · Yoklama bildirimi</h2><p style="white-space:pre-line">${escape(body)}</p></div>`,priority:'high',messageId:`<attendance-${item.queueId}@dersteyim.local>`});
    if(!result.accepted?.length) return {success:false,error:'SMTP sunucusu alıcıyı kabul etmedi.'};
    return {success:true,subject,body,messageId:result.messageId};
  } catch(err) { return {success:false,error:`SMTP gönderimi başarısız (${err.code||'CONNECTION_ERROR'}).`}; }
}
module.exports={sendAbsenteeEmail,mailStatus};
