import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ContributingSignalBars({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Contributing Telemetry Signals & Feature Attribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Weights assigned by the temporal graph model to individual observed telemetry patterns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Feature Attribution
        </span>
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-cyber-card border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                {sig.signal_name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">{sig.metric_value}</span>
                <span className="font-bold text-sky-300 bg-sky-500/15 px-2.5 py-0.5 rounded border border-sky-500/30">
                  Weight: {formatConfidence(sig.weight)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${sig.weight * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 font-mono pt-1">
              <strong className="text-slate-300">Source Evidence:</strong> {sig.source_evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
