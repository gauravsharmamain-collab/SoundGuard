import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDirectory = __dirname;
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(dbDirectory, 'soundguard.db');

console.log(`[SoundGuard DB] Initializing SQLite database at: ${dbPath}`);

export const db = new DatabaseSync(dbPath);

// Enable WAL mode and pragmas for performance and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      sound TEXT NOT NULL,
      confidence REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      is_test INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_detections_sound ON detections(sound);
    CREATE INDEX IF NOT EXISTS idx_detections_device ON detections(device_id);
    CREATE INDEX IF NOT EXISTS idx_detections_ack ON detections(acknowledged);

    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'online',
      last_seen INTEGER NOT NULL,
      last_sound TEXT,
      wifi_rssi INTEGER,
      firmware_version TEXT,
      ip_address TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Initialize default settings if not exists
  const defaultSettings = [
    { key: 'visual_alerts_enabled', value: 'true' },
    { key: 'sound_alerts_enabled', value: 'true' },
    { key: 'vibration_alerts_enabled', value: 'true' },
    { key: 'min_confidence', value: '0.70' },
    { key: 'auto_dismiss_seconds', value: '0' }, // 0 = manual acknowledge required
    { key: 'high_priority_flash', value: 'true' },
    { key: 'primary_device_id', value: 'soundguard_01' }
  ];

  const checkStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertStmt = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');

  const now = new Date().toISOString();
  for (const s of defaultSettings) {
    const existing = checkStmt.get(s.key);
    if (!existing) {
      insertStmt.run(s.key, s.value, now);
    }
  }

  console.log('[SoundGuard DB] Database schema and default settings initialized.');
}

export default db;
