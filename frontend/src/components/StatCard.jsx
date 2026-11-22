import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'cyan', badge }) {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    red: {
      border: 'border-red-500/20 hover:border-red-500/40',
      iconBg: 'bg-red-500/10 text-red-400',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20'
    }
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900/80 p-5 border ${scheme.border} shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
            {badge && (
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${scheme.badge}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ${scheme.iconBg}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
