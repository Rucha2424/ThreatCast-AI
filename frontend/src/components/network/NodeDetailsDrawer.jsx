import React from 'react';
import { X, ShieldAlert, Sparkles, Server, Activity, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { getNodeTypeStyle, getThreatLevelColor } from '../../utils/formatters';

export default function NodeDetailsDrawer({ node, onClose }) {
  if (!node) return null;

  const typeStyle = getNodeTypeStyle(node.type);
  const threatStyle = getThreatLevelColor(
    node.risk_score > 75 ? 'CRITICAL' : node.risk_score > 40 ? 'HIGH' : 'LOW'
  );

  return (
    <div className="p-6 bg-white rounded-2xl border border-[#ebdcc7] shadow-xs space-y-6 animate-in slide-in-from-right duration-200">
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
          <p className="text-xs font-mono text-[#7a644c]">{node.ip} • {node.os}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Risk Gauge Bar */}
      <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#544230]">Asset Risk Rating:</span>
          <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${threatStyle.badge}`}>
            {node.risk_score} / 100 ({node.state.toUpperCase()})
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#f5efe6] overflow-hidden border border-[#ded0bc]">
          <div
            className={`h-full ${
              node.risk_score > 75 ? 'bg-[#ea580c]' : node.risk_score > 40 ? 'bg-[#d97706]' : 'bg-[#65a30d]'
            }`}
            style={{ width: `${node.risk_score}%` }}
          />
        </div>
      </div>

      {/* Observed Activity */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-[#7a644c] block">
          Current Observed Activity:
        </span>
        <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs text-[#42240f] leading-relaxed font-medium">
          {node.observed_activity}
        </div>
      </div>

      {/* Predicted Next Action (Core Innovation) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-[#b45309] flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
          Neural AI Forecasted Next Action:
        </span>
        <div className="p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] font-bold leading-relaxed shadow-2xs">
          {node.predicted_action}
        </div>
      </div>

      {/* Connection & Subnet Context */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
          <span className="text-[#7a644c] block text-[10px]">Active Sockets</span>
          <span className="text-[#221207] font-bold text-sm">{node.active_connections} Streams</span>
        </div>
        <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
          <span className="text-[#7a644c] block text-[10px]">In Attack Vector</span>
          <span className={`font-bold text-sm ${node.is_in_attack_path ? 'text-[#ea580c]' : 'text-[#65a30d]'}`}>
            {node.is_in_attack_path ? 'YES (Active)' : 'NO (Isolated)'}
          </span>
        </div>
      </div>

      {/* Proactive Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          onClick={() => alert(`Proactive Quarantine command staged for ${node.id} (${node.ip}).`)}
          className="w-full py-2.5 px-4 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 font-mono"
        >
          <Lock className="w-3.5 h-3.5" />
          Pre-emptively Isolate Asset ({node.id})
        </button>
      </div>
    </div>
  );
}
