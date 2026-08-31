import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to connect to ThreatCast AI engine',
  message = 'Failed to fetch real-time intelligence data. Ensure the FastAPI backend is running.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[260px] bg-red-50/50 rounded-xl border border-red-200 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-soc-threat mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-soc-slate-900">{title}</h3>
      <p className="text-sm text-soc-slate-600 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-soc-navy-900 hover:bg-soc-navy-800 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
