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
        bg: 'bg-threatcast-elevated',
        text: 'text-threatcast-red',
        border: 'border-threatcast-red',
        dot: 'bg-threatcast-amber',
        badge: 'bg-threatcast-elevated text-threatcast-red border-threatcast-red',
        glow: '',
      };
    case 'HIGH':
      return {
        bg: 'bg-threatcast-elevated',
        text: 'text-threatcast-cyan',
        border: 'border-threatcast-amber',
        dot: 'bg-threatcast-cyan',
        badge: 'bg-threatcast-elevated text-threatcast-cyan border-threatcast-amber',
        glow: '',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-threatcast-elevated',
        text: 'text-threatcast-silver',
        border: 'border-tc-border',
        dot: 'bg-threatcast-cyan',
        badge: 'bg-threatcast-elevated text-threatcast-silver border-tc-border',
        glow: '',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-threatcast-elevated',
        text: 'text-threatcast-green',
        border: 'border-tc-border',
        dot: 'bg-threatcast-green',
        badge: 'bg-threatcast-elevated text-threatcast-green border-tc-border',
        glow: '',
      };
  }
}

/**
 * Returns color classes for node types in network graphs.
 */
export function getNodeTypeStyle(type) {
  switch (type?.toLowerCase()) {
    case 'user':
      return { bg: 'var(--tc-cyan)', label: 'User Entity' };
    case 'endpoint':
      return { bg: 'var(--tc-muted)', label: 'Workstation' };
    case 'server':
      return { bg: 'var(--tc-cyan)', label: 'Domain Server' };
    case 'database':
      return { bg: 'var(--tc-cyan)', label: 'Database Cluster' };
    case 'gateway':
      return { bg: 'var(--tc-green)', label: 'Perimeter Gateway' };
    default:
      return { bg: 'var(--tc-muted)', label: 'Asset' };
  }
}
