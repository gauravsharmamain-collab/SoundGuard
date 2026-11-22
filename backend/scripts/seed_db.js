import db from '../database/db.js';
import { initDatabase } from '../database/db.js';

initDatabase();

console.log('[Seed] Seeding realistic sample events into SQLite database...');

const sampleEvents = [
  { sound: 'door_knock', conf: 0.94, daysAgo: 6, hour: 10, ack: 1 },
  { sound: 'clapping', conf: 0.88, daysAgo: 5, hour: 14, ack: 1 },
  { sound: 'crying_baby', conf: 0.91, daysAgo: 4, hour: 3, ack: 1 },
  { sound: 'door_knock', conf: 0.86, daysAgo: 3, hour: 11, ack: 1 },
  { sound: 'alarm_bell', conf: 0.97, daysAgo: 2, hour: 16, ack: 1 },
  { sound: 'clapping', conf: 0.82, daysAgo: 1, hour: 19, ack: 1 },
  { sound: 'door_knock', conf: 0.95, daysAgo: 1, hour: 20, ack: 1 },
  { sound: 'crying_baby', conf: 0.89, daysAgo: 0, hour: 2, ack: 1 },
  { sound: 'door_knock', conf: 0.92, daysAgo: 0, hour: 9, ack: 0 },
  { sound: 'alarm_bell', conf: 0.96, daysAgo: 0, hour: 11, ack: 0 }
];

const insertStmt = db.prepare(`
  INSERT INTO detections (device_id, sound, confidence, timestamp, created_at, acknowledged, acknowledged_at, is_test)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);

const now = Date.now();
for (const s of sampleEvents) {
  const d = new Date();
  d.setDate(d.getDate() - s.daysAgo);
  d.setHours(s.hour, Math.floor(Math.random() * 59), 0, 0);
  const ts = d.getTime();
  const iso = d.toISOString();
  const ackAt = s.ack ? new Date(ts + 35000).toISOString() : null;

  insertStmt.run('soundguard_01', s.sound, s.conf, ts, iso, s.ack, ackAt);
}

// Also seed active device status
const devStmt = db.prepare(`
  INSERT INTO devices (device_id, status, last_seen, last_sound, wifi_rssi, firmware_version, ip_address, updated_at)
  VALUES ('soundguard_01', 'online', ?, 'alarm_bell', -62, '1.2.0-TinyML', '192.168.1.105', ?)
  ON CONFLICT(device_id) DO UPDATE SET
    last_seen = excluded.last_seen,
    last_sound = excluded.last_sound,
    wifi_rssi = excluded.wifi_rssi,
    updated_at = excluded.updated_at
`);
devStmt.run(now, new Date(now).toISOString());

console.log('✅ SQLite database seeded with 10 realistic sound events and device status!');
