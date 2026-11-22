import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Award, Activity, AlertCircle } from 'lucide-react';
import { SOUND_CONFIG } from '../components/SoundBadge';
import StatCard from '../components/StatCard';

const CATEGORY_COLORS = {
  door_knock: '#06b6d4',
  clapping: '#3b82f6',
  crying_baby: '#f59e0b',
  alarm_bell: '#ef4444'
};

export default function SoundAnalyticsPage({ stats }) {
  const total = stats?.total_detections || 0;
  const counts = stats?.category_counts || { door_knock: 0, clapping: 0, crying_baby: 0, alarm_bell: 0 };
  const avgConfByCat = stats?.average_confidence_by_category || {};
  const timeline = stats?.timeline || [];
  const mostCommon = stats?.most_common_sound;

  // Prepare bar data
  const categoryBarData = [
    { name: 'Door Knock', count: counts.door_knock || 0, color: CATEGORY_COLORS.door_knock, avgConf: avgConfByCat.door_knock || 0 },
    { name: 'Clapping', count: counts.clapping || 0, color: CATEGORY_COLORS.clapping, avgConf: avgConfByCat.clapping || 0 },
    { name: 'Crying Baby', count: counts.crying_baby || 0, color: CATEGORY_COLORS.crying_baby, avgConf: avgConfByCat.crying_baby || 0 },
    { name: 'Bell / Alarm', count: counts.alarm_bell || 0, color: CATEGORY_COLORS.alarm_bell, avgConf: avgConfByCat.alarm_bell || 0 },
  ];

  // Prepare pie data
  const pieData = categoryBarData.filter(d => d.count > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 shadow-xl text-xs font-mono">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color || entry.fill }}>
              {entry.name}: <span className="font-semibold text-slate-100">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (total === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">No Analytics Data Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            SoundGuard generates charts from genuine classification events recorded in the SQLite database. Once your ESP32 detects sounds or you simulate events, analytics will render automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Events Analyzed"
          value={total}
          subtitle="Genuine database records"
          icon={Activity}
          color="cyan"
        />

        <StatCard
          title="Most Detected Category"
          value={mostCommon ? mostCommon.name : 'N/A'}
          subtitle={mostCommon ? `${mostCommon.count} occurrences` : 'No data'}
          icon={Award}
          color="amber"
          badge={mostCommon ? 'Top Frequency' : undefined}
        />

        <StatCard
          title="Average Overall Confidence"
          value={`${stats?.average_confidence || 0}%`}
          subtitle="TinyML inference mean"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Grid: Bar Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detection Count by Category */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Detection Count by Sound Category</h3>
              <p className="text-xs text-slate-400">Absolute event frequency stored in database</p>
            </div>
            <BarChart3 size={18} className="text-cyan-400" />
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Detections" radius={[8, 8, 0, 0]}>
                  {categoryBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proportion of Sounds (Pie) */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Category Distribution</h3>
              <p className="text-xs text-slate-400">Relative proportion of sound events</p>
            </div>
            <PieIcon size={18} className="text-cyan-400" />
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-300 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No events to chart</p>
            )}
          </div>
        </div>
      </div>

      {/* Detections Over Time (Area Chart) */}
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Detections Over Time</h3>
            <p className="text-xs text-slate-400">Daily event volume over the past 7 days</p>
          </div>
          <TrendingUp size={18} className="text-cyan-400" />
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Total Events" 
                stroke="#06b6d4" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#totalColor)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Confidence by Category */}
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Average Model Confidence by Category</h3>
            <p className="text-xs text-slate-400">Edge Impulse TinyML mean confidence score</p>
          </div>
          <Award size={18} className="text-cyan-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {categoryBarData.map((item) => (
            <div key={item.name} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">{item.name}</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-white" style={{ color: item.color }}>
                  {item.avgConf > 0 ? `${item.avgConf}%` : 'N/A'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {item.count} samples
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.avgConf}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
