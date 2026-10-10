import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  const reduceMotion = useReducedMotion();

  const getStatusClasses = () => {
    switch (item.status) {
      case 'danger':
        return {
          border: 'border-threatcast-red',
          iconBg: 'bg-threatcast-elevated text-threatcast-amber',
          badge: 'text-threatcast-amber',
        };
      case 'warning':
        return {
          border: 'border-threatcast-amber',
          iconBg: 'bg-threatcast-elevated text-threatcast-cyan',
          badge: 'text-threatcast-cyan',
        };
      case 'safe':
        return {
          border: 'border-tc-border',
          iconBg: 'bg-threatcast-elevated text-threatcast-green',
          badge: 'text-threatcast-green',
        };
      default:
        return {
          border: 'border-tc-border',
          iconBg: 'bg-threatcast-elevated text-threatcast-cyan',
          badge: 'text-threatcast-cyan',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <motion.div
      className={`p-5 rounded-2xl bg-threatcast-card border ${statusStyle.border} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: reduceMotion ? 0 : 0.68, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.015 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
          <Icon className="w-5 h-5" />
        </div>
        {item.trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-threatcast-muted font-mono">
            {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-threatcast-amber" />}
            {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-threatcast-green" />}
            {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-threatcast-muted" />}
            <span>{item.trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-bold text-threatcast-muted uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl font-black tracking-tight text-threatcast-text mt-1">
          {item.value}
        </div>
        <p className="text-xs text-threatcast-silver mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </motion.div>
  );
}
