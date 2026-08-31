import React from 'react';
import { GitCompare, AlertTriangle, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function ModelRuleComparisonCard({ disagreementData }) {
  const item = disagreementData?.disagreements?.[0];

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 border border-cyber-brown-800 shadow-2xl flex flex-col justify-between space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyber-brown-900 border border-cyber-brown-700/80 flex items-center justify-center text-amber-400 shadow-md">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Model vs Rule Verification
              <span className="text-[10px] font-normal text-cyber-beige-400 font-mono">
                (Learned Neural AI vs Deterministic Signature)
              </span>
            </h3>
            <p className="text-xs text-cyber-beige-300">
              When AI predictions and deterministic rules diverge, the disagreement becomes a primary security signal.
            </p>
          </div>
        </div>

        <Link
          to="/disagreements"
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors font-mono"
        >
          <span>All Disagreements</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Side-by-side comparison boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Model Output */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyber-brown-900/95 to-cyber-amber-950/80 border border-amber-600/40 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Neural AI Model Prediction
            </span>
            <span className="text-xs font-mono font-bold text-amber-200 bg-amber-950 px-2.5 py-0.5 rounded border border-amber-700">
              {formatConfidence(item?.model_confidence || 0.88)}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-white block">
              {item?.model_prediction || 'Multi-Stage Lateral Movement Campaign'}
            </span>
            <span className="text-[11px] text-cyber-beige-300 font-mono block mt-0.5">
              Model: {item?.model_architecture || 'LSTM-B + Graph FastRP Features'}
            </span>
          </div>
        </div>

        {/* Rule Engine Output */}
        <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyber-beige-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-cyber-beige-400" />
              Deterministic Rule Engine
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-700/60">
              Severity: {item?.rule_severity || 'Medium'}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-cyber-beige-200 block">
              {item?.rule_output || 'Port Scan Detected'}
            </span>
            <span className="text-[11px] text-cyber-beige-400 font-mono block mt-0.5">
              Rule: {item?.rule_name || 'TCP SYN Port Sweep Detector'}
            </span>
          </div>
        </div>
      </div>

      {/* Disagreement Callout Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 to-cyber-black border border-amber-700/60 flex items-start gap-3 shadow-md">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300 font-mono">
              ⚠ MODEL–RULE DISAGREEMENT DETECTED
            </span>
            <span className="text-[10px] font-mono text-amber-400/80">Target: {item?.target_node}</span>
          </div>
          <p className="text-xs text-cyber-beige-200 leading-relaxed">
            {item?.why_it_matters ||
              'Learned AI temporal graph model and deterministic rule outputs differ. The static rule classified the activity as an isolated port sweep, whereas graph embeddings identified targeted lateral reconnaissance.'}
          </p>
        </div>
      </div>
    </div>
  );
}
