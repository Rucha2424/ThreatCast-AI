import React from 'react';
import { Sparkles, Brain, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import InfoTooltip from '../common/InfoTooltip';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function ReasoningCard({ explainData }) {
  if (!explainData) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface text-slate-100 border border-slate-800 shadow-soc-card space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Why Did ThreatCast AI Predict This?
              </h3>
              <InfoTooltip
                title="Explainable AI Attributions"
                whatItMeasures="Decomposes the neural forecast into understandable telemetry features and topological proximity scores."
                whyItMatters="Prevents 'black-box' security decisions by explaining exactly what evidence led to the prediction."
                interpretation="High proximity scores indicate that the attacker has established a direct network traversal path."
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-400">
              Natural language explanation grounded in telemetry sequence and graph embeddings.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
          Confidence: {formatConfidence(explainData.confidence)}
        </span>
      </div>

      {/* Observed -> Forecasted Transition */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-cyber-card border border-slate-800/80">
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Current Observed State</span>
          <span className="text-xs font-bold text-white">{explainData.observed_stage}</span>
        </div>
        <div className="text-sky-400 flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase text-sky-400 block">Forecasted Attack Step</span>
          <span className="text-xs font-bold text-sky-200">{explainData.predicted_stage}</span>
        </div>
      </div>

      {/* Natural language narrative */}
      <div className="space-y-1.5">
        <span className="text-xs font-mono font-bold uppercase text-slate-400 block">
          AI Diagnostic Reasoning (What Led to this Prediction):
        </span>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-cyber-card p-4 rounded-xl border border-slate-800/80 font-medium">
          {explainData.forecast_reasoning}
        </p>
      </div>

      {/* Scores metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Graph Proximity Score</span>
            <InfoTooltip
              title="FastRP Graph Proximity"
              whatItMeasures="Cosine similarity between the compromised node's FastRP embedding and the target asset's embedding."
              whyItMatters="High proximity means the attacker can traverse between the two systems in very few network hops."
              size="xs"
            />
          </div>
          <span className="text-sky-400 font-bold text-sm">{(explainData.graph_proximity_score * 100).toFixed(1)}%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Temporal Sequence Alignment</span>
            <InfoTooltip
              title="Temporal Alignment"
              whatItMeasures="Alignment between observed multi-event sequence and historical multi-stage attack datasets (LANL/DAPT2020)."
              whyItMatters="Matches current adversary behavior to established cyber kill-chain playbooks."
              size="xs"
            />
          </div>
          <span className="text-sky-400 font-bold text-sm">{(explainData.temporal_sequence_alignment * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Level 3: Progressive Disclosure for Model Embeddings */}
      <ProgressiveDisclosure
        title="Technical Hyperparameters & Embedding Dimensions"
        badge="Deep AI Evidence"
        defaultOpen={false}
      >
        <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">Embedding Method:</span>
            <span className="font-bold text-white">FastRP (Random Projection 128-dim)</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">Attention Mechanism:</span>
            <span className="font-bold text-white">Multi-Head Temporal Softmax Attention</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-500">Subnet Neighborhood:</span>
            <span className="font-bold text-sky-400">14-Hop Traversal Graph</span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
