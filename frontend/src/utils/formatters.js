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
        bg: 'bg-[#ffedd5]',
        text: 'text-[#c2410c]',
        border: 'border-[#fdba74]',
        dot: 'bg-[#ea580c]',
        badge: 'bg-[#ffedd5] text-[#c2410c] border-[#fdba74]',
        glow: '',
      };
    case 'HIGH':
      return {
        bg: 'bg-[#fef3c7]',
        text: 'text-[#b45309]',
        border: 'border-[#fde68a]',
        dot: 'bg-[#d97706]',
        badge: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
        glow: '',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-[#f5efe6]',
        text: 'text-[#544230]',
        border: 'border-[#ded0bc]',
        dot: 'bg-[#b45309]',
        badge: 'bg-[#f5efe6] text-[#544230] border-[#ded0bc]',
        glow: '',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-[#f7fee7]',
        text: 'text-[#4d7c0f]',
        border: 'border-[#d9f99d]',
        dot: 'bg-[#65a30d]',
        badge: 'bg-[#f7fee7] text-[#4d7c0f] border-[#d9f99d]',
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
      return { bg: '#d97706', label: 'User Entity' };
    case 'endpoint':
      return { bg: '#a37a58', label: 'Workstation' };
    case 'server':
      return { bg: '#b45309', label: 'Domain Server' };
    case 'database':
      return { bg: '#78350f', label: 'Database Cluster' };
    case 'gateway':
      return { bg: '#65a30d', label: 'Perimeter Gateway' };
    default:
      return { bg: '#7a644c', label: 'Asset' };
  }
}
