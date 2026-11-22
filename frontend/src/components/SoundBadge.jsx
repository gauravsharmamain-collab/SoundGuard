import React from 'react';
import { DoorClosed, Hand, Baby, BellRing, Volume2 } from 'lucide-react';

export const SOUND_CONFIG = {
  door_knock: {
    label: 'Door Knock',
    icon: DoorClosed,
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'glow-cyan',
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    priority: 'Medium Priority',
    priorityBadge: 'bg-cyan-500/20 text-cyan-300',
    hex: '#06b6d4'
  },
  clapping: {
    label: 'Clapping',
    icon: Hand,
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'glow-blue',
    badge: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    priority: 'Low Priority',
    priorityBadge: 'bg-blue-500/20 text-blue-300',
    hex: '#3b82f6'
  },
  crying_baby: {
    label: 'Crying Baby',
    icon: Baby,
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'glow-amber',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    priority: 'High Priority',
    priorityBadge: 'bg-amber-500/20 text-amber-300',
    hex: '#f59e0b'
  },
  alarm_bell: {
    label: 'Bell / Alarm',
    icon: BellRing,
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/40',
    glowColor: 'glow-red',
    badge: 'bg-red-950/80 text-red-300 border-red-500/50',
    priority: 'Critical Alert',
    priorityBadge: 'bg-red-500/25 text-red-200 border border-red-500/40 animate-pulse',
    hex: '#ef4444'
  }
};

export default function SoundBadge({ sound, showIcon = true, showPriority = false, size = 'md' }) {
  const config = SOUND_CONFIG[sound] || {
    label: sound || 'Unknown Sound',
    icon: Volume2,
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-800',
    borderColor: 'border-slate-700',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    priority: 'Standard',
    priorityBadge: 'bg-slate-700 text-slate-300',
    hex: '#94a3b8'
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5'
  }[size] || 'text-xs px-2.5 py-1 gap-2';

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18
  }[size] || 14;

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.badge} ${sizeClasses}`}>
      {showIcon && <IconComponent size={iconSizes} className="shrink-0" />}
      <span>{config.label}</span>
      {showPriority && (
        <span className={`ml-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded ${config.priorityBadge}`}>
          {config.priority}
        </span>
      )}
    </span>
  );
}
