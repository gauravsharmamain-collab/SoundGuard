import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Clock, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Terminal,
  Activity,
  HardDrive,
  Copy,
  Check
} from 'lucide-react';
import SoundBadge from '../components/SoundBadge';
import { fetchDeviceStatus, sendHeartbeat } from '../services/api';

export default function DeviceStatusPage({ deviceStatus, onRefresh }) {
  const [localStatus, setLocalStatus] = useState(deviceStatus);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingTestHeartbeat, setSendingTestHeartbeat] = useState(false);

  useEffect(() => {
    setLocalStatus(deviceStatus);
  }, [deviceStatus]);

  const primary = localStatus?.primary_device;
  const isOnline = localStatus?.is_online || false;
  const rssi = primary?.wifi_rssi;

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetchDeviceStatus();
      setLocalStatus(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestHeartbeat = async () => {
    setSendingTestHeartbeat(true);
    try {
      await sendHeartbeat({
        device_id: primary?.device_id || 'soundguard_01',
        status: 'online',
        wifi_rssi: -58,
        firmware_version: '1.2.0-TinyML'
      });
      await handleManualRefresh();
    } catch (err) {
      alert(`Heartbeat error: ${err.message}`);
    } finally {
      setSendingTestHeartbeat(false);
    }
  };

  // Signal strength categorization
  const getRssiQuality = (dbm) => {
    if (dbm === null || dbm === undefined) return { label: 'Unknown', color: 'text-slate-500', bars: 0 };
    if (dbm >= -60) return { label: 'Excellent', color: 'text-emerald-400', bars: 4 };
    if (dbm >= -70) return { label: 'Good', color: 'text-cyan-400', bars: 3 };
    if (dbm >= -80) return { label: 'Fair', color: 'text-amber-400', bars: 2 };
    return { label: 'Weak', color: 'text-rose-400', bars: 1 };
  };

  const rssiInfo = getRssiQuality(rssi);

  const sampleHeartbeatCurl = `curl -X POST http://localhost:5000/api/device/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\\"device_id\\":\\"soundguard_01\\",\\"status\\":\\"online\\",\\"wifi_rssi\\":-62}"`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Device Status Header Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isOnline 
          ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
          : 'bg-slate-900/90 border-slate-800 shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {isOnline ? <Wifi size={30} className="animate-pulse" /> : <WifiOff size={30} />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {primary?.device_id || 'soundguard_01'}
                </h3>
                <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {isOnline ? 'Online (Heartbeat Synced)' : 'Offline (No Heartbeat >30s)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Hardware: ESP32-WROOM-32 &bull; Mic: ICS-43434 I2S MEMS &bull; Model: Edge Impulse TinyML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTestHeartbeat}
              disabled={sendingTestHeartbeat}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors shadow-sm cursor-pointer"
            >
              {sendingTestHeartbeat ? 'Sending...' : 'Send Test Heartbeat'}
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Refresh device state"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Telemetry Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Connection State</span>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <span className="text-lg font-bold font-mono text-white">
              {isOnline ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Timeout: &gt;30s threshold
          </p>
        </div>

        {/* Last Communication Time */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Last Communication</span>
          <div className="text-lg font-bold font-mono text-white">
            {primary?.last_seen 
              ? `${primary.seconds_since_last_seen || Math.round((Date.now() - primary.last_seen)/1000)}s ago`
              : 'Never'
            }
          </div>
          <p className="text-xs text-slate-500 font-mono truncate">
            {primary?.last_seen ? new Date(primary.last_seen).toLocaleTimeString() : 'Awaiting first packet'}
          </p>
        </div>

        {/* Wi-Fi RSSI Signal Strength */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Wi-Fi Signal (RSSI)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-white">
              {rssi !== null && rssi !== undefined ? `${rssi} dBm` : 'N/A'}
            </span>
            <span className={`text-xs font-semibold ${rssiInfo.color}`}>
              {rssiInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-1 pt-1">
            {[1, 2, 3, 4].map(bar => (
              <div
                key={bar}
                className={`h-2.5 w-5 rounded-sm transition-colors ${
                  bar <= rssiInfo.bars ? 'bg-cyan-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Firmware Version */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Firmware Version</span>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {primary?.firmware_version || '1.0.0-TinyML'}
          </div>
          <p className="text-xs text-slate-500 font-mono">
            IP: {primary?.ip_address || 'LAN Dynamic'}
          </p>
        </div>
      </div>

      {/* Last Detected Sound from this device */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Last Detected Sound Event on Device
          </span>
          <div className="mt-2 flex items-center gap-3">
            {primary?.last_sound ? (
              <SoundBadge sound={primary.last_sound} size="lg" showPriority={true} />
            ) : (
              <span className="text-sm text-slate-500 italic">No sound event recorded yet</span>
            )}
          </div>
        </div>
        <Clock size={20} className="text-slate-600" />
      </div>

      {/* Heartbeat Testing & ESP32 Configuration Help */}
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal size={18} className="text-cyan-400" />
              ESP32 Heartbeat Telemetry Protocol
            </h4>
            <p className="text-xs text-slate-400">
              The ESP32 sends a periodic HTTP POST every 10 seconds to maintain its online status.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          If no heartbeat is received within <strong className="text-cyan-400 font-mono">30 seconds</strong>, the backend marks the device <strong className="text-rose-400">offline</strong> and notifies the frontend immediately through Socket.IO.
        </p>

        {/* Windows CMD Test Command snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Windows CMD Heartbeat Test Command:</span>
            <button
              onClick={() => copyToClipboard(sampleHeartbeatCurl)}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy CMD'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre">
            {sampleHeartbeatCurl}
          </pre>
        </div>
      </div>
    </div>
  );
}
