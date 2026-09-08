import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Sparkles,
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
  Lock,
  AlertOctagon,
  Info,
  CheckCircle,
} from 'lucide-react';
import { getNodeTypeStyle, getThreatLevelColor } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';
import InfoTooltip from '../common/InfoTooltip';

export default function NodeDetailsDrawer({ node, onClose }) {
  const [isolated, setIsolated] = useState(false);

  if (!node) return null;

  const isCompromised = node.state === 'compromised';
  const isSuspicious = node.state === 'suspicious';

  const typeStyle = getNodeTypeStyle(node.type);
  const threatStyle = getThreatLevelColor(
    node.risk_score > 75 ? 'CRITICAL' : node.risk_score > 40 ? 'HIGH' : 'LOW'
  );

  const getWhyItMatters = () => {
    if (isCompromised) {
      return 'This system is actively compromised and serving as the primary pivot point for the adversary to launch lateral movement probes.';
    }
    if (isSuspicious) {
      return 'This system is exhibiting anomalous connection attempts and is situated directly in the predicted attack path.';
    }
    return 'This asset is currently functioning within normal behavioral baselines with no active anomalous activity detected.';
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-[#ebdcc7] shadow-lg space-y-5 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#ebdcc7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: typeStyle.bg }}
            />
            <span className="text-xs font-mono font-bold uppercase text-[#7a644c]">
              {node.type} • {node.department}
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#221207] mt-1">{node.label}</h3>
          <p className="text-xs font-mono text-[#7a644c]">
            {node.ip} • {node.os}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Current Status & Risk Score */}
      <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#544230] flex items-center gap-1.5">
            <span>Asset Threat Status:</span>
            <InfoTooltip
              title="Asset Risk Rating"
              whatItMeasures="Composite score (0-100) based on abnormal telemetry, process anomalies, and topological centrality."
              whyItMatters="High-risk nodes threaten adjacent connected systems and require containment."
              interpretation="Scores above 75 indicate confirmed compromise or immediate vulnerability."
              size="xs"
            />
          </span>
          <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${threatStyle.badge}`}>
            {node.risk_score} / 100 ({node.state.toUpperCase()})
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#f5efe6] overflow-hidden border border-[#ded0bc]">
          <div
            className={`h-full transition-all duration-500 ${
              node.risk_score > 75 ? 'bg-[#ea580c]' : node.risk_score > 40 ? 'bg-[#d97706]' : 'bg-[#65a30d]'
            }`}
            style={{ width: `${node.risk_score}%` }}
          />
        </div>
      </div>

      {/* 2. Why Does This Node Matter? */}
      <div className="p-3.5 rounded-xl bg-[#fffdfa] border border-[#ebdcc7] space-y-1">
        <span className="text-[10px] font-mono uppercase font-bold text-[#b45309] block">
          Security Significance:
        </span>
        <p className="text-xs text-[#544230] leading-relaxed font-medium">
          {getWhyItMatters()}
        </p>
      </div>

      {/* 3. Observed Activity */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-[#7a644c] block">
          Current Observed Activity:
        </span>
        <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs text-[#42240f] leading-relaxed font-medium">
          {node.observed_activity}
        </div>
      </div>

      {/* 4. Predicted Next Action (AI Forecast) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-[#b45309] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
          ThreatCast AI Forecasted Next Step:
        </span>
        <div className="p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] font-bold leading-relaxed shadow-2xs">
          {node.predicted_action}
        </div>
      </div>

      {/* 5. Recommended Defense Actions */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-mono uppercase font-bold text-[#7a644c] flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-[#b45309]" />
          Recommended Response Action:
        </span>

        {isolated ? (
          <div className="p-3 rounded-xl bg-[#f7fee7] border border-[#d9f99d] flex items-center gap-2 text-xs text-[#3f6212] font-semibold">
            <CheckCircle className="w-4 h-4 text-[#65a30d]" />
            <span>Asset {node.id} is currently quarantined from the network.</span>
          </div>
        ) : (
          <button
            onClick={() => setIsolated(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 font-mono"
          >
            <Lock className="w-3.5 h-3.5" />
            Pre-Emptively Quarantine Asset ({node.id})
          </button>
        )}
      </div>

      {/* Level 3: Progressive Disclosure for Technical Telemetry */}
      <ProgressiveDisclosure
        title="Technical Telemetry & Network Identity"
        badge="Evidence"
        defaultOpen={false}
      >
        <div className="space-y-2 font-mono text-[11px] text-[#544230]">
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">IP Address:</span>
            <span className="font-bold text-[#221207]">{node.ip}</span>
          </div>
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">Operating System:</span>
            <span className="font-bold text-[#221207]">{node.os}</span>
          </div>
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">Active Socket Streams:</span>
            <span className="font-bold text-[#221207]">{node.active_connections}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[#7a644c]">Attack Trajectory Vector:</span>
            <span className={`font-bold ${node.is_in_attack_path ? 'text-[#ea580c]' : 'text-[#65a30d]'}`}>
              {node.is_in_attack_path ? 'Active in Trajectory' : 'Normal / Isolated'}
            </span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
