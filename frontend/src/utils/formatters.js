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
        bg: 'bg-orange-950/80',
        text: 'text-orange-300',
        border: 'border-orange-700/60',
        dot: 'bg-orange-500 shadow-[0_0_8px_#f97316]',
        badge: 'bg-orange-950/90 text-orange-300 border-orange-600/60 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]',
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
        bg: 'bg-cyber-brown-900/80',
        text: 'text-cyber-beige-200',
        border: 'border-cyber-brown-700/60',
        dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        badge: 'bg-cyber-brown-900/90 text-cyber-beige-200 border-cyber-brown-700/60',
        glow: '',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-lime-950/80',
        text: 'text-lime-300',
        border: 'border-lime-700/60',
        dot: 'bg-lime-400 shadow-[0_0_8px_#84cc16]',
        badge: 'bg-lime-950/90 text-lime-300 border-lime-600/60 shadow-[0_0_10px_rgba(132,204,22,0.3)]',
        glow: 'shadow-[0_0_15px_rgba(132,204,22,0.4)]',
      };
  }
}

/**
 * Returns color classes for node types in network graphs.
 */
export function getNodeTypeStyle(type) {
  switch (type?.toLowerCase()) {
    case 'user':
      return { bg: '#d97706', label: 'User Entity' };
    case 'endpoint':
      return { bg: '#cbab83', label: 'Workstation' };
    case 'server':
      return { bg: '#f59e0b', label: 'Domain Server' };
    case 'database':
      return { bg: '#b45309', label: 'Database Cluster' };
    case 'gateway':
      return { bg: '#84cc16', label: 'Perimeter Gateway' };
    default:
      return { bg: '#ddc4a5', label: 'Asset' };
  }
}
