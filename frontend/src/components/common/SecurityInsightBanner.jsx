import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * SecurityInsightBanner — Grounded plain-English takeaways for charts, tables, and topology maps.
 */
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
      bg: 'bg-[#fffbeb]',
      border: 'border-[#fde68a]',
      iconBg: 'bg-[#fef3c7] text-[#b45309]',
      titleColor: 'text-[#92400e]',
      textColor: 'text-[#544230]',
      icon: Sparkles,
    },
    warning: {
      bg: 'bg-[#fff7ed]',
      border: 'border-[#fdba74]',
      iconBg: 'bg-[#ffedd5] text-[#c2410c]',
      titleColor: 'text-[#9a3412]',
      textColor: 'text-[#544230]',
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-[#fef2f2]',
      border: 'border-[#fca5a5]',
      iconBg: 'bg-[#fee2e2] text-[#dc2626]',
      titleColor: 'text-[#991b1b]',
      textColor: 'text-[#544230]',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-[#f7fee7]',
      border: 'border-[#d9f99d]',
      iconBg: 'bg-[#ecfccb] text-[#65a30d]',
      titleColor: 'text-[#3f6212]',
      textColor: 'text-[#544230]',
      icon: CheckCircle,
    },
  };

  const currentStyle = styles[type] || styles.info;
  const Icon = currentStyle.icon;

  return (
    <div className={`p-4 rounded-xl border ${currentStyle.bg} ${currentStyle.border} ${className} flex items-start gap-3 shadow-2xs`}>
      <div className={`w-7 h-7 rounded-lg ${currentStyle.iconBg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="space-y-1 text-xs leading-relaxed">
        <span className={`font-bold font-mono text-[11px] uppercase tracking-wider block ${currentStyle.titleColor}`}>
          {title}
        </span>
        <p className={`${currentStyle.textColor} font-medium`}>{insight}</p>
        {recommendation && (
          <p className="text-[11px] text-[#221207] pt-1 font-semibold border-t border-[#ebdcc7]/50 mt-1">
            <span className="text-[#b45309]">Recommended: </span>
            {recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
