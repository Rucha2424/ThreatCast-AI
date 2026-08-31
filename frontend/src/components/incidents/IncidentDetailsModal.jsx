import React from 'react';
import { X, ShieldAlert, Sparkles, Clock, CheckCircle2, AlertOctagon, Lock, Play } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentDetailsModal({ incident, isOpen, onClose }) {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-[#ebdcc7] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#fcfaf7] border-b border-[#ebdcc7]">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                {incident.id}
              </span>
              <StatusBadge status={incident.risk_level} />
              <span className="text-xs font-mono text-[#7a644c]">
                Detected: {incident.detected_at}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#221207] mt-1.5">{incident.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
              <span className="text-[#7a644c] block text-[10px] uppercase font-bold">Current State</span>
              <span className="text-[#221207] font-bold text-sm">{incident.current_stage}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a]">
              <span className="text-[#b45309] block text-[10px] uppercase font-bold">AI Forecasted Vector</span>
              <span className="text-[#78350f] font-bold text-sm truncate block" title={incident.predicted_progression}>
                {incident.predicted_progression}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7]">
              <span className="text-[#7a644c] block text-[10px] uppercase font-bold">Model Confidence</span>
              <span className="text-[#b45309] font-bold text-sm">{formatConfidence(incident.model_confidence)}</span>
            </div>
          </div>

          {/* Model vs Rule Status */}
          <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#b45309] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                Rule Engine Output: {incident.rule_result}
              </span>
              <span className="font-mono text-[11px] font-bold text-[#b45309]">
                {incident.has_disagreement ? '⚠ Disagreement Active' : '✓ Agreement'}
              </span>
            </div>
            <p className="text-[#544230] leading-relaxed font-medium">
              Targeted Assets: {incident.affected_assets?.join(', ')}
            </p>
          </div>

          {/* Incident Timeline */}
          {incident.timeline && incident.timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7a644c]">
                Forensic Telemetry & Forecast Timeline:
              </h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-[#ebdcc7] ml-2">
                {incident.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        item.type === 'forecasted'
                          ? 'bg-[#f59e0b]'
                          : item.type === 'action_taken'
                          ? 'bg-[#65a30d]'
                          : item.type === 'rule_alert'
                          ? 'bg-[#ea580c]'
                          : '#998165'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#7a644c]">{item.time}</span>
                      <span className="text-xs font-bold text-[#221207]">{item.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                          item.type === 'forecasted'
                            ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                            : item.type === 'action_taken'
                            ? 'bg-[#f7fee7] text-[#4d7c0f] border border-[#d9f99d]'
                            : 'bg-[#f5efe6] text-[#544230]'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#544230] mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Containment Playbook */}
          {incident.containment_playbook && incident.containment_playbook.length > 0 && (
            <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#b45309] flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-[#d97706]" />
                Automated Containment Playbook:
              </h4>
              <ul className="space-y-1.5 text-xs text-[#42240f] font-medium">
                {incident.containment_playbook.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#ebdcc7]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#65a30d] mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#fcfaf7] border-t border-[#ebdcc7]">
          <span className="text-xs font-mono text-[#7a644c]">
            Playbook Status: Ready for execution
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#ebdcc7] text-xs font-bold text-[#544230] hover:bg-[#f5efe6] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert(`Triggered proactive containment playbook for ${incident.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 font-mono"
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
