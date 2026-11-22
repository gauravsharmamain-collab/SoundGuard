import React from 'react';
import { 
  Activity, 
  Clock, 
  Radio, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Wifi,
  WifiOff,
  Flame,
  Volume2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SoundBadge, { SOUND_CONFIG } from '../components/SoundBadge';
import ConfidenceBar from '../components/ConfidenceBar';

export default function OverviewPage({
  stats,
  deviceStatus,
  latestDetection,
  onAcknowledge,
  acknowledgedIds,
  minConfidence = 0.70
}) {
  const totalCount = stats?.total_detections || 0;
  const todayCount = stats?.today_detections || 0;
  const mostCommon = stats?.most_common_sound;
  const isOnline = deviceStatus?.is_online || false;

  const targetSounds = ['door_knock', 'clapping', 'crying_baby', 'alarm_bell'];
  const latestScores = stats?.latest_confidence_scores || {};
  const recentDetections = stats?.recent_detections || [];

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Detections"
          value={totalCount}
          subtitle="Persistent historical events"
          icon={Activity}
          color="cyan"
        />

        <StatCard
          title="Detections Today"
          value={todayCount}
          subtitle="Recorded since midnight"
          icon={Clock}
          color="blue"
        />

        <StatCard
          title="Most Frequent Sound"
          value={mostCommon ? mostCommon.name : 'None'}
          subtitle={mostCommon ? `${mostCommon.count} detection events` : 'No events recorded yet'}
          icon={Flame}
          color="amber"
        />

        <StatCard
          title="ESP32 Link Status"
          value={isOnline ? 'ONLINE' : 'OFFLINE'}
          subtitle={
            isOnline 
              ? `Heartbeat active (${deviceStatus?.primary_device?.seconds_since_last_seen || 0}s ago)`
              : 'No heartbeat within 30s'
          }
          icon={isOnline ? Wifi : WifiOff}
          color={isOnline ? 'emerald' : 'red'}
          badge={isOnline ? 'Connected' : 'Timeout >30s'}
        />
      </div>

      {/* 2. Latest Detection & Confidence Scores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Detection Card */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-base font-bold text-white tracking-tight">Latest Sound Event</h3>
            </div>
            {latestDetection && (
              <span className="text-xs text-slate-400 font-mono">
                {new Date(latestDetection.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          {latestDetection ? (
            <div className="space-y-5">
              {/* Category Showcase with Category Visual Treatment */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shrink-0"
                    style={{
                      backgroundColor: `${latestDetection.color || '#06b6d4'}20`,
                      border: `1.5px solid ${latestDetection.color || '#06b6d4'}50`,
                      color: latestDetection.color || '#06b6d4'
                    }}
                  >
                    <Volume2 size={26} />
                  </div>
                  <div>
                    <SoundBadge sound={latestDetection.sound} size="lg" showPriority={true} />
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Device: <span className="text-slate-200">{latestDetection.device_id}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">TinyML Confidence</span>
                  <span 
                    className="text-3xl font-extrabold font-mono tracking-tight"
                    style={{ color: latestDetection.color || '#06b6d4' }}
                  >
                    {latestDetection.confidence_pct || Math.round(latestDetection.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Status and Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-500 block text-[11px]">Timestamp</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {new Date(latestDetection.timestamp).toLocaleDateString()} {new Date(latestDetection.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-500 block text-[11px]">Classification Origin</span>
                  <span className="font-mono text-cyan-400 font-medium">
                    ESP32 Edge Impulse
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[11px]">User Status</span>
                  {latestDetection.acknowledged || acknowledgedIds?.includes(latestDetection.id) ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono">
                      <CheckCircle2 size={13} /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcknowledge && onAcknowledge(latestDetection.id)}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <AlertCircle size={13} /> Click to Ack
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Radio size={36} className="mx-auto text-slate-600 animate-pulse" />
              <p className="text-sm font-medium text-slate-400">Waiting for live sound detection from ESP32...</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No events received yet. When your ESP32 detects a sound, it will instantly appear here via Socket.IO.
              </p>
            </div>
          )}
        </div>

        {/* Sound Confidence Section */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white tracking-tight">Sound Confidence Metrics</h3>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                Min: {Math.round(minConfidence * 100)}%
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Real TinyML prediction confidence scores from actual received ESP32 detections:
            </p>

            <div className="space-y-2.5">
              {targetSounds.map((cat) => (
                <ConfidenceBar
                  key={cat}
                  sound={cat}
                  data={latestScores[cat]}
                  minThreshold={minConfidence}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Scores reflect only actual verified ESP32 inference results.
          </div>
        </div>
      </div>

      {/* 3. Recent Detection Activity Table */}
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Detection Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest 5–10 real-time events stored in local SQLite</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full">
            {recentDetections.length} recorded
          </span>
        </div>

        {recentDetections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Sound Category</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Device ID</th>
                  <th className="py-3 px-4 text-right">Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentDetections.slice(0, 10).map((event) => {
                  const isAck = event.acknowledged || acknowledgedIds?.includes(event.id);
                  return (
                    <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        #{event.id}
                        {event.is_test ? (
                          <span className="ml-1.5 text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">TEST</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <SoundBadge sound={event.sound} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold" style={{ color: event.color || '#06b6d4' }}>
                        {event.confidence_pct || Math.round(event.confidence * 100)}%
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {event.device_id}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAck ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 size={13} /> Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => onAcknowledge && onAcknowledge(event.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          >
                            <AlertCircle size={12} /> Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500 text-sm">
            No detection events have occurred yet.
          </div>
        )}
      </div>
    </div>
  );
}
