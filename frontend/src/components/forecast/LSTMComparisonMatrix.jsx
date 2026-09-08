import React from 'react';
import { GitCompare, Sparkles, Cpu, CheckCircle2, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function LSTMComparisonMatrix({ comparisonData }) {
  if (!comparisonData) return null;

  const { lstm_a, lstm_b, divergence_analysis, advantage_note } = comparisonData;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ebdcc7] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#b45309]" />
            <h3 className="text-base font-bold text-[#221207] tracking-tight">
              Model Architecture Comparison: LSTM-A vs. LSTM-B
            </h3>
          </div>
          <p className="text-xs text-[#544230] mt-0.5">
            Demonstrating why Neo4j FastRP Graph topological embeddings dramatically outperform windowed-only statistical models.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded bg-[#f5efe6] text-[#78350f] border border-[#ded0bc] font-bold">
          Benchmark: LANL / DAPT2020
        </span>
      </div>

      {/* Side-by-Side Model Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LSTM-A Baseline */}
        <div className="p-5 rounded-2xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-4">
          <div className="flex items-center justify-between border-b border-[#ebdcc7] pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#7a644c] uppercase block">
                Baseline Model
              </span>
              <h4 className="text-sm font-bold text-[#221207]">{lstm_a.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-white text-[#544230] border border-[#ebdcc7]">
              {formatConfidence(lstm_a.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#f5efe6] font-mono">
              <span className="text-[#7a644c]">Feature Extraction:</span>
              <span className="text-[#221207] font-semibold">{lstm_a.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f5efe6] font-mono">
              <span className="text-[#7a644c]">Stability:</span>
              <span className="text-[#221207] font-semibold">{lstm_a.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f5efe6] font-mono">
              <span className="text-[#7a644c]">False Positive Rate:</span>
              <span className="text-[#ea580c] font-semibold">{lstm_a.false_positive_rate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f5efe6] font-mono">
              <span className="text-[#7a644c]">Graph Context:</span>
              <span className="text-[#998165]">{lstm_a.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-[#7a644c] font-mono block mb-0.5">Forecast Prediction:</span>
              <p className="font-semibold text-[#382012] bg-white p-2.5 rounded-xl border border-[#ebdcc7] font-mono">
                {lstm_a.prediction}
              </p>
            </div>
          </div>
        </div>

        {/* LSTM-B ThreatCast AI */}
        <div className="p-5 rounded-2xl bg-[#fffbeb] border border-[#fde68a] space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#fde68a] pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#b45309] uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#d97706]" />
                ThreatCast AI Innovation
              </span>
              <h4 className="text-sm font-bold text-[#78350f]">{lstm_b.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#b45309] text-white">
              {formatConfidence(lstm_b.confidence)} Conf
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#fef3c7] font-mono">
              <span className="text-[#7a644c]">Feature Extraction:</span>
              <span className="text-[#78350f] font-bold">{lstm_b.feature_type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#fef3c7] font-mono">
              <span className="text-[#7a644c]">Stability:</span>
              <span className="text-[#4d7c0f] font-bold">{lstm_b.stability}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#fef3c7] font-mono">
              <span className="text-[#7a644c]">False Positive Rate:</span>
              <span className="text-[#4d7c0f] font-bold">{lstm_b.false_positive_rate} (-75%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#fef3c7] font-mono">
              <span className="text-[#7a644c]">Graph Context:</span>
              <span className="text-[#78350f] font-semibold">{lstm_b.graph_awareness}</span>
            </div>
            <div className="py-1">
              <span className="text-[#b45309] font-mono block mb-0.5 font-bold">Forecast Prediction:</span>
              <p className="font-bold text-[#301a0a] bg-white p-2.5 rounded-xl border border-[#fde68a] font-mono">
                {lstm_b.prediction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Analysis Callout */}
      <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#b45309]">
          <Info className="w-4 h-4 text-[#d97706]" />
          <span>Analytical Divergence Explanation:</span>
        </div>
        <p className="text-[#544230] leading-relaxed pl-6">
          {divergence_analysis}
        </p>
        <p className="text-[#221207] font-medium leading-relaxed pl-6 font-mono">
          <strong className="text-[#b45309]">Key Takeaway: </strong>{advantage_note}
        </p>
      </div>
    </div>
  );
}
