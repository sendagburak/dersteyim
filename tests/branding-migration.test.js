const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('renaming the desktop app preserves existing school data and does not overwrite a new profile', () => {
  const { schoolDataPath } = require('../desktop/data-path.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'varyok-migration-'));
  try {
    const current = path.join(tmp, 'VarYok');
    const legacy = path.join(tmp, 'Dersteyim');
    assert.equal(schoolDataPath(current, legacy), path.join(current, 'okul-verileri'));
    fs.mkdirSync(path.join(legacy, 'okul-verileri'), { recursive: true });
    fs.writeFileSync(path.join(legacy, 'okul-verileri', 'eyoklama.db'), 'legacy');
    assert.equal(schoolDataPath(current, legacy), path.join(legacy, 'okul-verileri'));
    fs.mkdirSync(path.join(current, 'okul-verileri'), { recursive: true });
    fs.writeFileSync(path.join(current, 'okul-verileri', 'eyoklama.db'), 'current');
    assert.equal(schoolDataPath(current, legacy), path.join(current, 'okul-verileri'));
    assert.equal(fs.readFileSync(path.join(legacy, 'okul-verileri', 'eyoklama.db'), 'utf8'), 'legacy');
    assert.equal(fs.readFileSync(path.join(current, 'okul-verileri', 'eyoklama.db'), 'utf8'), 'current');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('existing password files remain available under the previous application name', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'varyok-credentials-'));
  process.env.DATA_DIR = path.join(tmp, 'data');
  process.env.DERSTEYIM_DOCUMENTS_DIR = path.join(tmp, 'Documents');
  try {
    const crypto = require('node:crypto');
    const files = require('../backend/localFiles');
    const id = crypto.createHash('sha256').update(path.resolve(process.env.DATA_DIR)).digest('hex').slice(0, 12);
    const oldDir = path.join(process.env.DERSTEYIM_DOCUMENTS_DIR, 'Dersteyim', id);
    fs.mkdirSync(oldDir, { recursive: true });
    assert.equal(files.credentialsDir(), oldDir);
    const newDir = path.join(process.env.DERSTEYIM_DOCUMENTS_DIR, 'VarYok', id);
    fs.mkdirSync(newDir, { recursive: true });
    assert.equal(files.credentialsDir(), newDir);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
