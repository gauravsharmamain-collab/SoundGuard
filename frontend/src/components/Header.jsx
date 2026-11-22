import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  Menu, 
  ShieldAlert, 
  Wifi, 
  WifiOff,
  BellRing
} from 'lucide-react';

export default function Header({
  title,
  subtitle,
  isDeviceOnline,
  isSocketConnected,
  soundAlertsEnabled,
  onToggleSound,
  unacknowledgedCount = 0,
  onOpenMobileMenu,
  onQuickSimulate
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Assistive & Connectivity Badges */}
        <div className="flex items-center gap-3">
          {/* Quick Simulate Button for Testing */}
          {onQuickSimulate && (
            <button
              onClick={onQuickSimulate}
              title="Trigger a simulated test detection event to verify visual and tactile alerts"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <Radio size={14} className="animate-pulse text-cyan-400" />
              <span>Test Alert</span>
            </button>
          )}

          {/* Sound Notification Chime Toggle */}
          <button
            onClick={onToggleSound}
            title={soundAlertsEnabled ? 'Sound alert chime enabled (click to mute)' : 'Sound alert chime muted (click to enable)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              soundAlertsEnabled
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-600'
                : 'bg-red-950/40 text-red-300 border-red-800/60'
            }`}
          >
            {soundAlertsEnabled ? (
              <>
                <Volume2 size={15} className="text-cyan-400" />
                <span className="hidden sm:inline">Sound Chime On</span>
              </>
            ) : (
              <>
                <VolumeX size={15} className="text-red-400" />
                <span className="hidden sm:inline">Sound Chime Muted</span>
              </>
            )}
          </button>

          {/* Unacknowledged Alerts Pill */}
          {unacknowledgedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse">
              <BellRing size={14} className="text-red-400" />
              <span>{unacknowledgedCount} Alert{unacknowledgedCount > 1 ? 's' : ''} Active</span>
            </div>
          )}

          {/* Device Heartbeat Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            {isDeviceOnline ? (
              <>
                <Wifi size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">ESP32 Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-slate-400" />
                <span className="text-slate-400 font-medium">ESP32 Offline (&gt;30s)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
