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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ebdcc7] bg-white hover:bg-[#f5efe6] text-[#544230] text-xs font-mono font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-[#b45309] ${spinning || loading ? 'animate-spin text-[#d97706]' : ''}`} />
      <span>Refresh</span>
    </button>
  );
}
