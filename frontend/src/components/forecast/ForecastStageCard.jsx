import React from 'react';
import { Clock, ShieldAlert, Sparkles, AlertOctagon, CheckCircle2, Server } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ForecastStageCard({ stage, isCurrent = false }) {
  if (!stage) return null;

  return (
    <div
      className={`rounded-2xl p-6 border transition-all shadow-sm ${
        isCurrent
          ? 'bg-soc-navy-950 text-white border-soc-navy-800'
          : 'bg-white text-soc-slate-900 border-soc-slate-200 hover:border-indigo-300'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              isCurrent
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {stage.horizon}
          </span>
          <span
            className={`text-xs font-semibold ${
              isCurrent ? 'text-emerald-400' : 'text-indigo-600'
            }`}
          >
            {isCurrent ? 'CURRENT OBSERVED' : 'FORECASTED STATE'}
          </span>
        </div>

        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
            isCurrent
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          {formatConfidence(stage.confidence)} Confidence
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-bold tracking-tight">{stage.stage_name}</h3>
        <p className={`text-xs font-mono ${isCurrent ? 'text-soc-slate-400' : 'text-soc-slate-500'}`}>
          MITRE ATT&CK: {stage.tactic} ({stage.technique_id})
        </p>
        <p className={`text-xs leading-relaxed mt-2 ${isCurrent ? 'text-soc-slate-300' : 'text-soc-slate-600'}`}>
          {stage.description}
        </p>
      </div>

      {/* Affected Nodes & Est. Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div
          className={`p-3 rounded-xl border ${
            isCurrent ? 'bg-soc-navy-900 border-soc-navy-800' : 'bg-soc-slate-50 border-soc-slate-200'
          }`}
        >
          <span className={`block text-[10px] uppercase font-bold mb-1 ${isCurrent ? 'text-soc-slate-400' : 'text-soc-slate-500'}`}>
            Estimated Window
          </span>
          <span className="font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {stage.estimated_time_to_impact}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            isCurrent ? 'bg-soc-navy-900 border-soc-navy-800' : 'bg-soc-slate-50 border-soc-slate-200'
          }`}
        >
          <span className={`block text-[10px] uppercase font-bold mb-1 ${isCurrent ? 'text-soc-slate-400' : 'text-soc-slate-500'}`}>
            Affected Infrastructure
          </span>
          <span className="font-semibold truncate block" title={stage.affected_nodes?.join(', ')}>
            {stage.affected_nodes?.join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Probability Distribution if present */}
      {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
        <div className="mb-4 space-y-1.5">
          <span className={`text-[10px] uppercase font-mono font-bold block ${isCurrent ? 'text-soc-slate-400' : 'text-soc-slate-500'}`}>
            Tactical Probability Distribution:
          </span>
          <div className="space-y-1">
            {Object.entries(stage.probability_distribution).map(([tactic, prob]) => (
              <div key={tactic} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className={isCurrent ? 'text-soc-slate-300' : 'text-soc-slate-700'}>{tactic}</span>
                  <span className="font-bold">{formatConfidence(prob)}</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isCurrent ? 'bg-soc-navy-800' : 'bg-soc-slate-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-soc-ai"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Proactive Mitigation */}
      <div
        className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
          isCurrent
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold">
            Proactive Mitigation:
          </strong>
          <span className="leading-relaxed">{stage.recommended_mitigation}</span>
        </div>
      </div>
    </div>
  );
}
