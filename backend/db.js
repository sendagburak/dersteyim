const Database = require('./sqlite');
const path = require('path');
const { DB_PATH, DATA_DIR, AES_KEY, formatTurkeyDateTime } = require('./config');
const { maskFullName, maskParentName, maskTC, maskPhone, maskEmail, hashPassword, encryptSensitiveData, decryptSensitiveData } = require('./kvkk');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE,
      city TEXT DEFAULT 'Niğde',
      district TEXT DEFAULT 'Merkez',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'teacher', 'parent', 'student')),
      full_name TEXT NOT NULL,
      title TEXT,
      phone TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_fingerprint TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT DEFAULT 'Browser / Mobile',
      is_approved INTEGER DEFAULT 0,
      approved_by INTEGER,
      approved_at TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 2,
      name TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      section TEXT NOT NULL,
      academic_year TEXT DEFAULT '2026-2027',
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 2,
      class_id INTEGER NOT NULL,
      student_no TEXT NOT NULL,
      encrypted_tc TEXT NOT NULL,
      tc_masked TEXT NOT NULL,
      full_name TEXT NOT NULL,
      masked_name TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      masked_parent_name TEXT NOT NULL,
      parent_email TEXT NOT NULL,
      masked_parent_email TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      masked_parent_phone TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('K', 'E')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(school_id, student_no)
    );

    CREATE TABLE IF NOT EXISTS lesson_periods (
      period INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7), -- 1: Pazartesi, 5: Cuma
      period INTEGER NOT NULL,
      subject TEXT NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(period) REFERENCES lesson_periods(period)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      period INTEGER NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      recorded_by_teacher_id INTEGER NOT NULL,
      saved_at_turkey_time TEXT NOT NULL,
      saved_timestamp INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(recorded_by_teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('GELDI', 'GELMEDI', 'GEC', 'IZINLI')),
      updated_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      parent_email TEXT,
      parent_phone TEXT,
      student_name_masked TEXT NOT NULL,
      class_name TEXT NOT NULL,
      period_name TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      absent_time_turkey TEXT NOT NULL,
      scheduled_send_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'CANCELLED')),
      sent_at TEXT,
      channel TEXT DEFAULT 'EMAIL',
      response_log TEXT,
      FOREIGN KEY(session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS homeworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'ALL' CHECK(target_type IN ('ALL', 'CLASS', 'STAFF')),
      target_class_id INTEGER,
      priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      triggered_by_id INTEGER NOT NULL,
      triggered_by_name TEXT NOT NULL,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('YANGIN', 'DEPREM', 'TAHLIYE', 'GUVENLIK', 'SAGLIK')),
      message TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      triggered_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(triggered_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      ip_address TEXT,
      device_fingerprint TEXT,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      channel TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'HIGH',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// Log an audit record
function logAudit(entry) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, role, action, resource_type, resource_id, ip_address, device_fingerprint, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.user_id || null,
      entry.user_name || 'Sistem',
      entry.role || 'system',
      entry.action,
      entry.resource_type,
      entry.resource_id ? String(entry.resource_id) : null,
      entry.ip_address || '127.0.0.1',
      entry.device_fingerprint || 'unknown',
      typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details || '',
      entry.timestamp || formatTurkeyDateTime()
    );
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
}

function migrate() {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const version = db.pragma('user_version')[0].user_version;
  if (version >= 2) {
    const sample=db.prepare("SELECT encrypted_tc FROM students WHERE encrypted_tc<>'' LIMIT 1").get();
    if(sample && decryptSensitiveData(sample.encrypted_tc)===null)throw new Error('Veritabanı anahtarı eşleşmiyor. Doğru anahtarı yedekten geri yükleyin.');
    return;
  }
  const legacyKey = Buffer.from('e-yoklama-kvkk-secure-key-32bytes!!'.slice(0, 32));
  const rows = db.prepare('SELECT id, encrypted_tc FROM students').all();
  // Verify all encrypted IDs before making any persistent change.
  const migrated = rows.map(row => {
    if (!row.encrypted_tc) return row;
    const [iv, tag, encrypted] = row.encrypted_tc.split(':');
    let plain;
    for (const key of [AES_KEY, legacyKey]) {
      try { const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex')); d.setAuthTag(Buffer.from(tag, 'hex')); plain = d.update(encrypted, 'hex', 'utf8') + d.final('utf8'); break; } catch {}
    }
    if (plain === undefined) throw new Error('Mevcut veritabanının şifreleme anahtarı eşleşmiyor. Anahtar yedeğini geri yükleyin.');
    return { id: row.id, encrypted_tc: encryptSensitiveData(plain) };
  });
  db.transaction(() => {
    db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE announcements ADD COLUMN school_id INTEGER REFERENCES schools(id);
      ALTER TABLE emergency_alerts ADD COLUMN school_id INTEGER REFERENCES schools(id);
      ALTER TABLE sent_notifications ADD COLUMN school_id INTEGER REFERENCES schools(id);
      ALTER TABLE notification_queue ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE notification_queue ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE notification_queue ADD COLUMN processing_since INTEGER;
      CREATE TABLE student_accounts (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, PRIMARY KEY(user_id, student_id));
      CREATE TABLE school_periods (school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE, period INTEGER NOT NULL REFERENCES lesson_periods(period), start_time TEXT NOT NULL, end_time TEXT NOT NULL, PRIMARY KEY(school_id, period));
      CREATE INDEX idx_session_class_date ON attendance_sessions(class_id,date,period);
      CREATE UNIQUE INDEX idx_record_student ON attendance_records(session_id,student_id);
      CREATE INDEX idx_queue_due ON notification_queue(status,scheduled_send_time,next_attempt_at);
      CREATE UNIQUE INDEX idx_schedule_teacher ON schedules(teacher_id,day_of_week,period);
      CREATE UNIQUE INDEX idx_schedule_class ON schedules(class_id,day_of_week,period);
      CREATE INDEX idx_students_class ON students(class_id);
      CREATE INDEX idx_sessions_expiry ON sessions(expires_at);`);
    for (const row of migrated) if (row.encrypted_tc) db.prepare('UPDATE students SET encrypted_tc=? WHERE id=?').run(row.encrypted_tc, row.id);
    db.exec(`UPDATE announcements SET school_id=(SELECT school_id FROM users WHERE id=announcements.created_by_id);
      UPDATE emergency_alerts SET school_id=(SELECT school_id FROM users WHERE id=emergency_alerts.triggered_by_id);
      DELETE FROM sessions;
      UPDATE notification_queue SET status='CANCELLED', response_log='Sürüm 1.1 geçişi: eski bildirim yeniden onay gerektirir' WHERE status='PENDING';`);
    const { verifyPassword } = require('./kvkk');
    for (const user of db.prepare('SELECT id,password_hash FROM users').all()) {
      if (['Burak51.Yegitek!', 'idareci123', 'ogretmen123', 'veli123', 'admin123', 'Meb123456!'].some(p => verifyPassword(p, user.password_hash))) {
        db.prepare('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?').run(hashPassword(crypto.randomBytes(32).toString('hex')), user.id);
      }
    }
    const insert = db.prepare('INSERT OR IGNORE INTO lesson_periods VALUES (?,?,?,?)');
    const times = [['08:30','09:10'],['09:25','10:05'],['10:20','11:00'],['11:15','11:55'],['12:45','13:25'],['13:40','14:20'],['14:35','15:15'],['15:30','16:10']];
    times.forEach((t,i) => insert.run(i+1, `${i+1}. Ders`, ...t));
    db.exec('PRAGMA user_version=2');
  })();
  fs.writeFileSync(require('node:path').join(DATA_DIR, '.key-required'), '2', { mode: 0o600 });
}

function migrateV3() {
  if(db.pragma('user_version')[0].user_version>=3)return;
  const {protectPersonal}=require('./studentData');
  db.transaction(()=>{
    db.exec(`ALTER TABLE students ADD COLUMN encrypted_personal_data TEXT;
      ALTER TABLE notification_queue ADD COLUMN push_sent INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE push_subscriptions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,endpoint_hash TEXT UNIQUE NOT NULL,encrypted_subscription TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE user_notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,is_read INTEGER NOT NULL DEFAULT 0);`);
    for(const row of db.prepare('SELECT * FROM students').all())db.prepare("UPDATE students SET encrypted_personal_data=?,full_name='',parent_name='',parent_email='',parent_phone='' WHERE id=?").run(protectPersonal(row),row.id);
    db.exec("UPDATE notification_queue SET parent_email='',parent_phone=''; PRAGMA user_version=3;");
  })();
}

function migrateV4(){
  if(db.pragma('user_version')[0].user_version>=4)return;
  db.exec(`CREATE TABLE school_installation(singleton INTEGER PRIMARY KEY CHECK(singleton=1),school_id INTEGER NOT NULL REFERENCES schools(id),grant_json TEXT NOT NULL,activated_at TEXT NOT NULL);
  CREATE TABLE applied_grants(grant_id TEXT PRIMARY KEY,applied_at TEXT NOT NULL);
  PRAGMA user_version=4;`);
}

function migrateV5(){
  if(db.pragma('user_version')[0].user_version>=5)return;
  db.transaction(()=>{
    db.exec(`DROP INDEX IF EXISTS idx_schedule_teacher;
      CREATE INDEX IF NOT EXISTS idx_schedule_teacher_year_lookup ON schedules(teacher_id,day_of_week,period);
      CREATE TRIGGER IF NOT EXISTS schedule_teacher_year_insert BEFORE INSERT ON schedules
      WHEN EXISTS(SELECT 1 FROM schedules old JOIN classes old_class ON old_class.id=old.class_id
        JOIN classes new_class ON new_class.id=NEW.class_id
        WHERE old.teacher_id=NEW.teacher_id AND old.day_of_week=NEW.day_of_week AND old.period=NEW.period AND old_class.academic_year=new_class.academic_year)
      BEGIN SELECT RAISE(ABORT,'schedule_teacher_conflict'); END;
      CREATE TRIGGER IF NOT EXISTS schedule_teacher_year_update BEFORE UPDATE ON schedules
      WHEN EXISTS(SELECT 1 FROM schedules old JOIN classes old_class ON old_class.id=old.class_id
        JOIN classes new_class ON new_class.id=NEW.class_id
        WHERE old.id<>NEW.id AND old.teacher_id=NEW.teacher_id AND old.day_of_week=NEW.day_of_week AND old.period=NEW.period AND old_class.academic_year=new_class.academic_year)
      BEGIN SELECT RAISE(ABORT,'schedule_teacher_conflict'); END;
      PRAGMA user_version=5;`);
  })();
}

// Integrity and health check
function checkIntegrity() {
  try {
    const integrity = db.pragma('integrity_check');
    const fkCheck = db.pragma('foreign_key_check');
    const isOk = Array.isArray(integrity) && integrity.length > 0 && integrity[0].integrity_check === 'ok';
    return {
      healthy: isOk && fkCheck.length === 0,
      integrity: integrity[0] ? integrity[0].integrity_check : 'unknown',
      foreignKeyViolations: fkCheck.length
    };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

// Graceful database shutdown
function closeDatabase() {
  try {
    console.log('[Database] Flushing WAL journal to disk (checkpoint)...');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    console.log('[Database] Connection closed cleanly.');
    return true;
  } catch (err) {
    console.error('[Database] Close error:', err.message);
    return false;
  }
}

// Initialize
initSchema();
migrate();
migrateV3();
migrateV4();
migrateV5();

module.exports = {
  db,
  logAudit,
  checkIntegrity,
  closeDatabase
};
