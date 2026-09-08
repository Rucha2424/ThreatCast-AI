import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function SecurityInsightBanner({
  title = 'Key Security Insight',
  insight,
  recommendation,
  type = 'info', // 'info' | 'warning' | 'critical' | 'success'
  className = '',
}) {
  if (!insight) return null;

  const styles = {
    info: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      iconBg: 'bg-sky-500/15 text-sky-400',
      titleColor: 'text-sky-400',
      textColor: 'text-slate-300',
      icon: Sparkles,
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/15 text-amber-400',
      titleColor: 'text-amber-400',
      textColor: 'text-slate-300',
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      iconBg: 'bg-rose-500/15 text-rose-400',
      titleColor: 'text-rose-400',
      textColor: 'text-slate-300',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      titleColor: 'text-emerald-400',
      textColor: 'text-slate-300',
      icon: CheckCircle,
    },
  };

  const currentStyle = styles[type] || styles.info;
  const Icon = currentStyle.icon;

  return (
    <div className={`p-4 rounded-xl border ${currentStyle.border} ${currentStyle.bg} flex items-start gap-3 shadow-sm ${className}`}>
      <div className={`w-7 h-7 rounded-lg ${currentStyle.iconBg} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="space-y-1 text-xs leading-relaxed">
        <span className={`font-bold font-mono text-[11px] uppercase tracking-wider block ${currentStyle.titleColor}`}>
          {title}
        </span>
        <p className={`${currentStyle.textColor} font-medium`}>{insight}</p>
        {recommendation && (
          <p className="text-[11px] text-slate-200 pt-1 font-semibold border-t border-slate-800/80 mt-1">
            <span className="text-sky-400">Recommended: </span>
            {recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
