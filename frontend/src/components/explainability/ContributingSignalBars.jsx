import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ContributingSignalBars({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#221207] tracking-tight">
            Contributing Telemetry Signals & Feature Attribution
          </h3>
          <p className="text-xs text-[#7a644c] mt-0.5">
            Weights assigned by the temporal graph model to individual observed telemetry patterns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          Feature Attribution
        </span>
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-[#221207] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                {sig.signal_name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-[#7a644c]">{sig.metric_value}</span>
                <span className="font-bold text-[#b45309] bg-[#fffbeb] px-2.5 py-0.5 rounded border border-[#fde68a]">
                  Weight: {formatConfidence(sig.weight)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#f5efe6] overflow-hidden border border-[#ded0bc]">
              <div
                className="h-full bg-[#d97706] rounded-full transition-all duration-500"
                style={{ width: `${sig.weight * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-[#7a644c] font-mono pt-1">
              <strong className="text-[#544230]">Source Evidence:</strong> {sig.source_evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
