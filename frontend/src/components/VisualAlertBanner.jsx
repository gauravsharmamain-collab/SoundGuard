import React from 'react';
import { CheckCircle2, AlertTriangle, Radio, Clock, ShieldAlert } from 'lucide-react';
import { SOUND_CONFIG } from './SoundBadge';

export default function VisualAlertBanner({ alert, onAcknowledge, isAcknowledging = false }) {
  if (!alert) return null;

  const config = SOUND_CONFIG[alert.sound] || {
    label: alert.sound || 'Sound Event',
    icon: AlertTriangle,
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500',
    glowColor: 'glow-cyan',
    priority: 'Alert',
    hex: '#06b6d4'
  };

  const IconComponent = config.icon;
  const isCritical = alert.sound === 'alarm_bell';
  const isHigh = alert.sound === 'crying_baby';

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
      isCritical 
        ? 'border-red-500 bg-red-950/40 glow-red alert-strobe' 
        : isHigh 
          ? 'border-amber-500 bg-amber-950/40 glow-amber' 
          : 'border-cyan-500 bg-cyan-950/40 glow-cyan'
    }`}>
      {/* Top High-Priority Visual Indicator Strip */}
      <div 
        className="h-1.5 w-full" 
        style={{ backgroundColor: config.hex }} 
      />

      <div className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start md:items-center gap-4">
          {/* Large Assistive Visual Icon Box */}
          <div 
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ 
              backgroundColor: `${config.hex}25`,
              border: `1.5px solid ${config.hex}60`,
              color: config.hex
            }}
          >
            <IconComponent size={32} className="animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border bg-black/40 text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.hex }} />
                LIVE SOUND DETECTED
              </span>
              <span 
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${config.hex}25`, color: config.hex }}
              >
                {config.priority}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {config.label}
              <span className="text-base font-normal text-slate-300 font-mono">
                ({alert.confidence_pct || Math.round(alert.confidence * 100)}% match)
              </span>
            </h3>

            <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap font-mono">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Radio size={13} className="text-slate-400" />
                Device: {alert.device_id || 'soundguard_01'}
              </span>
              {alert.is_test ? (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                  TEST EVENT
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="w-full md:w-auto flex items-center justify-end">
          {alert.acknowledged ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-sm font-medium">
              <CheckCircle2 size={18} />
              <span>Acknowledged</span>
            </div>
          ) : (
            <button
              onClick={() => onAcknowledge && onAcknowledge(alert.id)}
              disabled={isAcknowledging}
              className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide text-slate-950 transition-all duration-200 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: config.hex,
                boxShadow: `0 0 25px ${config.hex}50`
              }}
            >
              <CheckCircle2 size={18} />
              <span>{isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
