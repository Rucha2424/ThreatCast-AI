import React from 'react';
import { Clock, ShieldAlert, Sparkles, AlertOctagon, CheckCircle2, Server, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ForecastStageCard({ stage, isCurrent = false }) {
  if (!stage) return null;

  return (
    <div
      className={`rounded-2xl p-6 border transition-all duration-200 shadow-xs ${
        isCurrent
          ? 'bg-threatcast-card text-threatcast-text border-tc-border'
          : 'bg-threatcast-card text-threatcast-text border-tc-border hover:border-threatcast-cyan'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              isCurrent
                ? 'bg-threatcast-elevated text-threatcast-red border border-threatcast-red'
                : 'bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber'
            }`}
          >
            {stage.horizon}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              isCurrent ? 'text-threatcast-amber' : 'text-threatcast-cyan'
            }`}
          >
            {isCurrent ? 'CURRENT OBSERVED' : 'FORECASTED STATE'}
          </span>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
            isCurrent
              ? 'bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber'
              : 'bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber'
          }`}
        >
          {formatConfidence(stage.confidence)} Confidence
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-bold tracking-tight text-threatcast-text">{stage.stage_name}</h3>
        <p className="text-xs font-mono text-threatcast-muted">
          MITRE ATT&CK: {stage.tactic} ({stage.technique_id})
        </p>
        <p className="text-xs leading-relaxed mt-2 text-threatcast-silver">
          {stage.description}
        </p>
      </div>

      {/* Affected Nodes & Est. Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="p-3 rounded-xl border bg-threatcast-card border-tc-border">
          <span className="block text-[10px] uppercase font-bold mb-1 text-threatcast-muted">
            Estimated Window
          </span>
          <span className="font-bold text-threatcast-text flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-threatcast-cyan" />
            {stage.estimated_time_to_impact}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-threatcast-card border-tc-border">
          <span className="block text-[10px] uppercase font-bold mb-1 text-threatcast-muted">
            Affected Infrastructure
          </span>
          <span className="font-bold text-threatcast-text truncate block" title={stage.affected_nodes?.join(', ')}>
            {stage.affected_nodes?.join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Probability Distribution if present */}
      {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
        <div className="mb-4 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold block text-threatcast-muted">
            Tactical Probability Distribution:
          </span>
          <div className="space-y-1">
            {Object.entries(stage.probability_distribution).map(([tactic, prob]) => (
              <div key={tactic} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-threatcast-silver">{tactic}</span>
                  <span className="font-bold text-threatcast-cyan">{formatConfidence(prob)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-threatcast-elevated border border-tc-border">
                  <div
                    className="h-full bg-threatcast-cyan rounded-full"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Proactive Mitigation */}
      <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs bg-threatcast-elevated border-threatcast-amber text-threatcast-cyan">
        <AlertOctagon className="w-4 h-4 text-threatcast-cyan shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold text-threatcast-cyan font-mono">
            Proactive Mitigation:
          </strong>
          <span className="leading-relaxed text-threatcast-silver">{stage.recommended_mitigation}</span>
        </div>
      </div>
    </div>
  );
}
