const {db,logAudit}=require('./db');
const {sendAbsenteeEmail,mailStatus}=require('./mailer');
const {personalData}=require('./studentData');
const {notifyUsers}=require('./push');
const {formatTurkeyDateTime,EMAIL_ENABLED,PUSH_ENABLED}=require('./config');
let timer, running=false, stopping=false,active=0;
async function deliverNotification(queueId,manual=false) {
  if(!EMAIL_ENABLED&&!PUSH_ENABLED)return {success:false,error:'E-posta ve push gönderimi bu sürümde pasiftir.'};
  const stamp=Date.now();
  const claimed=db.prepare("UPDATE notification_queue SET processing_since=? WHERE id=? AND status='PENDING' AND processing_since IS NULL").run(stamp,queueId);
  if(!claimed.changes) return {success:false,error:'Bildirim başka bir işlem tarafından gönderiliyor veya beklemiyor.'};
  active++;
  try {
    const item=db.prepare(`SELECT q.*,s.parent_email,s.encrypted_personal_data,s.school_id,a.class_id,s.class_id AS current_class,r.status AS attendance_status FROM notification_queue q JOIN students s ON s.id=q.student_id JOIN attendance_sessions a ON a.id=q.session_id LEFT JOIN attendance_records r ON r.session_id=q.session_id AND r.student_id=q.student_id WHERE q.id=?`).get(queueId);
    if(!item||item.attendance_status!=='GELMEDI'||item.current_class!==item.class_id){db.prepare("UPDATE notification_queue SET status='CANCELLED',response_log='Güncel yoklama veya sınıf değişti' WHERE id=?").run(queueId);return {success:false,error:'Öğrenci artık bu ders için gelmedi durumunda değil.'};}
    if(!manual && (item.scheduled_send_time>stamp||item.next_attempt_at>stamp||item.attempts>=5))return {success:false,error:'Gönderim zamanı gelmedi.'};
    if(!item.push_sent){const targets=db.prepare('SELECT user_id FROM student_accounts WHERE student_id=?').all(item.student_id).map(a=>a.user_id);await notifyUsers(targets,'Yoklama bildirimi',`${item.student_name_masked} · ${item.class_name} · ${item.period_name}: GELMEDİ. Kayıt zamanı: ${item.absent_time_turkey}`);db.prepare('UPDATE notification_queue SET push_sent=1 WHERE id=?').run(item.id);}
    const result=await sendAbsenteeEmail({queueId:item.id,parentEmail:personalData(item).parent_email,studentMaskedName:item.student_name_masked,className:item.class_name,periodName:item.period_name,teacherName:item.teacher_name,absentTimeTurkey:item.absent_time_turkey});
    if(result.success){
      db.transaction(()=>{
        db.prepare("UPDATE notification_queue SET status='SENT',sent_at=?,response_log='SMTP sunucusu kabul etti',attempts=attempts+1 WHERE id=?").run(formatTurkeyDateTime(),queueId);
        db.prepare("INSERT INTO sent_notifications(recipient,channel,subject,body,priority,status,created_at,school_id) VALUES(?,'EMAIL',?,?,'HIGH','SMTP_ACCEPTED',?,?)").run(personalData(item).parent_email,result.subject,result.body,formatTurkeyDateTime(),item.school_id);
        logAudit({action:'NOTIFICATION_SMTP_ACCEPTED',resource_type:'STUDENT',resource_id:item.student_id,details:`Kuyruk kaydı: ${queueId}`});
      })();
    } else {
      db.prepare('UPDATE notification_queue SET response_log=?,attempts=attempts+1,next_attempt_at=? WHERE id=?').run(result.error,stamp+Math.min(60,2**item.attempts)*60000,queueId);
    }
    return result;
  } finally { active--;db.prepare('UPDATE notification_queue SET processing_since=NULL WHERE id=?').run(queueId); }
}
async function processNotificationQueue() {
  if(running||(!EMAIL_ENABLED&&!PUSH_ENABLED))return;
  running=true;
  try {for(const q of db.prepare("SELECT id FROM notification_queue WHERE status='PENDING' AND processing_since IS NULL AND scheduled_send_time<=? AND next_attempt_at<=? AND attempts<5 ORDER BY scheduled_send_time LIMIT 10").all(Date.now(),Date.now())){if(stopping)break;await deliverNotification(q.id);}}
  catch(err){console.error('Bildirim kuyruğu hatası:',err.message);}
  finally{running=false;}
}
function startNotificationWorker(){if(timer||(!EMAIL_ENABLED&&!PUSH_ENABLED))return;stopping=false;db.prepare('UPDATE notification_queue SET processing_since=NULL WHERE processing_since<?').run(Date.now()-5*60000);timer=setInterval(processNotificationQueue,5000);timer.unref();}
async function stopNotificationWorker(){stopping=true;clearInterval(timer);timer=null;const deadline=Date.now()+25000;while(active&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));}
module.exports={deliverNotification,processNotificationQueue,startNotificationWorker,stopNotificationWorker};
