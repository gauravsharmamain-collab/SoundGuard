import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  History, 
  BarChart3, 
  Cpu, 
  Settings, 
  ShieldCheck, 
  Wifi, 
  WifiOff,
  Bell
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live', label: 'Live Detection', icon: Radio, badge: 'Live' },
  { id: 'history', label: 'Detection History', icon: History },
  { id: 'analytics', label: 'Sound Analytics', icon: BarChart3 },
  { id: 'device', label: 'Device Status', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  isDeviceOnline, 
  isSocketConnected, 
  unacknowledgedCount = 0 
}) {
  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              SoundGuard
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                IoT
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Assistive Sound Alert</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </div>

              {item.id === 'live' && unacknowledgedCount > 0 ? (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-red-500 text-white animate-pulse">
                  {unacknowledgedCount}
                </span>
              ) : item.badge ? (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-cyan-500/25 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* IoT Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">ESP32 Device</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                isDeviceOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`} />
              <span className={`text-xs font-semibold font-mono ${
                isDeviceOnline ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isDeviceOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-[11px] font-medium text-slate-400">Live Socket</span>
            <div className="flex items-center gap-1.5">
              {isSocketConnected ? (
                <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Synced
                </span>
              ) : (
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Connecting
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-center text-slate-400">
          SoundGuard Assistive v1.0.0
        </p>
      </div>
    </aside>
  );
}
