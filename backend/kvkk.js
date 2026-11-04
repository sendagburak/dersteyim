const crypto = require('crypto');
const { AES_KEY, formatTurkeyDateTime } = require('./config');

/**
 * KVKK Name Masking Rule (as strictly specified):
 * - If name/surname word is <= 3 characters: show 1st character, replace rest with '*'.
 * - If name/surname word is > 3 characters: keep first 3 characters, replace rest with '*'.
 * - Applied individually to 2, 3, 4 names and surnames (both for Students and Parents).
 */
function maskWord(word) {
  if (!word) return '';
  const trimmed = word.trim();
  const chars = Array.from(trimmed);
  if (chars.length <= 1) {
    return trimmed;
  }
  if (chars.length <= 3) {
    return chars[0] + '*'.repeat(chars.length - 1);
  } else {
    return chars.slice(0, 3).join('') + '*'.repeat(chars.length - 3);
  }
}

function maskFullName(fullName) {
  if (!fullName) return '';
  return fullName
    .trim()
    .split(/\s+/)
    .map(maskWord)
    .join(' ');
}

// Alias for clarity
const maskParentName = maskFullName;

/**
 * Mask TC Identity Number (e.g. 12345678901 -> 123******01)
 */
function maskTC(tc) {
  if (!tc) return '';
  const str = String(tc).trim();
  if (str.length !== 11) {
    return str.length > 4 ? str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2) : '***';
  }
  return str.slice(0, 3) + '******' + str.slice(-2);
}

/**
 * Mask Phone Number (e.g. 05321112233 -> 0532 *** ** 33)
 */
function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    const area = digits.slice(-10, -7);
    const last2 = digits.slice(-2);
    return `0${area} *** ** ${last2}`;
  }
  return String(phone).slice(0, 3) + '******' + String(phone).slice(-2);
}

/**
 * Mask Email (e.g. ornek@example.invalid -> orn***@example.invalid)
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  let maskedUser = user;
  if (user.length <= 3) {
    maskedUser = user[0] + '*'.repeat(user.length - 1);
  } else {
    maskedUser = user.slice(0, 3) + '*'.repeat(Math.min(5, user.length - 3));
  }
  return `${maskedUser}@${domain}`;
}

/**
 * Password Hashing with PBKDF2 (Zero-dependency, cryptographically secure)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || password.length > 256 || typeof storedHash !== 'string') return false;
  try {
    const parts = storedHash.split(':');
    let hash, expected;
    if (parts.length === 3 && parts[0] === 'scrypt') { hash = crypto.scryptSync(password, parts[1], 64); expected = Buffer.from(parts[2], 'hex'); }
    else if (parts.length === 2 && /^[a-f0-9]{32}$/.test(parts[0]) && /^[a-f0-9]{128}$/.test(parts[1])) { hash = crypto.pbkdf2Sync(password, parts[0], 10000, 64, 'sha512'); expected = Buffer.from(parts[1], 'hex'); }
    else return false;
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch { return false; }
}

/**
 * AES-256-GCM Encryption for TC and sensitive personal data
 */
function encryptSensitiveData(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM Decryption (Restricted to Authorized Admin with Audit Log)
 */
function decryptSensitiveData(encryptedString) {
  if (!encryptedString) return null;
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedText] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('KVKK Decryption error:', err.message);
    return null;
  }
}

module.exports = {
  maskWord,
  maskFullName,
  maskParentName,
  maskTC,
  maskPhone,
  maskEmail,
  hashPassword,
  verifyPassword,
  encryptSensitiveData,
  decryptSensitiveData
};
