// Offline protocol uses only Node's cryptographic primitives. No internet service.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const problem = message => { throw Object.assign(new Error(message), {status: 400}); };
function clean(value, name, max = 180) { if(typeof value!=='string'||!value.trim()||value.length>max)problem(`${name} geçersiz.`); return value.trim(); }
function schoolInfo(value) {
  if(!value||typeof value!=='object')problem('Okul bilgileri eksik.');
  const code=clean(value.code,'Kurum kodu',20);if(!/^\d{5,10}$/.test(code))problem('Kurum kodu 5–10 rakam olmalıdır.');
  return {code,name:clean(value.name,'Okul adı'),city:clean(value.city,'İl',80),district:clean(value.district,'İlçe',80)};
}
function publicDer(key,type) {try{const k=crypto.createPublicKey({key:Buffer.from(key,'base64'),format:'der',type:'spki'});if(k.asymmetricKeyType!==type)problem('Anahtar türü yanlış.');return k;}catch{problem('Kurulum anahtarı geçersiz.');} }
function validateRequest(r) {
  if(!r||r.format!=='dersteyim-request'||r.version!==1||!/^[a-f0-9-]{36}$/i.test(r?.installation_id||''))problem('Dersteyim talep dosyası geçersiz.');
  publicDer(r.encryption_public,'x25519');publicDer(r.identity_public,'ed25519');
  const result={format:'dersteyim-request',version:1,installation_id:r.installation_id,school:schoolInfo(r.school),encryption_public:r.encryption_public,identity_public:r.identity_public};
  if(!verifyObject(result,r.signature,r.identity_public))problem('Talep dosyasının bütünlüğü doğrulanamadı.');
  return result;
}
function signObject(object,privateKey) {return crypto.sign(null,Buffer.from(JSON.stringify(object)),privateKey).toString('base64');}
function verifyObject(object,signature,publicKey) {try {const key=typeof publicKey==='string'&&publicKey.includes('BEGIN')?publicKey:publicDer(publicKey,'ed25519');return typeof signature==='string'&&crypto.verify(null,Buffer.from(JSON.stringify(object)),key,Buffer.from(signature,'base64'));}catch{return false;}}
function signedBody(envelope) {return {format:envelope.format,version:envelope.version,grant_id:envelope.grant_id,issuer:envelope.issuer,issued_at:envelope.issued_at,claims:envelope.claims,ephemeral_public:envelope.ephemeral_public,iv:envelope.iv,tag:envelope.tag,ciphertext:envelope.ciphertext};}
function verifyGrant(envelope,publicPem) {
  if(!envelope||envelope.format!=='dersteyim-grant'||envelope.version!==1||JSON.stringify(envelope).length>64000)problem('Yetki dosyası geçersiz.');
  const b=signedBody(envelope);
  if(!verifyObject(b,envelope.signature,publicPem))problem('Yetki dosyası Burak Şendağ yetkilendirme anahtarıyla doğrulanamadı.');
  if(!b.claims||b.claims.mode!=='school-offline')problem('Okul yetkisi eksik.');
  schoolInfo(b.claims.school);publicDer(b.claims.encryption_public,'x25519');publicDer(b.claims.identity_public,'ed25519');
  return b.claims;
}
function createGrant(request,admin,privatePem,publicPem) {
  const r=validateRequest(request),school=schoolInfo(r.school);
  const claims={mode:'school-offline',installation_id:r.installation_id,school,encryption_public:r.encryption_public,identity_public:r.identity_public};
  const ephemeral=crypto.generateKeyPairSync('x25519'),secret=crypto.diffieHellman({privateKey:ephemeral.privateKey,publicKey:publicDer(r.encryption_public,'x25519')});
  const grantId=crypto.randomUUID(),key=crypto.createHash('sha256').update(secret).update(grantId).digest(),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(claims)));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify({admin}),'utf8'),cipher.final()]);
  const envelope={format:'dersteyim-grant',version:1,grant_id:grantId,issuer:crypto.createHash('sha256').update(publicPem).digest('hex'),issued_at:new Date().toISOString(),claims,ephemeral_public:ephemeral.publicKey.export({format:'der',type:'spki'}).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
  return {...envelope,signature:signObject(envelope,privatePem)};
}
function decryptGrant(envelope,installation,publicPem) {
  const claims=verifyGrant(envelope,publicPem);
  if(claims.installation_id!==installation.installation_id||claims.encryption_public!==installation.encryption_public||claims.identity_public!==installation.identity_public)problem('Bu yetki dosyası başka bir okul bilgisayarına aittir. Bu bilgisayarın talep dosyasını kullanın.');
  try {
    const secret=crypto.diffieHellman({privateKey:crypto.createPrivateKey(installation.encryption_private),publicKey:publicDer(envelope.ephemeral_public,'x25519')});
    const key=crypto.createHash('sha256').update(secret).update(envelope.grant_id).digest();
    const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));d.setAAD(Buffer.from(JSON.stringify(claims)));d.setAuthTag(Buffer.from(envelope.tag,'base64'));
    return {claims,admin:JSON.parse(Buffer.concat([d.update(Buffer.from(envelope.ciphertext,'base64')),d.final()]).toString('utf8')).admin};
  }catch{problem('Yetki dosyası bu kurulumda çözülemedi.');}
}
function createInstallation() {const e=crypto.generateKeyPairSync('x25519'),s=crypto.generateKeyPairSync('ed25519');return {installation_id:crypto.randomUUID(),encryption_private:e.privateKey.export({format:'pem',type:'pkcs8'}),encryption_public:e.publicKey.export({format:'der',type:'spki'}).toString('base64'),identity_private:s.privateKey.export({format:'pem',type:'pkcs8'}),identity_public:s.publicKey.export({format:'der',type:'spki'}).toString('base64')};}
function makeRequest(installation,school) {const r={format:'dersteyim-request',version:1,installation_id:installation.installation_id,school:schoolInfo(school),encryption_public:installation.encryption_public,identity_public:installation.identity_public};return {...r,signature:signObject(r,installation.identity_private)};}
function issuerPublic(root=path.resolve(__dirname,'..')) {return fs.readFileSync(process.env.ISSUER_PUBLIC_FILE||path.join(root,'resources','issuer-public.pem'),'utf8');}
module.exports={schoolInfo,validateRequest,createGrant,verifyGrant,decryptGrant,createInstallation,makeRequest,signObject,verifyObject,issuerPublic,problem};
