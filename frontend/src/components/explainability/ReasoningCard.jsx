import React from 'react';
import { Sparkles, Brain, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ReasoningCard({ explainData }) {
  if (!explainData) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 text-white border border-cyber-maroon-800 shadow-2xl space-y-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyber-maroon-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-600/40 flex items-center justify-center text-rose-400 shadow-md">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Why Did ThreatCast AI Predict This?
            </h3>
            <p className="text-xs text-cyber-grey-400">
              Natural language explanation grounded in telemetry sequence and graph embeddings.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-rose-950 text-rose-300 border border-rose-600/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
          Confidence: {formatConfidence(explainData.confidence)}
        </span>
      </div>

      {/* Observed -> Forecasted Transition */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-cyber-grey-400 block">Observed State</span>
          <span className="text-xs font-bold text-white">{explainData.observed_stage}</span>
        </div>
        <div className="text-rose-400 flex items-center justify-center">
          <ArrowRight className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-rose-300 block">Forecasted Transition</span>
          <span className="text-xs font-bold text-rose-200">{explainData.predicted_stage}</span>
        </div>
      </div>

      {/* Natural language narrative */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-cyber-grey-400 block">
          AI Diagnostic Reasoning:
        </span>
        <p className="text-xs text-cyber-grey-200 leading-relaxed bg-cyber-black/90 p-4 rounded-xl border border-cyber-maroon-850 font-medium">
          {explainData.forecast_reasoning}
        </p>
      </div>

      {/* Scores metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
          <span className="text-cyber-grey-400 block text-[10px]">Graph Proximity Score</span>
          <span className="text-rose-300 font-bold text-sm">{(explainData.graph_proximity_score * 100).toFixed(1)}%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
          <span className="text-cyber-grey-400 block text-[10px]">Temporal Sequence Alignment</span>
          <span className="text-rose-300 font-bold text-sm">{(explainData.temporal_sequence_alignment * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
