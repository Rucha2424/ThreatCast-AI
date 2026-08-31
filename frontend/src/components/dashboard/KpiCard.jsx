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
          border: 'border-red-200 hover:border-red-300',
          iconBg: 'bg-red-50 text-soc-threat',
          badge: 'text-soc-threat',
        };
      case 'warning':
        return {
          border: 'border-amber-200 hover:border-amber-300',
          iconBg: 'bg-amber-50 text-amber-600',
          badge: 'text-amber-600',
        };
      case 'safe':
        return {
          border: 'border-emerald-200 hover:border-emerald-300',
          iconBg: 'bg-emerald-50 text-soc-secure',
          badge: 'text-soc-secure',
        };
      default:
        return {
          border: 'border-soc-slate-200 hover:border-soc-slate-300',
          iconBg: 'bg-indigo-50 text-soc-ai',
          badge: 'text-soc-ai',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <div
      className={`p-5 rounded-2xl bg-white border ${statusStyle.border} shadow-soc-card hover:shadow-soc-card-hover transition-all flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${statusStyle.iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {item.trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-soc-slate-500 font-mono">
            {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-soc-threat" />}
            {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-soc-secure" />}
            {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-soc-slate-400" />}
            <span>{item.trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-semibold text-soc-slate-500 uppercase tracking-wider block">
          {item.label}
        </span>
        <div className="text-xl font-bold tracking-tight text-soc-slate-900 mt-1">
          {item.value}
        </div>
        <p className="text-xs text-soc-slate-500 mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </div>
  );
}
