const fs = require('node:fs');
const path = require('node:path');

// A previous installation keeps its existing database and encryption keys.
function schoolDataPath(userData, legacyUserData) {
  const current = path.join(userData, 'okul-verileri');
  const legacy = legacyUserData && path.join(legacyUserData, 'okul-verileri');
  return legacy && !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
}

module.exports = { schoolDataPath };
