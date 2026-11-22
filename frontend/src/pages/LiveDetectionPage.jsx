import React, { useState } from 'react';
import { 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Wifi,
  WifiOff,
  Volume2
} from 'lucide-react';
import VisualAlertBanner from '../components/VisualAlertBanner';
import SoundBadge, { SOUND_CONFIG } from '../components/SoundBadge';

export default function LiveDetectionPage({
  activeAlert,
  recentEvents,
  onAcknowledge,
  isAcknowledging,
  isSocketConnected,
  isDeviceOnline,
  onTriggerTest
}) {
  const [selectedSampleSound, setSelectedSampleSound] = useState('door_knock');
  const [sampleConfidence, setSampleConfidence] = useState(0.93);

  const handleSimulate = () => {
    if (onTriggerTest) {
      onTriggerTest(selectedSampleSound, sampleConfidence);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Connection Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Real-Time Assistive Listening Feed
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Socket.IO Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Broadcasting classifications directly from ESP32 ICS-43434 MEMS sensor over local Wi-Fi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
            {isDeviceOnline ? (
              <>
                <Wifi size={13} className="text-emerald-400" />
                <span className="text-emerald-400">ESP32 Online</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-slate-500" />
                <span className="text-slate-500">ESP32 Offline</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-cyan-400' : 'bg-amber-400'}`} />
            <span className={isSocketConnected ? 'text-cyan-400' : 'text-amber-400'}>
              {isSocketConnected ? 'Socket Synced' : 'Reconnecting'}
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Active Visual Alert Card */}
      {activeAlert ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Active Unacknowledged Alert
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Event #{activeAlert.id}
            </span>
          </div>
          <VisualAlertBanner
            alert={activeAlert}
            onAcknowledge={onAcknowledge}
            isAcknowledging={isAcknowledging}
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-800 p-8 text-center bg-slate-950/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Radio size={22} className="animate-pulse text-cyan-400" />
          </div>
          <h4 className="text-base font-semibold text-slate-300">Standing By for Sound Detections</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The system is actively listening. When the ESP32 registers a knock, clap, crying baby, or alarm with sufficient confidence, a high-visibility tactile alert banner will appear immediately.
          </p>
        </div>
      )}

      {/* Simulator Test Bar */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles size={14} className="text-cyan-400" />
            Hardware Verification / Assistive Alert Simulator
          </span>
          <span className="text-[11px] text-slate-500">
            Tests visual banner, chime &amp; haptic feedback
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSampleSound}
            onChange={(e) => setSelectedSampleSound(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="door_knock">Door Knock</option>
            <option value="clapping">Clapping</option>
            <option value="crying_baby">Crying Baby</option>
            <option value="alarm_bell">Bell / Alarm</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Confidence:</span>
            <input
              type="range"
              min="0.70"
              max="0.99"
              step="0.01"
              value={sampleConfidence}
              onChange={(e) => setSampleConfidence(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500"
            />
            <span className="font-mono text-cyan-400">{Math.round(sampleConfidence * 100)}%</span>
          </div>

          <button
            onClick={handleSimulate}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            Simulate Event
          </button>
        </div>
      </div>

      {/* Live Stream List of Recent Events */}
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Live Event Stream</h3>
            <p className="text-xs text-slate-400">Chronological incoming events received over WebSocket</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {recentEvents.length} in current session
          </span>
        </div>

        {recentEvents.length > 0 ? (
          <div className="space-y-2.5">
            {recentEvents.map((event) => {
              const isAck = event.acknowledged;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SoundBadge sound={event.sound} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white font-mono">
                          {event.confidence_pct || Math.round(event.confidence * 100)}% Confidence
                        </span>
                        {event.is_test ? (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            Test Event
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {new Date(event.timestamp).toLocaleTimeString()} &bull; Device: {event.device_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAck ? (
                      <span className="text-emerald-400 text-xs font-medium flex items-center gap-1 font-mono">
                        <CheckCircle2 size={14} /> Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => onAcknowledge && onAcknowledge(event.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            No live events received in this session yet.
          </div>
        )}
      </div>
    </div>
  );
}
