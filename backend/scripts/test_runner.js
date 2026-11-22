/**
 * SoundGuard Comprehensive Automated Test Runner
 * Tests the backend API and SQLite database in-process.
 */

import http from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { initDatabase } from '../database/db.js';
import { createApiRouter } from '../routes/api.js';

initDatabase();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api', createApiRouter(io));

const PORT = 5001; // Test port to avoid conflicts
const BASE_URL = `http://127.0.0.1:${PORT}`;

let totalTests = 0;
let passedTests = 0;

function assertTest(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(` ✅ [PASS] ${name}`);
    if (details) console.log(`        ${details}`);
  } else {
    console.error(` ❌ [FAIL] ${name}`);
    if (details) console.error(`        ${details}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

server.listen(PORT, '127.0.0.1', async () => {
  console.log('================================================================');
  console.log('🛡️  SOUNDGUARD IN-PROCESS END-TO-END VERIFICATION TEST SUITE');
  console.log(`Testing server listening on ${BASE_URL}`);
  console.log('================================================================');

  try {
    // 1. Health check
    console.log('\n[1/8] Testing GET /api/health...');
    const health = await request('/api/health');
    assertTest('GET /api/health returns healthy', health.ok && health.data?.status === 'healthy', `Uptime: ${health.data?.uptime}s`);

    // 2. Heartbeat
    console.log('\n[2/8] Testing POST /api/device/heartbeat...');
    const heartbeat = await request('/api/device/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        device_id: 'soundguard_01',
        status: 'online',
        wifi_rssi: -62,
        firmware_version: '1.2.0-TinyML'
      })
    });
    assertTest('POST /api/device/heartbeat updates device state', heartbeat.ok && heartbeat.data?.device?.status === 'online', `Device ID: ${heartbeat.data?.device?.device_id}, RSSI: ${heartbeat.data?.device?.wifi_rssi} dBm`);

    // 3. Device status (<30s timeout check)
    console.log('\n[3/8] Testing GET /api/device/status...');
    const devStatus = await request('/api/device/status');
    assertTest('GET /api/device/status recognizes active device', devStatus.ok && devStatus.data?.is_online === true, `Online: ${devStatus.data?.is_online}, Last seen: ${devStatus.data?.primary_device?.seconds_since_last_seen}s ago`);

    // 4. Ingest Detection (Door Knock)
    console.log('\n[4/8] Testing POST /api/detections (Door Knock)...');
    const knock = await request('/api/detections', {
      method: 'POST',
      body: JSON.stringify({
        device_id: 'soundguard_01',
        sound: 'door_knock',
        confidence: 0.94,
        timestamp: Date.now(),
        is_test: 1
      })
    });
    const testEventId = knock.data?.detection?.id;
    assertTest('POST /api/detections records door_knock', knock.ok && knock.data?.detection?.sound === 'door_knock', `Saved Event ID #${testEventId}, Confidence: ${knock.data?.detection?.confidence_pct}%`);

    // 5. Ingest other target sounds: Clapping, Crying Baby, Alarm Bell
    console.log('\n[5/8] Testing Target Sound Categories (Clap, Baby Cry, Alarm)...');
    const clap = await request('/api/detections', {
      method: 'POST',
      body: JSON.stringify({ device_id: 'soundguard_01', sound: 'clapping', confidence: 0.88, is_test: 1 })
    });
    const baby = await request('/api/detections', {
      method: 'POST',
      body: JSON.stringify({ device_id: 'soundguard_01', sound: 'crying_baby', confidence: 0.91, is_test: 1 })
    });
    const alarm = await request('/api/detections', {
      method: 'POST',
      body: JSON.stringify({ device_id: 'soundguard_01', sound: 'alarm_bell', confidence: 0.98, is_test: 1 })
    });
    assertTest('POST /api/detections records all 4 target categories', clap.ok && baby.ok && alarm.ok, `Clap ID: ${clap.data?.detection?.id}, Baby ID: ${baby.data?.detection?.id}, Alarm ID: ${alarm.data?.detection?.id}`);

    // 6. Test Threshold Enforcement (Rejection of low confidence)
    console.log('\n[6/8] Testing Confidence Threshold Enforcement (<0.70)...');
    const lowConf = await request('/api/detections', {
      method: 'POST',
      body: JSON.stringify({ device_id: 'soundguard_01', sound: 'door_knock', confidence: 0.42 })
    });
    assertTest('POST /api/detections rejects confidence below threshold', lowConf.status === 422 || lowConf.status === 400, `Rejected with status ${lowConf.status}: ${lowConf.data?.error}`);

    // 7. Acknowledge Detection in SQLite
    console.log('\n[7/8] Testing PATCH /api/detections/:id/acknowledge...');
    if (testEventId) {
      const ack = await request(`/api/detections/${testEventId}/acknowledge`, { method: 'PATCH' });
      assertTest('PATCH /api/detections/:id/acknowledge updates SQLite status', ack.ok && ack.data?.detection?.acknowledged === 1, `Acknowledged at: ${ack.data?.detection?.acknowledged_at}`);
    } else {
      assertTest('Acknowledgement test skipped', false);
    }

    // 8. Statistics Calculation
    console.log('\n[8/8] Testing GET /api/stats (Aggregations)...');
    const stats = await request('/api/stats');
    const s = stats.data?.stats;
    const statsValid = s && s.total_detections >= 4 && s.category_counts.door_knock >= 1 && s.category_counts.alarm_bell >= 1;
    assertTest('GET /api/stats returns accurate SQLite aggregations', statsValid, `Total: ${s?.total_detections}, Today: ${s?.today_detections}, Most Common: ${s?.most_common_sound?.name}`);

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test run failed with error:', err);
  } finally {
    server.close(() => {
      process.exit(passedTests === totalTests ? 0 : 1);
    });
  }
});
