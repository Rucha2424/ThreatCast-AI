import React from 'react';
import { X, ShieldAlert, Sparkles, Clock, CheckCircle2, AlertOctagon, Lock, Play } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentDetailsModal({ incident, isOpen, onClose }) {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-cyber-surface rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-cyber-card border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {incident.id}
              </span>
              <StatusBadge status={incident.risk_level} />
              <span className="text-xs font-mono text-slate-400">
                Detected: {incident.detected_at}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1.5">{incident.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Current State</span>
              <span className="text-white font-bold text-sm">{incident.current_stage}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
              <span className="text-sky-400 block text-[10px] uppercase font-bold">AI Forecasted Vector</span>
              <span className="text-sky-200 font-bold text-sm truncate block" title={incident.predicted_progression}>
                {incident.predicted_progression}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Model Confidence</span>
              <span className="text-sky-400 font-bold text-sm">{formatConfidence(incident.model_confidence)}</span>
            </div>
          </div>

          {/* Model vs Rule Status */}
          <div className="p-4 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Rule Engine Output: {incident.rule_result}
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-400">
                {incident.has_disagreement ? '⚠ Disagreement Active' : '✓ Agreement'}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              Targeted Assets: {incident.affected_assets?.join(', ')}
            </p>
          </div>

          {/* Incident Timeline */}
          {incident.timeline && incident.timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Forensic Telemetry & Forecast Timeline:
              </h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
                {incident.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                        item.type === 'observed' ? 'bg-rose-500' : 'bg-sky-400'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">{item.time}</span>
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                          item.type === 'observed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Containment Playbook */}
          {incident.containment_playbook && incident.containment_playbook.length > 0 && (
            <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-sky-400" />
                Automated Containment Playbook:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200 font-medium">
                {incident.containment_playbook.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-cyber-surface border border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-cyber-card border-t border-slate-800">
          <span className="text-xs font-mono text-slate-400">
            Playbook Status: Ready for execution
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert(`Triggered proactive containment playbook for ${incident.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-95 font-mono"
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
