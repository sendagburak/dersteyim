// Small synchronous adapter for Node 24's bundled SQLite. No platform-specific addon.
const { DatabaseSync } = require('node:sqlite');
class Database extends DatabaseSync {
  constructor(filename) { super(filename, { timeout: 5000 }); }
  pragma(sql) { return this.prepare(`PRAGMA ${sql}`).all(); }
  transaction(fn) {
    return (...args) => {
      this.exec('BEGIN IMMEDIATE');
      try { const result = fn(...args); this.exec('COMMIT'); return result; }
      catch (err) { this.exec('ROLLBACK'); throw err; }
    };
  }
}
module.exports = Database;
