import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function EmptyState({
  title = 'No active security incidents',
  message = 'All monitored network telemetry conforms to baseline parameters.',
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-soc-slate-200 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-soc-secure mb-3">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-soc-slate-900">{title}</h3>
      <p className="text-sm text-soc-slate-500 max-w-sm mt-1">{message}</p>
    </div>
  );
}
