import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading neural network intelligence...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[260px] bg-white rounded-2xl border border-[#ebdcc7] text-center shadow-xs">
      <Loader2 className="w-9 h-9 text-[#d97706] animate-spin mb-3" />
      <p className="text-sm font-bold text-[#221207] font-mono">{message}</p>
      <p className="text-xs text-[#7a644c] mt-1 font-mono">Synchronizing with ThreatCast AI FastRP graph engine</p>
    </div>
  );
}
