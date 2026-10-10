import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  message = 'Loading ThreatCast intelligence...',
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[260px] bg-threatcast-card rounded-2xl border border-tc-border text-center shadow-xs">
      <Loader2 className="w-9 h-9 text-threatcast-cyan animate-spin mb-3" />

      <p className="text-sm font-bold text-threatcast-text font-mono">
        {message}
      </p>

      <p className="text-xs text-threatcast-muted mt-1 font-mono">
        Synchronizing with the ThreatCast API
      </p>
    </div>
  );
}