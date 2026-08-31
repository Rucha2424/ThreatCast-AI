import React from 'react';
import { X, ShieldAlert, Sparkles, Clock, CheckCircle2, AlertOctagon, Lock, Play } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentDetailsModal({ incident, isOpen, onClose }) {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-soc-navy-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-soc-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-soc-navy-950 to-soc-navy-900 text-white">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-indigo-300 border border-white/20">
                {incident.id}
              </span>
              <StatusBadge status={incident.risk_level} />
              <span className="text-xs font-mono text-soc-slate-400">
                Detected: {incident.detected_at}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1.5">{incident.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-soc-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-soc-slate-50 border border-soc-slate-200">
              <span className="text-soc-slate-500 block text-[10px] uppercase font-bold">Current State</span>
              <span className="text-soc-slate-900 font-bold text-sm">{incident.current_stage}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-indigo-600 block text-[10px] uppercase font-bold">AI Forecasted Vector</span>
              <span className="text-indigo-950 font-bold text-sm truncate block" title={incident.predicted_progression}>
                {incident.predicted_progression}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-soc-slate-50 border border-soc-slate-200">
              <span className="text-soc-slate-500 block text-[10px] uppercase font-bold">Model Confidence</span>
              <span className="text-soc-slate-900 font-bold text-sm">{formatConfidence(incident.model_confidence)}</span>
            </div>
          </div>

          {/* Model vs Rule Status */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                Rule Engine Output: {incident.rule_result}
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-800">
                {incident.has_disagreement ? '⚠ Disagreement Active' : '✓ Agreement'}
              </span>
            </div>
            <p className="text-amber-800/90 leading-relaxed font-medium">
              Targeted Assets: {incident.affected_assets?.join(', ')}
            </p>
          </div>

          {/* Incident Timeline */}
          {incident.timeline && incident.timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-slate-600">
                Forensic Telemetry & Forecast Timeline:
              </h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-soc-slate-200 ml-2">
                {incident.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        item.type === 'forecasted'
                          ? 'bg-soc-ai ring-2 ring-soc-ai/30'
                          : item.type === 'action_taken'
                          ? 'bg-soc-secure'
                          : item.type === 'rule_alert'
                          ? 'bg-amber-500'
                          : 'bg-soc-navy-900'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-soc-slate-500">{item.time}</span>
                      <span className="text-xs font-bold text-soc-slate-900">{item.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                          item.type === 'forecasted'
                            ? 'bg-purple-100 text-purple-700'
                            : item.type === 'action_taken'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-soc-slate-100 text-soc-slate-700'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-soc-slate-600 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Containment Playbook */}
          {incident.containment_playbook && incident.containment_playbook.length > 0 && (
            <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 space-y-2.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-slate-700 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-soc-ai" />
                Automated Containment Playbook:
              </h4>
              <ul className="space-y-1.5 text-xs text-soc-slate-700 font-medium">
                {incident.containment_playbook.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-soc-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-soc-secure mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-soc-slate-50 border-t border-soc-slate-200">
          <span className="text-xs font-mono text-soc-slate-500">
            Playbook Status: Ready for execution
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-soc-slate-300 text-xs font-medium text-soc-slate-700 hover:bg-soc-slate-100 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert(`Triggered proactive containment playbook for ${incident.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-soc-navy-900 hover:bg-soc-navy-850 text-white text-xs font-semibold shadow transition-all active:scale-95"
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
