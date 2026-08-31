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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-soc-slate-200 bg-white hover:bg-soc-slate-50 text-soc-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-soc-slate-500 ${spinning || loading ? 'animate-spin text-soc-ai' : ''}`} />
      <span>Refresh</span>
    </button>
  );
}
