import React from 'react';
import { X, AlertTriangle, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="p-6 bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 rounded-2xl border border-cyber-brown-800 shadow-2xl space-y-6 animate-in slide-in-from-right duration-200 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-cyber-brown-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600/50">
              DISAGREEMENT SIGNAL
            </span>
            <span className="text-xs font-mono text-cyber-beige-400">{item.timestamp}</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Target: {item.target_node}
          </h3>
          <p className="text-xs font-mono text-cyber-beige-400">
            Network Context: {item.network_context}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-cyber-brown-900/80 text-cyber-beige-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Model vs Rule Side-by-Side Breakdown */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyber-brown-900 to-cyber-amber-950 border border-amber-500/40 space-y-1.5 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Model Prediction ({formatConfidence(item.model_confidence)} Confidence)
          </span>
          <p className="text-sm font-bold text-white">{item.model_prediction}</p>
          <span className="text-[11px] font-mono text-amber-200 block">
            Architecture: {item.model_architecture}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-cyber-beige-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-cyber-beige-400" />
            Deterministic Rule Engine Output
          </span>
          <p className="text-sm font-semibold text-cyber-beige-200">{item.rule_output}</p>
          <span className="text-[11px] font-mono text-cyber-beige-400 block">
            Rule Name: {item.rule_name} • Severity: {item.rule_severity}
          </span>
        </div>
      </div>

      {/* Why It Matters */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-cyber-beige-400 block">
          Why This Disagreement Matters:
        </span>
        <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-700/60 text-xs text-amber-200 leading-relaxed font-medium">
          {item.why_it_matters}
        </div>
      </div>

      {/* Observed Signals List */}
      {item.observed_signals && item.observed_signals.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-cyber-beige-400 block">
            Observed Supporting Signals:
          </span>
          <ul className="space-y-1.5 text-xs text-cyber-beige-300 font-medium">
            {item.observed_signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-cyber-black/80 border border-cyber-brown-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-[0_0_6px_#f59e0b]" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      <div className="p-4 rounded-xl bg-cyber-black border border-cyber-brown-800 text-white space-y-2 shadow-inner">
        <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
          Proactive Recommended Action:
        </span>
        <p className="text-xs text-cyber-beige-200 leading-relaxed">
          {item.recommended_action}
        </p>
      </div>
    </div>
  );
}
