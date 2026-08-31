import React from 'react';
import { Sparkles, Brain, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ReasoningCard({ explainData }) {
  if (!explainData) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white text-[#221207] border border-[#ebdcc7] shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ebdcc7] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#b45309]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#221207] tracking-tight">
              Why Did ThreatCast AI Predict This?
            </h3>
            <p className="text-xs text-[#7a644c]">
              Natural language explanation grounded in telemetry sequence and graph embeddings.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
          Confidence: {formatConfidence(explainData.confidence)}
        </span>
      </div>

      {/* Observed -> Forecasted Transition */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-[#7a644c] block">Observed State</span>
          <span className="text-xs font-bold text-[#221207]">{explainData.observed_stage}</span>
        </div>
        <div className="text-[#b45309] flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-[#b45309] block">Forecasted Transition</span>
          <span className="text-xs font-bold text-[#78350f]">{explainData.predicted_stage}</span>
        </div>
      </div>

      {/* Natural language narrative */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-[#7a644c] block">
          AI Diagnostic Reasoning:
        </span>
        <p className="text-xs text-[#42240f] leading-relaxed bg-[#fcfaf7] p-4 rounded-xl border border-[#ebdcc7] font-medium">
          {explainData.forecast_reasoning}
        </p>
      </div>

      {/* Scores metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
          <span className="text-[#7a644c] block text-[10px]">Graph Proximity Score</span>
          <span className="text-[#b45309] font-bold text-sm">{(explainData.graph_proximity_score * 100).toFixed(1)}%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
          <span className="text-[#7a644c] block text-[10px]">Temporal Sequence Alignment</span>
          <span className="text-[#b45309] font-bold text-sm">{(explainData.temporal_sequence_alignment * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
