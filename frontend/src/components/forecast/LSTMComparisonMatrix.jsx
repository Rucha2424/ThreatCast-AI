import React from 'react';
import { Cpu, Database, Info, Sparkles } from 'lucide-react';

export default function LSTMComparisonMatrix({ comparisonData }) {
  if (!comparisonData) return null;

  const {
    lstm_a,
    lstm_b,
    divergence_analysis,
    advantage_note,
  } = comparisonData;

  const formatConfidence = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === 0
    ) {
      return 'N/A';
    }

    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tc-border pb-4">

        <div>
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-threatcast-cyan" />

            <h3 className="text-base font-bold text-threatcast-text tracking-tight">
              LSTM Model Comparison
            </h3>
          </div>

          <p className="text-xs text-threatcast-silver mt-1">
            Comparison of ThreatCast's temporal early-warning model with
            the separate attack-stage classification model.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded bg-threatcast-elevated text-threatcast-cyan border border-tc-border font-bold">
          Benchmark: CTU13 / DAPT2020
        </span>
      </div>

      {/* Side-by-side models */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CTU13 */}
        <div className="p-5 rounded-2xl bg-threatcast-card border border-tc-border space-y-4">

          <div className="flex items-center justify-between border-b border-tc-border pb-3">

            <div>
              <span className="text-[11px] font-mono font-bold text-threatcast-muted uppercase block">
                Early-Warning Model
              </span>

              <h4 className="text-sm font-bold text-threatcast-text">
                {lstm_a.name}
              </h4>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-threatcast-card text-threatcast-silver border border-tc-border">
              {formatConfidence(lstm_a.confidence)}
            </span>
          </div>

          <div className="space-y-2 text-xs">

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Feature Extraction:
              </span>

              <span className="text-threatcast-text font-semibold">
                {lstm_a.feature_type}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Architecture:
              </span>

              <span className="text-threatcast-text font-semibold">
                {lstm_a.architecture}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Prediction:
              </span>

              <span className="text-threatcast-text font-semibold">
                {lstm_a.prediction}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Stability:
              </span>

              <span className="text-threatcast-text font-semibold">
                {lstm_a.stability}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                False Positive Rate:
              </span>

              <span className="text-threatcast-amber font-semibold">
                {lstm_a.false_positive_rate}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Graph Context:
              </span>

              <span className="text-threatcast-muted">
                {lstm_a.graph_awareness}
              </span>
            </div>

            <div className="py-1 font-mono">
              <span className="text-threatcast-muted block mb-1">
                Key Advantage:
              </span>

              <p className="font-semibold text-[var(--tc-card-elevated)] bg-threatcast-card p-2.5 rounded-xl border border-tc-border">
                {lstm_a.key_advantage}
              </p>
            </div>

          </div>
        </div>

        {/* DAPT2020 */}
        <div className="p-5 rounded-2xl bg-threatcast-elevated border border-threatcast-amber space-y-4 shadow-2xs">

          <div className="flex items-center justify-between border-b border-threatcast-amber pb-3">

            <div>
              <span className="text-[11px] font-mono font-bold text-threatcast-cyan uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-threatcast-cyan" />
                Separate Stage Model
              </span>

              <h4 className="text-sm font-bold text-threatcast-cyan">
                {lstm_b.name}
              </h4>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-threatcast-cyan text-white">
              {formatConfidence(lstm_b.confidence)}
            </span>
          </div>

          <div className="space-y-2 text-xs">

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Feature Extraction:
              </span>

              <span className="text-threatcast-cyan font-bold">
                {lstm_b.feature_type}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Architecture:
              </span>

              <span className="text-threatcast-cyan font-bold">
                {lstm_b.architecture}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Prediction:
              </span>

              <span className="text-threatcast-cyan font-bold">
                {lstm_b.prediction}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Stability:
              </span>

              <span className="text-threatcast-green font-bold">
                {lstm_b.stability}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                False Positive Rate:
              </span>

              <span className="text-threatcast-green font-bold">
                {lstm_b.false_positive_rate}
              </span>
            </div>

            <div className="py-1 border-b border-tc-border font-mono">
              <span className="text-threatcast-muted block">
                Graph Context:
              </span>

              <span className="text-threatcast-cyan font-semibold">
                {lstm_b.graph_awareness}
              </span>
            </div>

            <div className="py-1 font-mono">
              <span className="text-threatcast-cyan block mb-1 font-bold">
                Key Advantage:
              </span>

              <p className="font-bold text-threatcast-text bg-threatcast-card p-2.5 rounded-xl border border-threatcast-amber">
                {lstm_b.key_advantage}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Analytical explanation */}
      <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border text-xs space-y-3">

        <div className="flex items-center gap-2 text-xs font-bold text-threatcast-cyan">
          <Info className="w-4 h-4 text-threatcast-cyan" />

          <span>
            Analytical Comparison
          </span>
        </div>

        <p className="text-threatcast-silver leading-relaxed pl-6">
          {divergence_analysis}
        </p>

        <p className="text-threatcast-text font-medium leading-relaxed pl-6 font-mono">
          <strong className="text-threatcast-cyan">
            Key Takeaway:{' '}
          </strong>

          {advantage_note}
        </p>
      </div>

      {/* Scope note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-threatcast-card border border-tc-border">

        <Database className="w-4 h-4 mt-0.5 text-threatcast-cyan shrink-0" />

        <p className="text-xs text-threatcast-muted leading-relaxed">
          These models perform different tasks. The CTU13 LSTM is the
          deployed ThreatCast early-warning model. The DAPT2020 LSTM is
          a separate research model for attack-stage classification.
          Neither model provides graph-based prediction in this integration.
        </p>

      </div>

    </div>
  );
}