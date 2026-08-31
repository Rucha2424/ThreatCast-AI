import React from 'react';
import { Sparkles, Brain, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ReasoningCard({ explainData }) {
  if (!explainData) return null;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-soc-navy-950 to-soc-navy-900 text-white border border-soc-navy-800 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soc-navy-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Why Did ThreatCast AI Predict This?
            </h3>
            <p className="text-xs text-soc-slate-400">
              Natural language explanation grounded in telemetry sequence and graph embeddings.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-soc-ai/20 text-indigo-300 border border-soc-ai/30">
          Confidence: {formatConfidence(explainData.confidence)}
        </span>
      </div>

      {/* Observed -> Forecasted Transition */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-soc-navy-900 border border-soc-navy-750">
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-soc-slate-400 block">Observed State</span>
          <span className="text-xs font-bold text-white">{explainData.observed_stage}</span>
        </div>
        <div className="text-soc-ai flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-indigo-400 block">Forecasted Transition</span>
          <span className="text-xs font-bold text-indigo-200">{explainData.predicted_stage}</span>
        </div>
      </div>

      {/* Natural language narrative */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-soc-slate-400 block">
          AI Diagnostic Reasoning:
        </span>
        <p className="text-xs text-soc-slate-200 leading-relaxed bg-soc-navy-950/80 p-4 rounded-xl border border-soc-navy-800">
          {explainData.forecast_reasoning}
        </p>
      </div>

      {/* Scores metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-soc-navy-900 border border-soc-navy-800">
          <span className="text-soc-slate-400 block text-[10px]">Graph Proximity Score</span>
          <span className="text-white font-bold text-sm">{(explainData.graph_proximity_score * 100).toFixed(1)}%</span>
        </div>
        <div className="p-3 rounded-xl bg-soc-navy-900 border border-soc-navy-800">
          <span className="text-soc-slate-400 block text-[10px]">Temporal Sequence Alignment</span>
          <span className="text-white font-bold text-sm">{(explainData.temporal_sequence_alignment * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
