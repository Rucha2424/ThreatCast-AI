import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ContributingSignalBars({ signals = [] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-threatcast-text tracking-tight">
            Contributing Telemetry Signals & Feature Attribution
          </h3>
          <p className="text-xs text-threatcast-muted mt-0.5">
            Weights assigned by the temporal graph model to individual observed telemetry patterns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber font-bold">
          Feature Attribution
        </span>
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-threatcast-card border border-tc-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-threatcast-text flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-threatcast-cyan" />
                {sig.signal_name}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-threatcast-muted">{sig.metric_value}</span>
                <span className="font-bold text-threatcast-cyan bg-threatcast-elevated px-2.5 py-0.5 rounded border border-threatcast-amber">
                  Weight: {formatConfidence(sig.weight)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-threatcast-elevated overflow-hidden border border-tc-border">
              <div
                className="h-full bg-threatcast-cyan rounded-full transition-all duration-500"
                style={{ width: `${sig.weight * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-threatcast-muted font-mono pt-1">
              <strong className="text-threatcast-silver">Source Evidence:</strong> {sig.source_evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
