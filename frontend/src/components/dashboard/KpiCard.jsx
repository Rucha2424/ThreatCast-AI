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
          border: 'border-[#fdba74]',
          iconBg: 'bg-[#ffedd5] text-[#ea580c]',
          badge: 'text-[#ea580c]',
        };
      case 'warning':
        return {
          border: 'border-[#fde68a]',
          iconBg: 'bg-[#fef3c7] text-[#d97706]',
          badge: 'text-[#d97706]',
        };
      case 'safe':
        return {
          border: 'border-[#d9f99d]',
          iconBg: 'bg-[#f7fee7] text-[#65a30d]',
          badge: 'text-[#65a30d]',
        };
      default:
        return {
          border: 'border-[#ebdcc7]',
          iconBg: 'bg-[#fef3c7] text-[#b45309]',
          badge: 'text-[#b45309]',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <div
      className={`p-5 rounded-2xl bg-white border ${statusStyle.border} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
          <Icon className="w-5 h-5" />
        </div>
        {item.trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#7a644c] font-mono">
            {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#ea580c]" />}
            {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#65a30d]" />}
            {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-[#998165]" />}
            <span>{item.trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-bold text-[#7a644c] uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl font-black tracking-tight text-[#221207] mt-1">
          {item.value}
        </div>
        <p className="text-xs text-[#544230] mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </div>
  );
}
