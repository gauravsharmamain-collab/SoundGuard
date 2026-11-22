const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch statistics');
  const json = await res.json();
  return json.stats;
}

export async function fetchDetections({
  category = '',
  start_date = '',
  end_date = '',
  minimum_confidence = '',
  page = 1,
  limit = 20,
  sort = 'desc'
} = {}) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);
  if (minimum_confidence !== '' && minimum_confidence !== undefined) {
    params.append('minimum_confidence', minimum_confidence);
  }
  params.append('page', page);
  params.append('limit', limit);
  params.append('sort', sort);

  const res = await fetch(`${API_BASE}/detections?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch detection history');
  return res.json();
}

export async function createDetection({ device_id, sound, confidence, timestamp, is_test = 0 }) {
  const res = await fetch(`${API_BASE}/detections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id, sound, confidence, timestamp, is_test })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to submit detection');
  return json.detection;
}

export async function acknowledgeDetection(id) {
  const res = await fetch(`${API_BASE}/detections/${id}/acknowledge`, {
    method: 'PATCH'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to acknowledge detection');
  return json.detection;
}

export async function clearDetectionHistory() {
  const res = await fetch(`${API_BASE}/detections`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to clear history');
  return json;
}

export async function fetchDeviceStatus(deviceId = null) {
  const url = deviceId ? `${API_BASE}/device/status?device_id=${encodeURIComponent(deviceId)}` : `${API_BASE}/device/status`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch device status');
  return res.json();
}

export async function sendHeartbeat(data) {
  const res = await fetch(`${API_BASE}/device/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to send heartbeat');
  return json.device;
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return json.settings;
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update settings');
  return json.settings;
}
