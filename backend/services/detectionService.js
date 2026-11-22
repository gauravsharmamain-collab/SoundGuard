import db from '../database/db.js';
import { getSetting } from './settingsService.js';
import { updateDeviceLastSound } from './deviceService.js';

export const SUPPORTED_CATEGORIES = {
  door_knock: {
    id: 'door_knock',
    name: 'Door Knock',
    label: 'Door Knock',
    priority: 'medium',
    icon: 'DoorClosed',
    color: '#06b6d4', // cyan-500
    alertColor: 'cyan'
  },
  clapping: {
    id: 'clapping',
    name: 'Clapping',
    label: 'Clapping',
    priority: 'low',
    icon: 'Hands',
    color: '#3b82f6', // blue-500
    alertColor: 'blue'
  },
  crying_baby: {
    id: 'crying_baby',
    name: 'Crying Baby',
    label: 'Crying Baby',
    priority: 'high',
    icon: 'Baby',
    color: '#f59e0b', // amber-500
    alertColor: 'amber'
  },
  alarm_bell: {
    id: 'alarm_bell',
    name: 'Bell / Alarm',
    label: 'Bell / Alarm',
    priority: 'critical',
    icon: 'BellRing',
    color: '#ef4444', // red-500
    alertColor: 'red'
  }
};

const SOUND_ALIASES = {
  // Door knocks
  'door_knock': 'door_knock',
  'door_knocking': 'door_knock',
  'knock': 'door_knock',
  'knocking': 'door_knock',
  'door': 'door_knock',

  // Clapping
  'clapping': 'clapping',
  'clap': 'clapping',
  'applause': 'clapping',

  // Crying baby
  'crying_baby': 'crying_baby',
  'baby_crying': 'crying_baby',
  'baby_cry': 'crying_baby',
  'crying': 'crying_baby',
  'baby': 'crying_baby',

  // Bells / alarms
  'alarm_bell': 'alarm_bell',
  'bell_alarm': 'alarm_bell',
  'bells_alarms': 'alarm_bell',
  'alarm': 'alarm_bell',
  'bell': 'alarm_bell',
  'fire_alarm': 'alarm_bell',
  'smoke_alarm': 'alarm_bell',
  'siren': 'alarm_bell'
};

export function normalizeSound(rawSound) {
  if (!rawSound || typeof rawSound !== 'string') return null;
  const clean = rawSound.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SOUND_ALIASES[clean] || (SUPPORTED_CATEGORIES[clean] ? clean : null);
}

export function addDetection({ device_id, sound, confidence, timestamp, is_test = 0 }) {
  if (!device_id || typeof device_id !== 'string' || device_id.trim() === '') {
    throw new Error('device_id must be a non-empty string');
  }

  const normalizedSound = normalizeSound(sound);
  if (!normalizedSound) {
    throw new Error(
      `Unsupported sound category: '${sound}'. Must be one of: ${Object.keys(SUPPORTED_CATEGORIES).join(', ')}`
    );
  }

  const numConfidence = parseFloat(confidence);
  if (isNaN(numConfidence) || numConfidence < 0 || numConfidence > 1) {
    throw new Error('confidence must be a number between 0 and 1');
  }

  // Check against minimum confidence setting
  const minConfidenceSetting = getSetting('min_confidence', 0.70);
  if (numConfidence < minConfidenceSetting) {
    const err = new Error(`Confidence ${numConfidence.toFixed(2)} is below minimum threshold ${minConfidenceSetting}`);
    err.status = 422;
    err.code = 'CONFIDENCE_BELOW_THRESHOLD';
    throw err;
  }

  // Normalize timestamp (handle unix seconds vs milliseconds)
  let ts = timestamp ? Number(timestamp) : Date.now();
  if (ts < 10000000000) {
    // timestamp is in seconds, convert to ms
    ts = ts * 1000;
  }
  const isoCreated = new Date(ts).toISOString();

  const stmt = db.prepare(`
    INSERT INTO detections (device_id, sound, confidence, timestamp, created_at, acknowledged, is_test)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);

  const result = stmt.run(device_id.trim(), normalizedSound, numConfidence, ts, isoCreated, is_test ? 1 : 0);
  const insertedId = Number(result.lastInsertRowid);

  // Update device record with latest activity
  updateDeviceLastSound(device_id.trim(), normalizedSound);

  const inserted = db.prepare('SELECT * FROM detections WHERE id = ?').get(insertedId);
  const metadata = SUPPORTED_CATEGORIES[normalizedSound];

  return {
    ...inserted,
    confidence_pct: Math.round(inserted.confidence * 100),
    sound_name: metadata.name,
    priority: metadata.priority,
    color: metadata.color
  };
}

export function getDetections({
  category,
  start_date,
  end_date,
  minimum_confidence,
  page = 1,
  limit = 20,
  sort = 'desc'
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  const sortDirection = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const whereClauses = [];
  const params = [];

  if (category) {
    const norm = normalizeSound(category) || category;
    whereClauses.push('sound = ?');
    params.push(norm);
  }

  if (minimum_confidence !== undefined && minimum_confidence !== null && minimum_confidence !== '') {
    const minConf = parseFloat(minimum_confidence);
    if (!isNaN(minConf)) {
      whereClauses.push('confidence >= ?');
      params.push(minConf);
    }
  }

  if (start_date) {
    const startTs = new Date(start_date).getTime();
    if (!isNaN(startTs)) {
      whereClauses.push('timestamp >= ?');
      params.push(startTs);
    }
  }

  if (end_date) {
    const endTs = new Date(end_date).getTime();
    if (!isNaN(endTs)) {
      whereClauses.push('timestamp <= ?');
      params.push(endTs);
    }
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total matching
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM detections ${whereSQL}`).get(...params);
  const total = countRow ? Number(countRow.total) : 0;

  // Get paginated items
  const querySQL = `
    SELECT * FROM detections 
    ${whereSQL}
    ORDER BY timestamp ${sortDirection}
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(querySQL).all(...params, limitNum, offset);

  const formattedRows = rows.map(r => {
    const meta = SUPPORTED_CATEGORIES[r.sound] || { name: r.sound, priority: 'medium', color: '#06b6d4' };
    return {
      ...r,
      confidence_pct: Math.round(r.confidence * 100),
      sound_name: meta.name,
      priority: meta.priority,
      color: meta.color
    };
  });

  return {
    data: formattedRows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
}

export function acknowledgeDetection(id) {
  const row = db.prepare('SELECT * FROM detections WHERE id = ?').get(id);
  if (!row) {
    throw new Error(`Detection event with ID ${id} not found`);
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE detections SET acknowledged = 1, acknowledged_at = ? WHERE id = ?').run(nowIso, id);

  const updated = db.prepare('SELECT * FROM detections WHERE id = ?').get(id);
  const meta = SUPPORTED_CATEGORIES[updated.sound] || { name: updated.sound, priority: 'medium', color: '#06b6d4' };

  return {
    ...updated,
    confidence_pct: Math.round(updated.confidence * 100),
    sound_name: meta.name,
    priority: meta.priority,
    color: meta.color
  };
}

export function clearAllDetections() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM detections').get();
  db.prepare('DELETE FROM detections').run();
  return { deleted_count: countRow ? Number(countRow.cnt) : 0 };
}

export function getStats() {
  // Total detections
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM detections').get();
  const total_detections = totalRow ? Number(totalRow.count) : 0;

  // Today's detections
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const todayRow = db.prepare('SELECT COUNT(*) as count FROM detections WHERE timestamp >= ?').get(startOfTodayMs);
  const today_detections = todayRow ? Number(todayRow.count) : 0;

  // Unacknowledged count
  const unackRow = db.prepare('SELECT COUNT(*) as count FROM detections WHERE acknowledged = 0').get();
  const unacknowledged_count = unackRow ? Number(unackRow.count) : 0;

  // Category counts
  const category_counts = {
    door_knock: 0,
    clapping: 0,
    crying_baby: 0,
    alarm_bell: 0
  };

  const countRows = db.prepare('SELECT sound, COUNT(*) as count FROM detections GROUP BY sound').all();
  let most_common_sound = null;
  let maxCount = -1;

  for (const r of countRows) {
    if (category_counts[r.sound] !== undefined) {
      category_counts[r.sound] = Number(r.count);
    }
    if (Number(r.count) > maxCount) {
      maxCount = Number(r.count);
      most_common_sound = {
        id: r.sound,
        name: SUPPORTED_CATEGORIES[r.sound]?.name || r.sound,
        count: Number(r.count)
      };
    }
  }

  // Average confidence overall
  const avgRow = db.prepare('SELECT AVG(confidence) as avg_conf FROM detections').get();
  const average_confidence = avgRow?.avg_conf ? Math.round(Number(avgRow.avg_conf) * 100) : 0;

  // Average confidence per category
  const avgCatRows = db.prepare('SELECT sound, AVG(confidence) as avg_conf FROM detections GROUP BY sound').all();
  const average_confidence_by_category = {
    door_knock: 0,
    clapping: 0,
    crying_baby: 0,
    alarm_bell: 0
  };
  for (const r of avgCatRows) {
    if (average_confidence_by_category[r.sound] !== undefined) {
      average_confidence_by_category[r.sound] = Math.round(Number(r.avg_conf) * 100);
    }
  }

  // Timeline: past 7 days (or hourly for today if < 7 days)
  const timeline = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayRows = db.prepare(`
      SELECT sound, COUNT(*) as count 
      FROM detections 
      WHERE timestamp >= ? AND timestamp < ? 
      GROUP BY sound
    `).all(dayStart, dayEnd);

    const dayCounts = {
      date: dateLabel,
      timestamp: dayStart,
      total: 0,
      door_knock: 0,
      clapping: 0,
      crying_baby: 0,
      alarm_bell: 0
    };

    for (const r of dayRows) {
      const cnt = Number(r.count);
      dayCounts[r.sound] = cnt;
      dayCounts.total += cnt;
    }
    timeline.push(dayCounts);
  }

  // Latest prediction confidence scores from actual received detections
  // Note: Per user prompt, "Only show actual prediction values received from the ESP32. Do not invent live values."
  const latestScores = {
    door_knock: null,
    clapping: null,
    crying_baby: null,
    alarm_bell: null
  };

  for (const cat of Object.keys(SUPPORTED_CATEGORIES)) {
    const lastCat = db.prepare('SELECT confidence, timestamp FROM detections WHERE sound = ? ORDER BY timestamp DESC LIMIT 1').get(cat);
    if (lastCat) {
      latestScores[cat] = {
        confidence: Number(lastCat.confidence),
        confidence_pct: Math.round(Number(lastCat.confidence) * 100),
        timestamp: Number(lastCat.timestamp)
      };
    }
  }

  // Latest overall detection
  const latestRow = db.prepare('SELECT * FROM detections ORDER BY timestamp DESC LIMIT 1').get();
  let latest_detection = null;
  if (latestRow) {
    const meta = SUPPORTED_CATEGORIES[latestRow.sound] || { name: latestRow.sound, priority: 'medium', color: '#06b6d4' };
    latest_detection = {
      ...latestRow,
      confidence_pct: Math.round(latestRow.confidence * 100),
      sound_name: meta.name,
      priority: meta.priority,
      color: meta.color
    };
  }

  // Recent 10 detections
  const recentRows = db.prepare('SELECT * FROM detections ORDER BY timestamp DESC LIMIT 10').all();
  const recent_detections = recentRows.map(r => {
    const meta = SUPPORTED_CATEGORIES[r.sound] || { name: r.sound, priority: 'medium', color: '#06b6d4' };
    return {
      ...r,
      confidence_pct: Math.round(r.confidence * 100),
      sound_name: meta.name,
      priority: meta.priority,
      color: meta.color
    };
  });

  return {
    total_detections,
    today_detections,
    unacknowledged_count,
    most_common_sound,
    category_counts,
    average_confidence,
    average_confidence_by_category,
    timeline,
    latest_confidence_scores: latestScores,
    latest_detection,
    recent_detections
  };
}
