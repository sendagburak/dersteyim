const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
const keyPath = path.join(DATA_DIR, 'encryption-key.json');
let keyHex = process.env.KVKK_ENCRYPTION_KEY;
if (keyHex && !/^[a-f\d]{64}$/i.test(keyHex)) throw new Error('KVKK_ENCRYPTION_KEY 64 haneli hexadecimal olmalıdır.');
if (!keyHex) {
  if (!fs.existsSync(keyPath)) {
    // Never silently replace a lost key for a database already migrated to 1.1.
    if (fs.existsSync(path.join(DATA_DIR, '.key-required'))) throw new Error('Şifreleme anahtarı eksik. encryption-key.json dosyasını yedekten geri yükleyin.');
    fs.writeFileSync(keyPath, JSON.stringify({ key: crypto.randomBytes(32).toString('hex') }), { flag: 'wx', mode: 0o600 });
  }
  keyHex = JSON.parse(fs.readFileSync(keyPath, 'utf8')).key;
}
if (!/^[a-f\d]{64}$/i.test(keyHex)) throw new Error('Şifreleme anahtarı geçersiz.');
function parts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date)).map(p => [p.type, p.value]));
}
function formatTurkeyDateOnly(date) { const p = parts(date); return `${p.year}-${p.month}-${p.day}`; }
function formatTurkeyTimeOnly(date) { const p = parts(date); return `${p.hour}:${p.minute}`; }
function formatTurkeyDateTime(date) { const p = parts(date); return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${p.second}`; }
function turkeyDay(date) { return new Date(`${formatTurkeyDateOnly(date)}T12:00:00+03:00`).getUTCDay() || 7; }
function academicYear(date) { const value=formatTurkeyDateOnly(date),year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),start=month>=9?year:year-1;return `${start}-${start+1}`; }
const APP_MODE=process.env.APP_MODE||'school';
if(!['school','central'].includes(APP_MODE))throw new Error('APP_MODE school veya central olmalıdır.');
const EMAIL_ENABLED=APP_MODE==='central'&&process.env.EMAIL_ENABLED==='true';
const PUSH_ENABLED=APP_MODE==='central'&&process.env.PUSH_ENABLED==='true';
const PORT = Number(process.env.PORT || 5000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT 1–65535 arasında olmalıdır.');
module.exports = {
  OWNER_EMAIL: process.env.OWNER_EMAIL || 'yerel-yonetim@example.invalid',
  APP_MODE, EMAIL_ENABLED, PUSH_ENABLED,
  ROOT, DATA_DIR, PORT, HOST: process.env.HOST || '127.0.0.1', TIMEZONE: 'Europe/Istanbul',
  AES_KEY: Buffer.from(keyHex, 'hex'), DB_PATH: path.join(DATA_DIR, 'eyoklama.db'),
  GRACE_PERIOD_MINUTES: 30, SESSION_HOURS: 12,
  formatTurkeyDateOnly, formatTurkeyTimeOnly, formatTurkeyDateTime, turkeyDay, academicYear,
  SMTP_CONFIG: { host: process.env.SMTP_HOST || '', port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '', from: process.env.SMTP_FROM || '' },
  REQUIRE_DEVICE_APPROVAL: process.env.REQUIRE_DEVICE_APPROVAL === 'true',
  TRUST_PROXY: process.env.TRUST_PROXY === '1'
};
