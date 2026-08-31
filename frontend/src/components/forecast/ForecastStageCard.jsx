import React from 'react';
import { Clock, ShieldAlert, Sparkles, AlertOctagon, CheckCircle2, Server, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ForecastStageCard({ stage, isCurrent = false }) {
  if (!stage) return null;

  return (
    <div
      className={`rounded-2xl p-6 border transition-all duration-300 shadow-xl backdrop-blur-md ${
        isCurrent
          ? 'bg-gradient-to-br from-cyber-brown-900 via-cyber-black to-cyber-amber-950 text-white border-amber-600/50 shadow-amber-950/60'
          : 'bg-cyber-brown-950/80 text-cyber-beige-100 border-cyber-brown-800 hover:border-amber-500/60'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              isCurrent
                ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-cyber-black text-amber-300 border border-amber-600/40'
            }`}
          >
            {stage.horizon}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              isCurrent ? 'text-orange-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {isCurrent ? 'CURRENT OBSERVED' : 'FORECASTED STATE'}
          </span>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
            isCurrent
              ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
              : 'bg-cyber-amber-950/80 text-amber-300 border border-amber-600/40'
          }`}
        >
          {formatConfidence(stage.confidence)} Confidence
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-bold tracking-tight text-white">{stage.stage_name}</h3>
        <p className="text-xs font-mono text-cyber-beige-400">
          MITRE ATT&CK: {stage.tactic} ({stage.technique_id})
        </p>
        <p className="text-xs leading-relaxed mt-2 text-cyber-beige-200">
          {stage.description}
        </p>
      </div>

      {/* Affected Nodes & Est. Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="p-3 rounded-xl border bg-cyber-black/90 border-cyber-brown-800">
          <span className="block text-[10px] uppercase font-bold mb-1 text-cyber-beige-400">
            Estimated Window
          </span>
          <span className="font-bold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {stage.estimated_time_to_impact}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-cyber-black/90 border-cyber-brown-800">
          <span className="block text-[10px] uppercase font-bold mb-1 text-cyber-beige-400">
            Affected Infrastructure
          </span>
          <span className="font-bold text-white truncate block" title={stage.affected_nodes?.join(', ')}>
            {stage.affected_nodes?.join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Probability Distribution if present */}
      {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
        <div className="mb-4 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold block text-cyber-beige-400">
            Tactical Probability Distribution:
          </span>
          <div className="space-y-1">
            {Object.entries(stage.probability_distribution).map(([tactic, prob]) => (
              <div key={tactic} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-cyber-beige-300">{tactic}</span>
                  <span className="font-bold text-amber-300">{formatConfidence(prob)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-cyber-black border border-cyber-brown-900">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_8px_#f59e0b]"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Proactive Mitigation */}
      <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs bg-amber-950/60 border-amber-700/60 text-amber-200 shadow-inner">
        <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold text-amber-300 font-mono">
            Proactive Mitigation:
          </strong>
          <span className="leading-relaxed text-cyber-beige-200">{stage.recommended_mitigation}</span>
        </div>
      </div>
    </div>
  );
}
