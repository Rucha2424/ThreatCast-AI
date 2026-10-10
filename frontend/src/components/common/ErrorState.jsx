import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to connect to ThreatCast AI engine',
  message = 'Failed to fetch real-time intelligence data. Ensure the FastAPI backend is running.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[260px] bg-threatcast-card rounded-2xl border border-threatcast-red text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-threatcast-elevated border border-threatcast-red flex items-center justify-center text-threatcast-amber mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-threatcast-text">{title}</h3>
      <p className="text-sm text-threatcast-silver max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-threatcast-cyan hover:bg-threatcast-cyan text-white text-xs font-bold transition-all shadow-xs border border-threatcast-cyan font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
