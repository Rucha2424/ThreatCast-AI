import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Clock, AlertOctagon, Zap, ShieldCheck } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import InfoTooltip from '../common/InfoTooltip';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function SecurityStatusHero({ summary }) {
  if (!summary) return null;

  const isCritical = summary.threat_level === 'CRITICAL';

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
      className="relative overflow-hidden rounded-2xl bg-white text-[#301a0a] p-6 md:p-8 shadow-xs border border-[#ebdcc7] space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        {/* Left: Executive Posture & Attack Narrative */}
        <div className="space-y-4 max-w-2xl flex-1">
          {/* Top Posture Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase border shadow-2xs ${
                isCritical
                  ? 'bg-[#ffedd5] text-[#c2410c] border-[#fdba74]'
                  : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[#ea580c]' : 'bg-[#d97706]'}`} />
              Threat Level: {summary.threat_level} ({summary.threat_score}/100)
            </span>

            <span className="inline-flex items-center gap-1 text-xs text-[#7a644c] font-mono">
              <Clock className="w-3.5 h-3.5 text-[#b45309]" />
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
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#221207] flex items-center gap-2">
              Network Security Posture & Forecast
            </h2>
            <p className="text-xs md:text-sm text-[#544230] mt-1 leading-relaxed">
              ThreatCast AI is tracking active network states and forecasting where the adversary is likely to move next.
            </p>
          </div>

          {/* Current State -> Predicted Next Stage Flow */}
          <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-3 shadow-2xs">
            <div className="text-[11px] uppercase tracking-wider text-[#7a644c] font-bold flex items-center justify-between font-mono">
              <span>Attack Progression Vector</span>
              <span className="text-[#b45309] font-mono text-[11px] font-bold bg-[#fef3c7] px-2 py-0.5 rounded border border-[#fde68a]">
                AI Confidence: {formatConfidence(summary.forecast_confidence)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Observed State */}
              <div className="p-3.5 rounded-lg bg-white border border-[#ebdcc7] space-y-1">
                <span className="text-[10px] text-[#c2410c] block font-mono font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />
                  CURRENT (Observed)
                </span>
                <span className="text-sm font-bold text-[#221207] block">{summary.current_stage}</span>
                <p className="text-xs text-[#544230] leading-relaxed">
                  {getPlainDescription(summary.current_stage)}
                </p>
              </div>

              {/* Predicted State */}
              <div className="p-3.5 rounded-lg bg-[#fffbeb] border border-[#fde68a] space-y-1 shadow-xs">
                <span className="text-[10px] text-[#b45309] block font-mono font-bold uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                  PREDICTED NEXT (T+1)
                </span>
                <span className="text-sm font-bold text-[#78350f] block">{summary.next_predicted_stage}</span>
                <p className="text-xs text-[#42240f] leading-relaxed font-medium">
                  {getPlainPrediction(summary.next_predicted_stage)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actionable Defense Playbook */}
        <div className="lg:max-w-md w-full p-5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] flex flex-col justify-between space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#b45309] flex items-center gap-1.5 font-mono">
                <AlertOctagon className="w-4 h-4 text-[#d97706]" />
                Recommended Defensive Response
              </span>
              <span className="text-[10px] font-mono text-[#7a644c]">Automated Playbook</span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-[#ebdcc7] space-y-1.5 text-xs text-[#42240f]">
              <strong className="text-[#221207] block">Immediate Containment Action:</strong>
              <p className="leading-relaxed font-medium">{summary.recommended_action}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Link
              to="/forecast"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 font-mono"
            >
              View K=3 Forecast
            </Link>
            <Link
              to="/network-graph"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-white hover:bg-[#f5efe6] text-[#42240f] text-xs font-bold border border-[#ebdcc7] transition-colors font-mono"
            >
              Investigate Topology
            </Link>
          </div>
        </div>
      </div>

      {/* Level 3: Progressive Disclosure for Technical Details */}
      <ProgressiveDisclosure
        title="Technical Telemetry, MITRE ATT&CK Mappings & Model Context"
        badge="Level 3 Deep Dive"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[11px] text-[#544230]">
          <div className="p-2.5 rounded-lg bg-[#fcfaf7] border border-[#ebdcc7]">
            <span className="text-[#7a644c] block text-[10px]">Current MITRE Tactic:</span>
            <span className="font-bold text-[#221207]">{summary.current_stage_tactic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#fcfaf7] border border-[#ebdcc7]">
            <span className="text-[#7a644c] block text-[10px]">Predicted MITRE Tactic:</span>
            <span className="font-bold text-[#b45309]">{summary.next_predicted_tactic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#fcfaf7] border border-[#ebdcc7]">
            <span className="text-[#7a644c] block text-[10px]">Engine Status:</span>
            <span className="font-bold text-[#221207]">{summary.system_status}</span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
