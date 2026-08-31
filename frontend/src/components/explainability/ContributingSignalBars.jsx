import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ContributingSignalBars({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 shadow-2xl space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Contributing Telemetry Signals & Feature Attribution
          </h3>
          <p className="text-xs text-cyber-grey-400 mt-0.5">
            Weights assigned by the temporal graph model to individual observed telemetry patterns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
          Feature Attribution
        </span>
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
                {sig.signal_name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-cyber-grey-400">{sig.metric_value}</span>
                <span className="font-bold text-rose-300 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-700">
                  Weight: {formatConfidence(sig.weight)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-cyber-maroon-950 overflow-hidden border border-cyber-maroon-900">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-rose-600 to-fuchsia-600 rounded-full transition-all duration-500 shadow-[0_0_8px_#f43f5e]"
                style={{ width: `${sig.weight * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-cyber-grey-400 font-mono pt-1">
              <strong className="text-cyber-grey-300">Source Evidence:</strong> {sig.source_evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
