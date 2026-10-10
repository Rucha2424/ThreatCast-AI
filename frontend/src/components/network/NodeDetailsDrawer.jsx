import React from 'react';
import { X, ShieldAlert, Sparkles, Server, Activity, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { getNodeTypeStyle, getThreatLevelColor } from '../../utils/formatters';

export default function NodeDetailsDrawer({ node, onClose }) {
  if (!node) return null;

  const riskScore = Number.isFinite(Number(node.risk_score)) ? Number(node.risk_score) : 0;
  // PCAP-derived graph nodes do not necessarily include every display field.
  // Normalize before formatting so selecting a healthy node remains safe.
  const nodeState = String(node.state ?? 'normal').toUpperCase();
  const nodeType = String(node.type ?? 'asset');
  const typeStyle = getNodeTypeStyle(node.type);
  const threatStyle = getThreatLevelColor(
    riskScore > 75 ? 'CRITICAL' : riskScore > 40 ? 'HIGH' : 'LOW'
  );

  return (
    <div className="p-6 bg-threatcast-card rounded-2xl border border-tc-border shadow-xs space-y-6 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-tc-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: typeStyle.bg }}
            />
            <span className="text-xs font-mono font-bold uppercase text-threatcast-muted">
              {nodeType} • {node.department || 'Unassigned'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-threatcast-text mt-1">{node.label || node.id || 'Unnamed asset'}</h3>
          <p className="text-xs font-mono text-threatcast-muted">{node.ip || 'IP unavailable'} • {node.os || 'OS unavailable'}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-threatcast-elevated text-threatcast-muted hover:text-threatcast-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Risk Gauge Bar */}
      <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-threatcast-silver">Asset Risk Rating:</span>
          <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${threatStyle.badge}`}>
            {riskScore} / 100 ({nodeState})
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-threatcast-elevated overflow-hidden border border-tc-border">
          <div
            className={`h-full ${
              riskScore > 75 ? 'bg-threatcast-amber' : riskScore > 40 ? 'bg-threatcast-cyan' : 'bg-threatcast-green'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
          />
        </div>
      </div>

      {/* Observed Activity */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-threatcast-muted block">
          Current Observed Activity:
        </span>
        <div className="p-3 rounded-xl bg-threatcast-card border border-tc-border text-xs text-threatcast-text leading-relaxed font-medium">
          {node.observed_activity || 'No activity telemetry is available for this node.'}
        </div>
      </div>

      {/* Topological Action Context */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase font-bold text-threatcast-cyan flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-threatcast-cyan" />
          Topological Action Context:
        </span>
        <div className="p-3 rounded-xl bg-threatcast-elevated border border-threatcast-amber text-xs text-threatcast-cyan font-bold leading-relaxed shadow-2xs">
          {node.predicted_action || 'No action is currently predicted for this node.'}
        </div>
      </div>

      {/* Connection & Subnet Context */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-threatcast-card border border-tc-border">
          <span className="text-threatcast-muted block text-[10px]">Active Sockets</span>
          <span className="text-threatcast-text font-bold text-sm">{Number(node.active_connections) || 0} Streams</span>
        </div>
        <div className="p-3 rounded-xl bg-threatcast-card border border-tc-border">
          <span className="text-threatcast-muted block text-[10px]">In Attack Vector</span>
          <span className={`font-bold text-sm ${node.is_in_attack_path ? 'text-threatcast-amber' : 'text-threatcast-green'}`}>
            {node.is_in_attack_path ? 'YES (Active)' : 'NO (Isolated)'}
          </span>
        </div>
      </div>

      {/* Proactive Action Notice */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="w-full py-2.5 px-4 rounded-xl bg-threatcast-card border border-tc-border text-threatcast-muted text-[11px] font-mono flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-threatcast-muted" />
          <span>Asset isolation is not driven by aggregate CTU13 LSTM state model</span>
        </div>
      </div>
    </div>
  );
}
