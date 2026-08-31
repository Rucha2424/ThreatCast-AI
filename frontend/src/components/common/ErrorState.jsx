import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to connect to ThreatCast AI engine',
  message = 'Failed to fetch real-time intelligence data. Ensure the FastAPI backend is running.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[260px] bg-gradient-to-br from-orange-950/60 via-cyber-black to-cyber-brown-950 rounded-2xl border border-orange-700/60 text-center shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-orange-950 border border-orange-600 flex items-center justify-center text-orange-400 mb-3 shadow-[0_0_12px_rgba(249,115,22,0.4)]">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-cyber-beige-300 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-brown-700 to-amber-700 hover:from-cyber-brown-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-lg shadow-amber-950/50 border border-amber-500/40 font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
