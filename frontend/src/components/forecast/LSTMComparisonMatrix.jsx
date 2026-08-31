import React from 'react';
import { GitCompare, Sparkles, Cpu, CheckCircle2, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function LSTMComparisonMatrix({ comparisonData }) {
  if (!comparisonData) return null;

  const { lstm_a, lstm_b, divergence_analysis, advantage_note } = comparisonData;

  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soc-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-soc-ai" />
            <h3 className="text-base font-bold text-soc-slate-900">
              Model Architecture Comparison: LSTM-A vs. LSTM-B
            </h3>
          </div>
          <p className="text-xs text-soc-slate-500 mt-0.5">
            Demonstrating why Neo4j FastRP Graph topological embeddings dramatically outperform windowed-only statistical models.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-soc-slate-100 text-soc-slate-700 border border-soc-slate-200">
          Benchmark: LANL / DAPT2020
        </span>
      </div>

      {/* Side-by-Side Model Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LSTM-A Baseline */}
        <div className="p-5 rounded-xl bg-soc-slate-50 border border-soc-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-soc-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-soc-slate-500 uppercase block">
                Baseline Model
              </span>
              <h4 className="text-sm font-bold text-soc-slate-800">{lstm_a.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-soc-slate-200 text-soc-slate-700">
              {formatConfidence(lstm_a.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-soc-slate-200/60 font-mono">
              <span className="text-soc-slate-500">Feature Extraction:</span>
              <span className="text-soc-slate-800 font-semibold">{lstm_a.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-soc-slate-200/60 font-mono">
              <span className="text-soc-slate-500">Stability:</span>
              <span className="text-soc-slate-800 font-semibold">{lstm_a.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-soc-slate-200/60 font-mono">
              <span className="text-soc-slate-500">False Positive Rate:</span>
              <span className="text-amber-700 font-semibold">{lstm_a.false_positive_rate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-soc-slate-200/60 font-mono">
              <span className="text-soc-slate-500">Graph Context:</span>
              <span className="text-soc-slate-500">{lstm_a.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-soc-slate-500 font-mono block mb-0.5">Forecast Prediction:</span>
              <p className="font-semibold text-soc-slate-800 bg-white p-2 rounded border border-soc-slate-200">
                {lstm_a.prediction}
              </p>
            </div>
          </div>
        </div>

        {/* LSTM-B ThreatCast AI */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white border border-indigo-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                ThreatCast AI Innovation
              </span>
              <h4 className="text-sm font-bold text-soc-slate-900">{lstm_b.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-soc-ai text-white shadow-sm">
              {formatConfidence(lstm_b.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-indigo-100 font-mono">
              <span className="text-soc-slate-600">Feature Extraction:</span>
              <span className="text-indigo-900 font-semibold">{lstm_b.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-indigo-100 font-mono">
              <span className="text-soc-slate-600">Stability:</span>
              <span className="text-emerald-700 font-semibold">{lstm_b.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-indigo-100 font-mono">
              <span className="text-soc-slate-600">False Positive Rate:</span>
              <span className="text-emerald-700 font-semibold">{lstm_b.false_positive_rate} (-75%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-indigo-100 font-mono">
              <span className="text-soc-slate-600">Graph Context:</span>
              <span className="text-indigo-800 font-semibold">{lstm_b.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-indigo-600 font-mono block mb-0.5">Forecast Prediction:</span>
              <p className="font-bold text-indigo-950 bg-white/90 p-2 rounded border border-indigo-200">
                {lstm_b.prediction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Analysis Callout */}
      <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-soc-slate-900">
          <Info className="w-4 h-4 text-soc-ai" />
          <span>Analytical Divergence Explanation:</span>
        </div>
        <p className="text-soc-slate-600 leading-relaxed pl-5">
          {divergence_analysis}
        </p>
        <p className="text-indigo-900 font-medium leading-relaxed pl-5">
          <strong>Key Takeaway: </strong>{advantage_note}
        </p>
      </div>
    </div>
  );
}
