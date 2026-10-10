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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-tc-border bg-threatcast-card hover:bg-threatcast-elevated text-threatcast-silver text-xs font-mono font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-threatcast-cyan ${spinning || loading ? 'animate-spin text-threatcast-cyan' : ''}`} />
      <span>Refresh</span>
    </button>
  );
}
