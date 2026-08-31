import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { formatConfidence, getThreatLevelColor } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function SecurityStatusHero({ summary }) {
  if (!summary) return null;

  const threatStyle = getThreatLevelColor(summary.threat_level);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-soc-navy-950 via-soc-navy-900 to-soc-navy-850 text-white p-6 md:p-8 shadow-xl border border-soc-navy-800">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 rounded-full bg-soc-ai/10 blur-3xl pointer-events-none" />
      {summary.threat_level === 'CRITICAL' && (
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-soc-threat/10 blur-3xl pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left: Security Posture Status */}
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase border ${
                summary.threat_level === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${threatStyle.dot} animate-ping`} />
              Threat Level: {summary.threat_level} ({summary.threat_score}/100)
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-soc-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              Horizon: {summary.forecast_horizon}
            </span>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Network Security Posture & Forecast
            </h2>
            <p className="text-xs md:text-sm text-soc-slate-300 mt-1">
              ThreatCast AI is tracking real-time network states and forecasting the next attack progression.
            </p>
          </div>

          {/* Current State -> Next Predicted Stage */}
          <div className="p-4 rounded-xl bg-soc-navy-900/90 border border-soc-navy-750 backdrop-blur space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider text-soc-slate-400 font-bold flex items-center justify-between">
              <span>Attack Progression Vector</span>
              <span className="text-indigo-400 font-mono text-[10px]">
                Confidence: {formatConfidence(summary.forecast_confidence)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 p-2.5 rounded-lg bg-soc-navy-950 border border-soc-navy-800">
                <span className="text-[10px] text-soc-slate-400 block font-mono">CURRENT (Observed)</span>
                <span className="text-sm font-semibold text-white">{summary.current_stage}</span>
                <span className="text-[10px] text-soc-slate-400 block truncate">{summary.current_stage_tactic}</span>
              </div>

              <div className="flex items-center justify-center text-soc-ai">
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex-1 p-2.5 rounded-lg bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40">
                <span className="text-[10px] text-indigo-300 block font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  PREDICTED NEXT (T+1)
                </span>
                <span className="text-sm font-semibold text-indigo-100">{summary.next_predicted_stage}</span>
                <span className="text-[10px] text-indigo-300/80 block truncate">{summary.next_predicted_tactic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recommended Proactive Defense Action */}
        <div className="lg:max-w-md w-full p-5 rounded-xl bg-gradient-to-b from-soc-navy-900/90 to-soc-navy-950/90 border border-soc-navy-750 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                Recommended Proactive Defense
              </span>
              <span className="text-[10px] font-mono text-soc-slate-400">Automated Playbook</span>
            </div>
            <p className="text-xs text-soc-slate-200 leading-relaxed bg-soc-navy-950/60 p-3 rounded-lg border border-soc-navy-800/80">
              {summary.recommended_action}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/forecast"
              className="flex-1 text-center py-2 px-3 rounded-lg bg-soc-ai hover:bg-soc-ai-electric text-white text-xs font-semibold shadow transition-all active:scale-95"
            >
              Inspect K=3 Forecast
            </Link>
            <Link
              to="/network-graph"
              className="flex-1 text-center py-2 px-3 rounded-lg bg-soc-navy-800 hover:bg-soc-navy-700 text-soc-slate-200 text-xs font-semibold border border-soc-navy-700 transition-colors"
            >
              View Network Graph
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
