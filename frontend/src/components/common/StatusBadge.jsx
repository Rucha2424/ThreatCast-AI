import React from 'react';
import { getThreatLevelColor } from '../../utils/formatters';

export default function StatusBadge({ status, size = 'sm', pulse = false }) {
  const colors = getThreatLevelColor(status);
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${colors.badge} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${pulse ? 'animate-ping' : ''}`} />
      <span>{status}</span>
    </span>
  );
}
