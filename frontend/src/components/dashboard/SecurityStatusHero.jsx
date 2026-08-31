import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Clock, AlertOctagon, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function SecurityStatusHero({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 text-cyber-beige-100 p-6 md:p-8 shadow-2xl border border-cyber-brown-700/80 group">
      {/* Background ambient neural lighting */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-cyber-brown-600/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left: Security Posture Status */}
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase border ${
                summary.threat_level === 'CRITICAL'
                  ? 'bg-orange-950/90 text-orange-300 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                  : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping shadow-[0_0_8px_#f97316]" />
              Threat Level: {summary.threat_level} ({summary.threat_score}/100)
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-cyber-beige-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Horizon: {summary.forecast_horizon}
            </span>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Network Security Posture & Forecast
            </h2>
            <p className="text-xs md:text-sm text-cyber-beige-300 mt-1">
              ThreatCast AI temporal graph model is tracking active network states and forecasting the next attack progression.
            </p>
          </div>

          {/* Current State -> Next Predicted Stage */}
          <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 backdrop-blur-md space-y-2.5 shadow-inner">
            <div className="text-[11px] uppercase tracking-wider text-cyber-beige-400 font-bold flex items-center justify-between font-mono">
              <span>Attack Progression Vector</span>
              <span className="text-amber-400 font-mono text-[10px] font-bold">
                Confidence: {formatConfidence(summary.forecast_confidence)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-cyber-brown-950/80 border border-cyber-brown-800">
                <span className="text-[10px] text-cyber-beige-400 block font-mono">CURRENT (Observed)</span>
                <span className="text-sm font-bold text-white">{summary.current_stage}</span>
                <span className="text-[10px] text-cyber-beige-300 block truncate font-mono">{summary.current_stage_tactic}</span>
              </div>

              <div className="flex items-center justify-center text-amber-400">
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex-1 p-3 rounded-lg bg-gradient-to-r from-cyber-brown-900 to-cyber-amber-950 border border-amber-500/40 shadow-md">
                <span className="text-[10px] text-amber-300 block font-mono flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  PREDICTED NEXT (T+1)
                </span>
                <span className="text-sm font-bold text-white">{summary.next_predicted_stage}</span>
                <span className="text-[10px] text-amber-200 block truncate font-mono">{summary.next_predicted_tactic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recommended Proactive Defense Action */}
        <div className="lg:max-w-md w-full p-5 rounded-xl bg-gradient-to-b from-cyber-brown-950 to-cyber-black border border-cyber-brown-800 flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                Recommended Proactive Defense
              </span>
              <span className="text-[10px] font-mono text-cyber-beige-400">Automated Playbook</span>
            </div>
            <p className="text-xs text-cyber-beige-200 leading-relaxed bg-cyber-black/80 p-3.5 rounded-lg border border-cyber-brown-900">
              {summary.recommended_action}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/forecast"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyber-brown-700 to-amber-700 hover:from-cyber-brown-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all active:scale-95 border border-amber-500/30"
            >
              Inspect K=3 Forecast
            </Link>
            <Link
              to="/network-graph"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-cyber-brown-950 hover:bg-cyber-brown-900 text-cyber-beige-200 text-xs font-bold border border-cyber-brown-700/60 transition-colors"
            >
              View Network Graph
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
