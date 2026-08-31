import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to connect to ThreatCast AI engine',
  message = 'Failed to fetch real-time intelligence data. Ensure the FastAPI backend is running.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[260px] bg-white rounded-2xl border border-[#fdba74] text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-[#ffedd5] border border-[#fdba74] flex items-center justify-center text-[#ea580c] mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[#221207]">{title}</h3>
      <p className="text-sm text-[#544230] max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition-all shadow-xs border border-[#b45309] font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
