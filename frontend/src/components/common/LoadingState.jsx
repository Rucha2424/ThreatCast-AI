import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading neural network intelligence...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[260px] bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 rounded-2xl border border-cyber-brown-800 text-center shadow-xl">
      <Loader2 className="w-9 h-9 text-amber-500 animate-spin mb-3 shadow-[0_0_12px_#f59e0b]" />
      <p className="text-sm font-bold text-white font-mono">{message}</p>
      <p className="text-xs text-cyber-beige-400 mt-1 font-mono">Synchronizing with ThreatCast AI FastRP graph engine</p>
    </div>
  );
}
