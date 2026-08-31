/**
 * Formats a confidence float (0.0 - 1.0) into a clean percentage string.
 */
export function formatConfidence(val) {
  if (val === undefined || val === null) return '0%';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return `${Math.round(num * 100)}%`;
}

/**
 * Returns Tailwind class names for a given threat level string.
 */
export function getThreatLevelColor(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return {
        bg: 'bg-rose-950/80',
        text: 'text-rose-300',
        border: 'border-rose-700/60',
        dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
        badge: 'bg-rose-950/90 text-rose-300 border-rose-600/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-950/80',
        text: 'text-amber-300',
        border: 'border-amber-700/60',
        dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
        badge: 'bg-amber-950/90 text-amber-300 border-amber-600/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-blue-950/80',
        text: 'text-blue-300',
        border: 'border-blue-700/60',
        dot: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]',
        badge: 'bg-blue-950/90 text-blue-300 border-blue-600/60',
        glow: '',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-950/80',
        text: 'text-emerald-300',
        border: 'border-emerald-700/60',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      };
  }
}

/**
 * Returns color classes for node types in network graphs.
 */
export function getNodeTypeStyle(type) {
  switch (type?.toLowerCase()) {
    case 'user':
      return { bg: '#c026d3', label: 'User Entity' };
    case 'endpoint':
      return { bg: '#38bdf8', label: 'Workstation' };
    case 'server':
      return { bg: '#f43f5e', label: 'Domain Server' };
    case 'database':
      return { bg: '#f59e0b', label: 'Database Cluster' };
    case 'gateway':
      return { bg: '#10b981', label: 'Perimeter Gateway' };
    default:
      return { bg: '#94a3b8', label: 'Asset' };
  }
}
