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
    <div className="p-6 bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 rounded-2xl border border-cyber-brown-800 shadow-2xl space-y-6 animate-in slide-in-from-right duration-200 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-cyber-brown-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: typeStyle.bg }}
            />
            <span className="text-xs font-mono font-bold uppercase text-cyber-beige-400">
              {node.type} • {node.department}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{node.label}</h3>
          <p className="text-xs font-mono text-cyber-beige-400">{node.ip} • {node.os}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-cyber-brown-900/80 text-cyber-beige-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Risk Gauge Bar */}
      <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-cyber-beige-300">Asset Risk Rating:</span>
          <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${threatStyle.badge}`}>
            {node.risk_score} / 100 ({node.state.toUpperCase()})
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-cyber-brown-950 overflow-hidden border border-cyber-brown-900">
          <div
            className={`h-full ${
              node.risk_score > 75 ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : node.risk_score > 40 ? 'bg-amber-500' : 'bg-lime-500'
            }`}
            style={{ width: `${node.risk_score}%` }}
          />
        </div>
      </div>

      {/* Observed Activity */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-cyber-beige-400 block">
          Current Observed Activity:
        </span>
        <div className="p-3 rounded-xl bg-cyber-brown-950/80 border border-cyber-brown-800 text-xs text-cyber-beige-200 leading-relaxed font-medium">
          {node.observed_activity}
        </div>
      </div>

      {/* Predicted Next Action (Core Innovation) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-amber-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Neural AI Forecasted Next Action:
        </span>
        <div className="p-3 rounded-xl bg-gradient-to-r from-cyber-brown-900 to-cyber-amber-950 border border-amber-500/40 text-xs text-white font-bold leading-relaxed shadow-md">
          {node.predicted_action}
        </div>
      </div>

      {/* Connection & Subnet Context */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-cyber-black/90 border border-cyber-brown-800">
          <span className="text-cyber-beige-400 block text-[10px]">Active Sockets</span>
          <span className="text-white font-bold text-sm">{node.active_connections} Streams</span>
        </div>
        <div className="p-3 rounded-xl bg-cyber-black/90 border border-cyber-brown-800">
          <span className="text-cyber-beige-400 block text-[10px]">In Attack Vector</span>
          <span className={`font-bold text-sm ${node.is_in_attack_path ? 'text-orange-400' : 'text-lime-400'}`}>
            {node.is_in_attack_path ? 'YES (Active)' : 'NO (Isolated)'}
          </span>
        </div>
      </div>

      {/* Proactive Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          onClick={() => alert(`Proactive Quarantine command staged for ${node.id} (${node.ip}).`)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyber-brown-700 to-amber-700 hover:from-cyber-brown-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all active:scale-95 flex items-center justify-center gap-2 border border-amber-500/30 font-mono"
        >
          <Lock className="w-3.5 h-3.5" />
          Pre-emptively Isolate Asset ({node.id})
        </button>
      </div>
    </div>
  );
}
