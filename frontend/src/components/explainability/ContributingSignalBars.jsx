import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ContributingSignalBars({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-soc-slate-900">
            Contributing Telemetry Signals & Feature Attribution
          </h3>
          <p className="text-xs text-soc-slate-500 mt-0.5">
            Weights assigned by the temporal graph model to individual observed telemetry patterns.
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-soc-ai border border-indigo-200">
          Feature Attribution
        </span>
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-soc-slate-50 border border-soc-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-soc-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-soc-ai" />
                {sig.signal_name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-soc-slate-500">{sig.metric_value}</span>
                <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-soc-slate-200">
                  Weight: {formatConfidence(sig.weight)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-soc-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${sig.weight * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-soc-slate-500 font-mono pt-1">
              <strong>Source Evidence:</strong> {sig.source_evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
