import React from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Server,
  Sparkles,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

const ICON_LOOKUP = {
  'kpi-threats': ShieldAlert,
  'kpi-forecast': TrendingUp,
  'kpi-nodes': Server,
  'kpi-confidence': Sparkles,
  'kpi-disagreement': GitCompare,
};

export default function KpiCard({ item }) {
  if (!item) return null;

  const Icon = ICON_LOOKUP[item.id] || ShieldAlert;

  const getStatusClasses = () => {
    switch (item.status) {
      case 'danger':
        return {
          border: 'border-rose-800/80 hover:border-rose-500/80',
          iconBg: 'bg-rose-950/80 text-rose-400 border border-rose-600/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
          badge: 'text-rose-400',
        };
      case 'warning':
        return {
          border: 'border-amber-800/80 hover:border-amber-500/80',
          iconBg: 'bg-amber-950/80 text-amber-400 border border-amber-600/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
          badge: 'text-amber-400',
        };
      case 'safe':
        return {
          border: 'border-emerald-800/80 hover:border-emerald-500/80',
          iconBg: 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
          badge: 'text-emerald-400',
        };
      default:
        return {
          border: 'border-cyber-maroon-800 hover:border-cyber-maroon-600',
          iconBg: 'bg-cyber-maroon-950 text-rose-400 border border-cyber-maroon-700 shadow-[0_0_12px_rgba(225,29,72,0.2)]',
          badge: 'text-rose-400',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br from-cyber-maroon-950/90 via-cyber-black/95 to-cyber-burgundy-950/80 border ${statusStyle.border} shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between backdrop-blur-md group`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        {item.trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-cyber-grey-300 font-mono">
            {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />}
            {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />}
            {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-cyber-grey-400" />}
            <span>{item.trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-bold text-cyber-grey-400 uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl font-black tracking-tight text-white mt-1">
          {item.value}
        </div>
        <p className="text-xs text-cyber-grey-300 mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </div>
  );
}
