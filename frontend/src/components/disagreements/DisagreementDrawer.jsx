import React from 'react';
import { X, AlertTriangle, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="p-6 bg-threatcast-card rounded-2xl border border-tc-border shadow-xs space-y-6 animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-tc-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber">
              DISAGREEMENT SIGNAL
            </span>
            <span className="text-xs font-mono text-threatcast-muted">{item.timestamp}</span>
          </div>
          <h3 className="text-lg font-bold text-threatcast-text mt-1">
            Target: {item.target_node}
          </h3>
          <p className="text-xs font-mono text-threatcast-muted">
            Network Context: {item.network_context}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-threatcast-elevated text-threatcast-muted hover:text-threatcast-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Model vs Rule Side-by-Side Breakdown */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-threatcast-elevated border border-threatcast-amber space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-threatcast-cyan flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-threatcast-cyan" />
            AI Model Prediction ({formatConfidence(item.model_confidence)} Confidence)
          </span>
          <p className="text-sm font-bold text-threatcast-text">{item.model_prediction}</p>
          <span className="text-[11px] font-mono text-threatcast-cyan block">
            Architecture: {item.model_architecture}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-threatcast-muted flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-threatcast-muted" />
            Deterministic Rule Engine Output
          </span>
          <p className="text-sm font-semibold text-threatcast-text">{item.rule_output}</p>
          <span className="text-[11px] font-mono text-threatcast-muted block">
            Rule Name: {item.rule_name} • Severity: {item.rule_severity}
          </span>
        </div>
      </div>

      {/* Why It Matters */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-threatcast-muted block">
          Why This Disagreement Matters:
        </span>
        <div className="p-3.5 rounded-xl bg-threatcast-elevated border border-threatcast-amber text-xs text-threatcast-cyan leading-relaxed font-medium">
          {item.why_it_matters}
        </div>
      </div>

      {/* Observed Signals List */}
      {item.observed_signals && item.observed_signals.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-threatcast-muted block">
            Observed Supporting Signals:
          </span>
          <ul className="space-y-1.5 text-xs text-threatcast-text font-medium">
            {item.observed_signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-threatcast-card border border-tc-border">
                <span className="w-1.5 h-1.5 rounded-full bg-threatcast-cyan mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border text-threatcast-text space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase text-threatcast-cyan block">
          Proactive Recommended Action:
        </span>
        <p className="text-xs text-threatcast-text leading-relaxed">
          {item.recommended_action}
        </p>
      </div>
    </div>
  );
}
