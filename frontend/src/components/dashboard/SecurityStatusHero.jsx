import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Clock, AlertOctagon, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function SecurityStatusHero({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white text-[#301a0a] p-6 md:p-8 shadow-xs border border-[#ebdcc7]">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left: Security Posture Status */}
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase border ${
                summary.threat_level === 'CRITICAL'
                  ? 'bg-[#ffedd5] text-[#c2410c] border-[#fdba74]'
                  : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
              Threat Level: {summary.threat_level} ({summary.threat_score}/100)
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#7a644c] font-mono">
              <Clock className="w-3.5 h-3.5 text-[#b45309]" />
              Horizon: {summary.forecast_horizon}
            </span>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#221207] flex items-center gap-2">
              Network Security Posture & Forecast
            </h2>
            <p className="text-xs md:text-sm text-[#544230] mt-1">
              ThreatCast AI temporal graph model is tracking active network states and forecasting the next attack progression.
            </p>
          </div>

          {/* Current State -> Next Predicted Stage */}
          <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2.5 shadow-2xs">
            <div className="text-[11px] uppercase tracking-wider text-[#7a644c] font-bold flex items-center justify-between font-mono">
              <span>Attack Progression Vector</span>
              <span className="text-[#b45309] font-mono text-[10px] font-bold">
                Confidence: {formatConfidence(summary.forecast_confidence)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-white border border-[#ebdcc7]">
                <span className="text-[10px] text-[#7a644c] block font-mono font-semibold">CURRENT (Observed)</span>
                <span className="text-sm font-bold text-[#221207]">{summary.current_stage}</span>
                <span className="text-[10px] text-[#544230] block truncate font-mono">{summary.current_stage_tactic}</span>
              </div>

              <div className="flex items-center justify-center text-[#b45309]">
                <ArrowRight className="w-5 h-5" />
              </div>

              <div className="flex-1 p-3 rounded-lg bg-[#fffbeb] border border-[#fde68a] shadow-xs">
                <span className="text-[10px] text-[#b45309] block font-mono flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-[#d97706]" />
                  PREDICTED NEXT (T+1)
                </span>
                <span className="text-sm font-bold text-[#78350f]">{summary.next_predicted_stage}</span>
                <span className="text-[10px] text-[#92400e] block truncate font-mono">{summary.next_predicted_tactic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recommended Proactive Defense Action */}
        <div className="lg:max-w-md w-full p-5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] flex flex-col justify-between space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#b45309] flex items-center gap-1.5 font-mono">
                <AlertOctagon className="w-4 h-4 text-[#d97706]" />
                Recommended Proactive Defense
              </span>
              <span className="text-[10px] font-mono text-[#7a644c]">Automated Playbook</span>
            </div>
            <p className="text-xs text-[#42240f] leading-relaxed bg-white p-3.5 rounded-lg border border-[#ebdcc7]">
              {summary.recommended_action}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/forecast"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 font-mono"
            >
              Inspect K=3 Forecast
            </Link>
            <Link
              to="/network-graph"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-white hover:bg-[#f5efe6] text-[#42240f] text-xs font-bold border border-[#ebdcc7] transition-colors font-mono"
            >
              View Network Graph
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
