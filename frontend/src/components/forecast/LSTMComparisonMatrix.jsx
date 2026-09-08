import React from 'react';
import { GitCompare, Sparkles, Cpu, CheckCircle2, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function LSTMComparisonMatrix({ comparisonData }) {
  if (!comparisonData) return null;

  const { lstm_a, lstm_b, divergence_analysis, advantage_note } = comparisonData;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-sky-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Model Architecture Comparison: LSTM-A vs. LSTM-B
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrating why Neo4j FastRP Graph topological embeddings dramatically outperform windowed-only statistical models.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Benchmark: LANL / DAPT2020
        </span>
      </div>

      {/* Side-by-Side Model Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LSTM-A Baseline */}
        <div className="p-5 rounded-2xl bg-cyber-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase block">
                Baseline Model
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white">{lstm_a.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {formatConfidence(lstm_a.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
              <span className="text-slate-400">Feature Extraction:</span>
              <span className="text-slate-200 font-semibold">{lstm_a.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
              <span className="text-slate-400">Stability:</span>
              <span className="text-slate-200 font-semibold">{lstm_a.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
              <span className="text-slate-400">False Positive Rate:</span>
              <span className="text-rose-400 font-semibold">{lstm_a.false_positive_rate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 font-mono">
              <span className="text-slate-400">Graph Context:</span>
              <span className="text-slate-500">{lstm_a.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-slate-400 font-mono block mb-0.5">Forecast Prediction:</span>
              <p className="font-semibold text-slate-200 bg-cyber-surface p-2.5 rounded-xl border border-slate-800 font-mono">
                {lstm_a.prediction}
              </p>
            </div>
          </div>
        </div>

        {/* LSTM-B ThreatCast AI */}
        <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                ThreatCast AI Innovation
              </span>
              <h4 className="text-sm sm:text-base font-bold text-sky-200">{lstm_b.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-sky-500 text-white shadow-md shadow-sky-500/30">
              {formatConfidence(lstm_b.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-sky-500/20 font-mono">
              <span className="text-slate-400">Feature Extraction:</span>
              <span className="text-sky-300 font-bold">{lstm_b.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-500/20 font-mono">
              <span className="text-slate-400">Stability:</span>
              <span className="text-emerald-400 font-bold">{lstm_b.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-500/20 font-mono">
              <span className="text-slate-400">False Positive Rate:</span>
              <span className="text-emerald-400 font-bold">{lstm_b.false_positive_rate} (-75%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-500/20 font-mono">
              <span className="text-slate-400">Graph Context:</span>
              <span className="text-sky-300 font-semibold">{lstm_b.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-sky-400 font-mono block mb-0.5 font-bold">Forecast Prediction:</span>
              <p className="font-bold text-white bg-cyber-surface p-2.5 rounded-xl border border-sky-500/30 font-mono">
                {lstm_b.prediction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Analysis Callout */}
      <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Analytical Divergence Explanation:</span>
        </div>
        <p className="leading-relaxed pl-6">
          {divergence_analysis}
        </p>
        <p className="text-white font-medium leading-relaxed pl-6 font-mono">
          <strong className="text-sky-400">Key Takeaway: </strong>{advantage_note}
        </p>
      </div>
    </div>
  );
}
