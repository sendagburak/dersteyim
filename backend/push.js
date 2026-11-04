const webpush=require('web-push');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {DATA_DIR,OWNER_EMAIL,PUSH_ENABLED,formatTurkeyDateTime}=require('./config');const {db}=require('./db');const {encryptSensitiveData,decryptSensitiveData}=require('./kvkk');
let keys;
function loadKeys(){if(keys)return keys;const file=path.join(DATA_DIR,'push-keys.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(webpush.generateVAPIDKeys()),{flag:'wx',mode:0o600});keys=JSON.parse(fs.readFileSync(file,'utf8'));webpush.setVapidDetails('mailto:'+OWNER_EMAIL,keys.publicKey,keys.privateKey);return keys;}
function publicKey(){return loadKeys().publicKey;}
function validEndpoint(endpoint){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h));}catch{return false;}}
function saveSubscription(userId,data){
  if(!PUSH_ENABLED)throw Object.assign(new Error('Push bildirimleri bu sürümde pasiftir.'),{status:409});
  if(typeof data.endpoint!=='string'||data.endpoint.length>2048||!validEndpoint(data.endpoint)||!data.keys||typeof data.keys.auth!=='string'||typeof data.keys.p256dh!=='string'||data.keys.auth.length>100||data.keys.p256dh.length>200||Buffer.from(data.keys.auth||'','base64url').length!==16||Buffer.from(data.keys.p256dh||'','base64url').length!==65)throw Object.assign(new Error('Bildirim aboneliği geçersiz veya desteklenmeyen push servisi.'),{status:400});
  const hash=crypto.createHash('sha256').update(data.endpoint).digest('hex');db.prepare('INSERT INTO push_subscriptions(user_id,endpoint_hash,encrypted_subscription,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint_hash) DO UPDATE SET user_id=excluded.user_id,encrypted_subscription=excluded.encrypted_subscription').run(userId,hash,encryptSensitiveData(JSON.stringify(data)),formatTurkeyDateTime());
}
function removeSubscription(userId,endpoint){if(typeof endpoint!=='string')return;db.prepare('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?').run(userId,crypto.createHash('sha256').update(endpoint).digest('hex'));}
async function notifyUsers(userIds,title,body){
  const unique=[...new Set(userIds)];let accepted=0,failed=0;
  for(const userId of unique){
    db.prepare('INSERT INTO user_notifications(user_id,title,body,created_at) VALUES(?,?,?,?)').run(userId,title,body,formatTurkeyDateTime());
    if(!PUSH_ENABLED)continue;
    const subscriptions=db.prepare('SELECT * FROM push_subscriptions WHERE user_id=?').all(userId);
    if(subscriptions.length)loadKeys();
    for(const s of subscriptions){try{const data=JSON.parse(decryptSensitiveData(s.encrypted_subscription));await webpush.sendNotification(data,JSON.stringify({title:'VarYok',body:'Yeni bir okul bildiriminiz var. Ayrıntıları uygulamada görüntüleyin.',url:'/'}),{TTL:3600,urgency:'high',timeout:10000});accepted++;}catch(e){failed++;if([404,410].includes(e.statusCode))db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(s.id);}}
  }
  return {inboxRecipients:unique.length,pushAccepted:accepted,pushFailed:failed};
}
module.exports={publicKey,saveSubscription,removeSubscription,notifyUsers,validEndpoint};
