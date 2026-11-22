import db from '../database/db.js';

const OFFLINE_TIMEOUT_MS = 30000; // 30 seconds offline threshold

export function recordHeartbeat({ device_id, status = 'online', wifi_rssi = null, firmware_version = '1.0.0', ip_address = null }) {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const stmt = db.prepare(`
    INSERT INTO devices (device_id, status, last_seen, wifi_rssi, firmware_version, ip_address, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      status = excluded.status,
      last_seen = excluded.last_seen,
      wifi_rssi = COALESCE(excluded.wifi_rssi, devices.wifi_rssi),
      firmware_version = COALESCE(excluded.firmware_version, devices.firmware_version),
      ip_address = COALESCE(excluded.ip_address, devices.ip_address),
      updated_at = excluded.updated_at
  `);

  stmt.run(device_id, status, now, wifi_rssi, firmware_version, ip_address, isoNow);

  return getDeviceStatus(device_id);
}

export function updateDeviceLastSound(device_id, sound) {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const stmt = db.prepare(`
    INSERT INTO devices (device_id, status, last_seen, last_sound, updated_at)
    VALUES (?, 'online', ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      last_seen = excluded.last_seen,
      last_sound = excluded.last_sound,
      updated_at = excluded.updated_at
  `);

  stmt.run(device_id, now, sound, isoNow);
}

export function getDeviceStatus(device_id = null) {
  const now = Date.now();

  if (device_id) {
    const row = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(device_id);
    if (!row) {
      return {
        device_id,
        is_online: false,
        status: 'disconnected',
        last_seen: null,
        last_sound: null,
        wifi_rssi: null,
        firmware_version: null,
        seconds_since_last_seen: null
      };
    }

    const elapsed = now - Number(row.last_seen);
    const isOnline = elapsed <= OFFLINE_TIMEOUT_MS;

    return {
      ...row,
      is_online: isOnline,
      status: isOnline ? 'online' : 'offline',
      seconds_since_last_seen: Math.round(elapsed / 1000)
    };
  }

  // If no device_id specified, return all devices and find primary
  const rows = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
  const devices = rows.map(row => {
    const elapsed = now - Number(row.last_seen);
    const isOnline = elapsed <= OFFLINE_TIMEOUT_MS;
    return {
      ...row,
      is_online: isOnline,
      status: isOnline ? 'online' : 'offline',
      seconds_since_last_seen: Math.round(elapsed / 1000)
    };
  });

  const primary = devices.length > 0 ? devices[0] : null;

  return {
    primary_device: primary,
    devices,
    is_online: primary ? primary.is_online : false,
    offline_timeout_seconds: OFFLINE_TIMEOUT_MS / 1000
  };
}
