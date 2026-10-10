import React from 'react';
import {
  GitCompare,
  Info,
  Shield,
} from 'lucide-react';
import { buildUploadedRuleComparison, usePcapAnalysis } from '../../context/PcapAnalysisContext';


export default function ModelRuleComparisonCard() {
  const { analysis, fileName } = usePcapAnalysis();
  const comparison = buildUploadedRuleComparison(analysis);
  const connected = Boolean(comparison);

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs flex flex-col justify-between space-y-5">

      <div className="flex items-center gap-2.5">

        <div className="w-9 h-9 rounded-xl bg-threatcast-elevated border border-threatcast-amber flex items-center justify-center text-threatcast-cyan">
          <GitCompare className="w-4 h-4" />
        </div>

        <div>

          <h3 className="text-sm font-bold text-threatcast-text flex items-center gap-2">
            Model vs Rule Verification
          </h3>

          <p className="text-xs text-threatcast-silver">
            {connected
              ? `Deterministic rules evaluated for ${fileName}.`
              : 'Upload a CSV or PCAP from the header to connect deterministic rules to the CTU13 inference pipeline.'}
          </p>

        </div>

      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="p-4 rounded-xl bg-threatcast-elevated border border-threatcast-amber space-y-2">

          <div className="flex items-center gap-1.5">

            <span className="text-[11px] font-bold text-threatcast-cyan uppercase tracking-wider font-mono">
              ML Model
            </span>

          </div>

          <div>

            <span className="text-sm font-bold text-threatcast-text block">
              CTU13 LSTM
            </span>

            <span className="text-[11px] text-threatcast-muted font-mono block mt-0.5">
              5 × 30-second states • 12 features
            </span>

          </div>

        </div>


        <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border space-y-2">

          <div className="flex items-center gap-1.5">

            <Shield className="w-3.5 h-3.5 text-threatcast-muted" />

            <span className="text-[11px] font-bold text-threatcast-silver uppercase tracking-wider font-mono">
              Rule Engine
            </span>

          </div>

          <div>

            <span className="text-sm font-bold text-threatcast-text block">
              {connected ? 'Connected' : 'Not Connected'}
            </span>

            <span className="text-[11px] text-threatcast-muted font-mono block mt-0.5">
              {connected
                ? `${comparison.flagged_flow_count} flagged flow(s) evaluated`
                : 'Deterministic rule integration pending'}
            </span>

          </div>

        </div>

      </div>


      <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border flex items-start gap-3">

        <Info className="w-4 h-4 text-threatcast-cyan shrink-0 mt-0.5" />

        <div>

          <span className="text-xs font-bold text-threatcast-cyan font-mono">
            {connected ? 'PCAP MODEL-RULE COMPARISON' : 'NO MODEL-RULE DISAGREEMENT CLAIM'}
          </span>

          <p className="text-xs text-threatcast-silver leading-relaxed mt-1">
            {connected
              ? comparison.analytical_summary
              : 'The current CTU13 LSTM integration produces an early-warning probability only. Upload a PCAP to compare it with deterministic flow rules.'}
          </p>

        </div>

      </div>

    </div>
  );
}