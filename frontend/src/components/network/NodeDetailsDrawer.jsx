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
    <div className="p-6 bg-white rounded-2xl border border-soc-slate-200 shadow-xl space-y-6 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-soc-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: typeStyle.bg }}
            />
            <span className="text-xs font-mono font-bold uppercase text-soc-slate-500">
              {node.type} • {node.department}
            </span>
          </div>
          <h3 className="text-lg font-bold text-soc-slate-900 mt-1">{node.label}</h3>
          <p className="text-xs font-mono text-soc-slate-500">{node.ip} • {node.os}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-soc-slate-100 text-soc-slate-400 hover:text-soc-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Risk Gauge Bar */}
      <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-soc-slate-600">Asset Risk Rating:</span>
          <span className={`font-bold px-2 py-0.5 rounded text-xs ${threatStyle.badge}`}>
            {node.risk_score} / 100 ({node.state.toUpperCase()})
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-soc-slate-200 overflow-hidden">
          <div
            className={`h-full ${
              node.risk_score > 75 ? 'bg-soc-threat' : node.risk_score > 40 ? 'bg-amber-500' : 'bg-soc-secure'
            }`}
            style={{ width: `${node.risk_score}%` }}
          />
        </div>
      </div>

      {/* Observed Activity */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-soc-slate-500 block">
          Current Observed Activity:
        </span>
        <div className="p-3 rounded-xl bg-soc-slate-50 border border-soc-slate-200 text-xs text-soc-slate-800 leading-relaxed font-medium">
          {node.observed_activity}
        </div>
      </div>

      {/* Predicted Next Action (Core Innovation) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-indigo-600 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          AI Forecasted Next Action:
        </span>
        <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 font-semibold leading-relaxed">
          {node.predicted_action}
        </div>
      </div>

      {/* Connection & Subnet Context */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-soc-slate-50 border border-soc-slate-200">
          <span className="text-soc-slate-500 block text-[10px]">Active Sockets</span>
          <span className="text-soc-slate-900 font-bold text-sm">{node.active_connections} Streams</span>
        </div>
        <div className="p-3 rounded-xl bg-soc-slate-50 border border-soc-slate-200">
          <span className="text-soc-slate-500 block text-[10px]">In Attack Vector</span>
          <span className={`font-bold text-sm ${node.is_in_attack_path ? 'text-red-600' : 'text-emerald-600'}`}>
            {node.is_in_attack_path ? 'YES (Active)' : 'NO (Isolated)'}
          </span>
        </div>
      </div>

      {/* Proactive Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          onClick={() => alert(`Proactive Quarantine command staged for ${node.id} (${node.ip}).`)}
          className="w-full py-2.5 px-4 rounded-xl bg-soc-navy-900 hover:bg-soc-navy-850 text-white text-xs font-semibold shadow transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          Pre-emptively Isolate Asset ({node.id})
        </button>
      </div>
    </div>
  );
}
