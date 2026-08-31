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
          border: 'border-orange-800/80 hover:border-orange-500/80',
          iconBg: 'bg-orange-950/80 text-orange-400 border border-orange-600/40 shadow-[0_0_12px_rgba(249,115,22,0.25)]',
          badge: 'text-orange-400',
        };
      case 'warning':
        return {
          border: 'border-amber-800/80 hover:border-amber-500/80',
          iconBg: 'bg-amber-950/80 text-amber-400 border border-amber-600/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
          badge: 'text-amber-400',
        };
      case 'safe':
        return {
          border: 'border-lime-800/80 hover:border-lime-500/80',
          iconBg: 'bg-lime-950/80 text-lime-400 border border-lime-600/40 shadow-[0_0_12px_rgba(132,204,22,0.25)]',
          badge: 'text-lime-400',
        };
      default:
        return {
          border: 'border-cyber-brown-800 hover:border-amber-600',
          iconBg: 'bg-cyber-brown-950 text-amber-400 border border-cyber-brown-700 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
          badge: 'text-amber-400',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br from-cyber-brown-950/95 via-cyber-black to-cyber-amber-950/80 border ${statusStyle.border} shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between backdrop-blur-md group`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        {item.trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-cyber-beige-300 font-mono">
            {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />}
            {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-lime-400" />}
            {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-cyber-beige-400" />}
            <span>{item.trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-bold text-cyber-beige-400 uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl font-black tracking-tight text-white mt-1">
          {item.value}
        </div>
        <p className="text-xs text-cyber-beige-300 mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </div>
  );
}
