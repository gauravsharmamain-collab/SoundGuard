import db from '../database/db.js';

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    let parsedVal = row.value;
    if (parsedVal === 'true') parsedVal = true;
    else if (parsedVal === 'false') parsedVal = false;
    else if (!isNaN(Number(parsedVal)) && parsedVal.trim() !== '') {
      parsedVal = Number(parsedVal);
    }
    settings[row.key] = parsedVal;
  }
  return settings;
}

export function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return defaultValue;
  let val = row.value;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);
  return val;
}

export function updateSettings(newSettings) {
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(newSettings)) {
    updateStmt.run(k, String(v), now);
  }

  return getAllSettings();
}
