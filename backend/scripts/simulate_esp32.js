/**
 * SoundGuard ESP32 Simulator Script
 * Simulates ESP32 HTTP requests to test the backend and frontend without physical hardware.
 *
 * Usage:
 *   node scripts/simulate_esp32.js --help
 *   node scripts/simulate_esp32.js --heartbeat
 *   node scripts/simulate_esp32.js --detect door_knock --conf 0.92
 *   node scripts/simulate_esp32.js --loop       (simulates running ESP32)
 *   node scripts/simulate_esp32.js --seed       (populates realistic initial history)
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const DEVICE_ID = 'soundguard_esp32_01';

const SOUNDS = ['door_knock', 'clapping', 'crying_baby', 'alarm_bell'];

async function postJSON(endpoint, data) {
  try {
    const res = await fetch(`${SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendHeartbeat(rssi = -62) {
  console.log(`[Simulator] Sending heartbeat for ${DEVICE_ID} (RSSI: ${rssi} dBm)...`);
  const res = await postJSON('/api/device/heartbeat', {
    device_id: DEVICE_ID,
    status: 'online',
    wifi_rssi: rssi,
    firmware_version: '1.2.0-TinyML'
  });
  if (res.ok) {
    console.log('✅ Heartbeat accepted:', res.json.message || 'OK');
  } else {
    console.error('❌ Heartbeat failed:', res.error || res.json);
  }
}

async function sendDetection(sound, confidence = 0.91) {
  console.log(`[Simulator] Sending detection: ${sound} (confidence: ${(confidence * 100).toFixed(0)}%)...`);
  const res = await postJSON('/api/detections', {
    device_id: DEVICE_ID,
    sound,
    confidence,
    timestamp: Date.now(),
    is_test: 1
  });
  if (res.ok) {
    console.log(`✅ Detection accepted! ID: ${res.json.detection?.id}, Sound: ${res.json.detection?.sound_name}`);
  } else {
    console.error('❌ Detection rejected:', res.error || res.json);
  }
}

async function seedHistory() {
  console.log('[Simulator] Seeding realistic sample events across the past 7 days...');
  const sampleEvents = [
    { sound: 'door_knock', conf: 0.94, daysAgo: 6, hour: 10 },
    { sound: 'clapping', conf: 0.88, daysAgo: 5, hour: 14 },
    { sound: 'crying_baby', conf: 0.91, daysAgo: 4, hour: 3 },
    { sound: 'door_knock', conf: 0.86, daysAgo: 3, hour: 11 },
    { sound: 'alarm_bell', conf: 0.97, daysAgo: 2, hour: 16 },
    { sound: 'clapping', conf: 0.82, daysAgo: 1, hour: 19 },
    { sound: 'door_knock', conf: 0.95, daysAgo: 1, hour: 20 },
    { sound: 'crying_baby', conf: 0.89, daysAgo: 0, hour: 2 },
    { sound: 'door_knock', conf: 0.92, daysAgo: 0, hour: 9 },
    { sound: 'alarm_bell', conf: 0.96, daysAgo: 0, hour: 11 }
  ];

  for (const s of sampleEvents) {
    const d = new Date();
    d.setDate(d.getDate() - s.daysAgo);
    d.setHours(s.hour, Math.floor(Math.random() * 59), 0, 0);
    const ts = d.getTime();

    await postJSON('/api/detections', {
      device_id: DEVICE_ID,
      sound: s.sound,
      confidence: s.conf,
      timestamp: ts,
      is_test: 1
    });
  }

  await sendHeartbeat(-58);
  console.log('✅ Seed completed with 10 events!');
}

async function startLoop() {
  console.log(`[Simulator] Starting continuous ESP32 simulation for device ${DEVICE_ID}`);
  console.log('Heartbeat every 10s, random detection events every 12-25s. Press Ctrl+C to exit.');

  // Initial heartbeat
  await sendHeartbeat(-60);

  // Heartbeat timer
  setInterval(async () => {
    const rssi = -55 - Math.floor(Math.random() * 15);
    await sendHeartbeat(rssi);
  }, 10000);

  // Random detection events
  function scheduleNextDetection() {
    const delay = 12000 + Math.floor(Math.random() * 13000);
    setTimeout(async () => {
      const sound = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
      const conf = parseFloat((0.75 + Math.random() * 0.23).toFixed(2));
      await sendDetection(sound, conf);
      scheduleNextDetection();
    }, delay);
  }

  scheduleNextDetection();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
SoundGuard ESP32 Simulator
---------------------------
Commands:
  node scripts/simulate_esp32.js --heartbeat
  node scripts/simulate_esp32.js --detect door_knock [--conf 0.92]
  node scripts/simulate_esp32.js --seed
  node scripts/simulate_esp32.js --loop
    `);
    process.exit(0);
  }

  if (args.includes('--seed')) {
    await seedHistory();
    process.exit(0);
  }

  if (args.includes('--heartbeat')) {
    await sendHeartbeat(-60);
    process.exit(0);
  }

  const detectIdx = args.indexOf('--detect');
  if (detectIdx !== -1 && args[detectIdx + 1]) {
    const sound = args[detectIdx + 1];
    let conf = 0.92;
    const confIdx = args.indexOf('--conf');
    if (confIdx !== -1 && args[confIdx + 1]) {
      conf = parseFloat(args[confIdx + 1]);
    }
    await sendDetection(sound, conf);
    process.exit(0);
  }

  if (args.includes('--loop')) {
    await startLoop();
    return;
  }

  // Default: send 1 heartbeat and 1 sample detection
  console.log('Sending single heartbeat and single sample detection event...');
  await sendHeartbeat(-64);
  await sendDetection('door_knock', 0.93);
  process.exit(0);
}

main().catch(console.error);
