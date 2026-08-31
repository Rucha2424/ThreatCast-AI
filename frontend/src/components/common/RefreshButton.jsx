import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function RefreshButton({ onRefresh, loading = false }) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    setSpinning(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || spinning}
      title="Refresh Real-time Telemetry"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyber-brown-700 bg-cyber-brown-950/80 hover:bg-cyber-brown-900 text-cyber-beige-200 text-xs font-mono font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${spinning || loading ? 'animate-spin text-amber-300' : ''}`} />
      <span>Refresh</span>
    </button>
  );
}
