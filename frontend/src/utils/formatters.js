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
        bg: 'bg-red-50',
        text: 'text-soc-threat-dark',
        border: 'border-red-200',
        dot: 'bg-soc-threat',
        badge: 'bg-red-100 text-red-800 border-red-200',
        glow: 'glow-threat',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        glow: 'glow-warning',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        glow: '',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-soc-secure',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        glow: 'glow-secure',
      };
  }
}

/**
 * Returns color classes for node types in network graphs.
 */
export function getNodeTypeStyle(type) {
  switch (type?.toLowerCase()) {
    case 'user':
      return { bg: '#6366F1', label: 'User Entity' };
    case 'endpoint':
      return { bg: '#0EA5E9', label: 'Workstation' };
    case 'server':
      return { bg: '#8B5CF6', label: 'Domain Server' };
    case 'database':
      return { bg: '#F59E0B', label: 'Database Cluster' };
    case 'gateway':
      return { bg: '#10B981', label: 'Perimeter Gateway' };
    default:
      return { bg: '#64748B', label: 'Asset' };
  }
}
