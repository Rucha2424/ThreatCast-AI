import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Clock, AlertOctagon, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatConfidence } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import InfoTooltip from '../common/InfoTooltip';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function SecurityStatusHero({ summary }) {
  if (!summary) return null;

  const isCritical = summary.threat_level === 'CRITICAL';
  const isHigh = summary.threat_level === 'HIGH';

  // Plain-English human explanations for observed states
  const getPlainDescription = (stage) => {
    switch (stage) {
      case 'Privilege Escalation':
        return 'The attacker obtained elevated administrative access on a compromised endpoint workstation.';
      case 'Lateral Movement':
        return 'The attacker is actively spreading across subnet boundaries toward the Domain Controller.';
      case 'Collection & Staging':
        return 'Sensitive database records have been gathered and compressed into hidden directories.';
      case 'Defense Evasion':
        return 'The adversary is clearing event logs and destroying shadow copies to hide their tracks.';
      default:
        return 'Anomalous security events detected in the network telemetry stream.';
    }
  };

  const getPlainPrediction = (predictedStage) => {
    switch (predictedStage) {
      case 'Lateral Movement':
        return 'ThreatCast predicts the attacker will attempt to pivot to Server-03 using SMB/RPC shares.';
      case 'Credential Access & Staging':
        return 'ThreatCast predicts imminent memory dumping (LSASS) on Server-03 to harvest domain credentials.';
      case 'Encrypted Data Exfiltration':
        return 'ThreatCast predicts external transmission of staged data to a public C2 server in <4 minutes.';
      case 'Mass Encryption & Spreading':
        return 'ThreatCast predicts cryptographic encryption binaries will launch across all connected workstations.';
      default:
        return 'ThreatCast forecasts multi-stage attack progression toward core infrastructure.';
    }
  };

  return (
    <div
      id="tour-security-posture"
      className="relative overflow-hidden rounded-2xl bg-cyber-surface text-slate-100 p-6 md:p-8 shadow-soc-card border border-slate-800 space-y-6 flex-1 flex flex-col justify-between"
    >
      <div className="space-y-6">
        {/* Top Posture Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wide uppercase border shadow-md ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : isHigh
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCritical
                  ? 'bg-rose-500 animate-ping'
                  : isHigh
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            Threat Level: {summary.threat_level} ({summary.threat_score}/100)
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Horizon: {summary.forecast_horizon}
          </span>

          <InfoTooltip
            title="Threat Score & Posture"
            whatItMeasures="Composite risk index calculated from active attack anomalies and predicted future states."
            whyItMatters="High scores indicate an active breach with imminent risk of lateral spread or data loss."
            interpretation="Scores above 75 require immediate SOC intervention and containment playbooks."
            size="sm"
          />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Network Security Posture & Forecast
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            ThreatCast AI is tracking active network states and forecasting where the adversary is likely to move next.
          </p>
        </div>

        {/* Current State -> Predicted Next Stage Flow */}
        <div className="p-4 rounded-xl bg-cyber-card border border-slate-800/80 space-y-3 shadow-inner">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between font-mono">
            <span>Attack Progression Vector</span>
            <span className="text-sky-300 font-mono text-[11px] font-bold bg-sky-500/15 px-2.5 py-0.5 rounded border border-sky-500/30">
              AI Confidence: {formatConfidence(summary.forecast_confidence)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Observed State */}
            <div className="p-3.5 rounded-xl bg-cyber-surface border border-slate-800 space-y-1">
              <span className="text-[10px] text-rose-400 block font-mono font-bold uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                CURRENT (Observed)
              </span>
              <span className="text-sm font-bold text-slate-100 block">{summary.current_stage}</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {getPlainDescription(summary.current_stage)}
              </p>
            </div>

            {/* Predicted State */}
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1 shadow-sm">
              <span className="text-[10px] text-sky-400 block font-mono font-bold uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                PREDICTED NEXT (T+1)
              </span>
              <span className="text-sm font-bold text-sky-200 block">{summary.next_predicted_stage}</span>
              <p className="text-xs text-sky-300/80 leading-relaxed font-medium">
                {getPlainPrediction(summary.next_predicted_stage)}
              </p>
            </div>
          </div>
        </div>

        {/* Automated Defensive Playbook Box */}
        <div className="p-4 rounded-xl bg-cyber-card border border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            Recommended Defensive Response
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {summary.recommended_action}
          </p>
        </div>
      </div>

      {/* Level 3: Progressive Disclosure for Technical Details */}
      <ProgressiveDisclosure
        title="Technical Telemetry, MITRE ATT&CK Mappings & Model Context"
        badge="Level 3 Deep Dive"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[11px] text-slate-300">
          <div className="p-2.5 rounded-lg bg-cyber-card border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Current MITRE Tactic:</span>
            <span className="font-bold text-slate-200">{summary.current_stage_tactic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-cyber-card border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Predicted MITRE Tactic:</span>
            <span className="font-bold text-sky-400">{summary.next_predicted_tactic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-cyber-card border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Engine Status:</span>
            <span className="font-bold text-emerald-400">{summary.system_status}</span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
