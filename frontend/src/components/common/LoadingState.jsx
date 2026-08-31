import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading network intelligence...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[260px] bg-white rounded-xl border border-soc-slate-200 text-center">
      <Loader2 className="w-8 h-8 text-soc-ai animate-spin mb-3" />
      <p className="text-sm font-medium text-soc-slate-600">{message}</p>
      <p className="text-xs text-soc-slate-400 mt-1">Connecting to ThreatCast AI forecasting engine</p>
    </div>
  );
}
