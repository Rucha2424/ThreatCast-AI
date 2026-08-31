import React from 'react';
import { X, ShieldAlert, Sparkles, Clock, CheckCircle2, AlertOctagon, Lock, Play } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentDetailsModal({ incident, isOpen, onClose }) {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyber-obsidian/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-gradient-to-b from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 rounded-2xl shadow-2xl border border-cyber-maroon-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-cyber-maroon-900 via-cyber-black to-cyber-burgundy-950 text-white border-b border-cyber-maroon-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/50">
                {incident.id}
              </span>
              <StatusBadge status={incident.risk_level} />
              <span className="text-xs font-mono text-cyber-grey-400">
                Detected: {incident.detected_at}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1.5">{incident.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cyber-maroon-900/60 text-cyber-grey-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
              <span className="text-cyber-grey-400 block text-[10px] uppercase font-bold">Current State</span>
              <span className="text-white font-bold text-sm">{incident.current_stage}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyber-maroon-900 to-cyber-burgundy-900 border border-rose-600/40">
              <span className="text-rose-300 block text-[10px] uppercase font-bold">AI Forecasted Vector</span>
              <span className="text-white font-bold text-sm truncate block" title={incident.predicted_progression}>
                {incident.predicted_progression}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800">
              <span className="text-cyber-grey-400 block text-[10px] uppercase font-bold">Model Confidence</span>
              <span className="text-rose-400 font-bold text-sm">{formatConfidence(incident.model_confidence)}</span>
            </div>
          </div>

          {/* Model vs Rule Status */}
          <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-700/60 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Rule Engine Output: {incident.rule_result}
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-300">
                {incident.has_disagreement ? '⚠ Disagreement Active' : '✓ Agreement'}
              </span>
            </div>
            <p className="text-cyber-grey-300 leading-relaxed font-medium">
              Targeted Assets: {incident.affected_assets?.join(', ')}
            </p>
          </div>

          {/* Incident Timeline */}
          {incident.timeline && incident.timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-grey-400">
                Forensic Telemetry & Forecast Timeline:
              </h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-cyber-maroon-800 ml-2">
                {incident.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-cyber-black ${
                        item.type === 'forecasted'
                          ? 'bg-rose-500 ring-2 ring-rose-500/40 shadow-[0_0_8px_#f43f5e]'
                          : item.type === 'action_taken'
                          ? 'bg-emerald-500'
                          : item.type === 'rule_alert'
                          ? 'bg-amber-500'
                          : 'bg-cyber-maroon-600'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-cyber-grey-400">{item.time}</span>
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                          item.type === 'forecasted'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                            : item.type === 'action_taken'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : 'bg-cyber-maroon-900 text-cyber-grey-300'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-cyber-grey-300 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Containment Playbook */}
          {incident.containment_playbook && incident.containment_playbook.length > 0 && (
            <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800 space-y-2.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Automated Containment Playbook:
              </h4>
              <ul className="space-y-1.5 text-xs text-cyber-grey-200 font-medium">
                {incident.containment_playbook.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-cyber-maroon-950/80 border border-cyber-maroon-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-cyber-black border-t border-cyber-maroon-800">
          <span className="text-xs font-mono text-cyber-grey-400">
            Playbook Status: Ready for execution
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-cyber-maroon-700 text-xs font-bold text-cyber-grey-300 hover:bg-cyber-maroon-900/60 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert(`Triggered proactive containment playbook for ${incident.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-maroon-700 to-rose-700 hover:from-cyber-maroon-600 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all active:scale-95 border border-rose-500/30"
            >
              <Lock className="w-3.5 h-3.5" />
              Execute Playbook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
