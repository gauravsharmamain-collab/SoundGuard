import React from 'react';
import { SOUND_CONFIG } from './SoundBadge';

export default function ConfidenceBar({ sound, data, minThreshold = 0.70 }) {
  const config = SOUND_CONFIG[sound] || {
    label: sound,
    hex: '#06b6d4'
  };

  const hasScore = data && data.confidence !== null && data.confidence !== undefined;
  const pct = hasScore ? Math.round(data.confidence * 100) : 0;
  const meetsThreshold = hasScore && data.confidence >= minThreshold;

  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full inline-block" 
            style={{ backgroundColor: config.hex }}
          />
          <span className="font-medium text-slate-200">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasScore ? (
            <>
              <span className="text-[11px] text-slate-400">
                {meetsThreshold ? 'Verified' : 'Low Conf'}
              </span>
              <span className="font-semibold text-slate-100 font-mono text-xs">
                {pct}%
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-500 italic">No event recorded</span>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 relative">
        {/* Min threshold indicator mark */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-slate-500/40 z-10" 
          style={{ left: `${minThreshold * 100}%` }}
          title={`Minimum threshold: ${Math.round(minThreshold * 100)}%`}
        />

        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: hasScore ? `${pct}%` : '0%',
            backgroundColor: config.hex,
            opacity: meetsThreshold ? 1 : 0.6
          }}
        />
      </div>

      {hasScore && data.timestamp && (
        <div className="text-[10px] text-slate-500 text-right">
          Last recorded: {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
    </div>
  );
}
