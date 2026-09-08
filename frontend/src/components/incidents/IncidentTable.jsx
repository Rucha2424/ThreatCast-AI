import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentTable({ incidents = [], onSelectIncident }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-cyber-surface rounded-2xl border border-slate-800 text-slate-400 text-xs">
        No active incidents tracked in this filter range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-cyber-surface shadow-soc-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-cyber-card border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-bold">Incident ID</th>
            <th className="py-3 px-4 font-bold">Detected</th>
            <th className="py-3 px-4 font-bold">Attack Stage</th>
            <th className="py-3 px-4 font-bold">Affected Assets</th>
            <th className="py-3 px-4 font-bold">Risk Level</th>
            <th className="py-3 px-4 font-bold">K=3 Forecast</th>
            <th className="py-3 px-4 font-bold">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 font-mono">
          {incidents.map((inc) => (
            <tr
              key={inc.id}
              onClick={() => onSelectIncident && onSelectIncident(inc)}
              className="cursor-pointer hover:bg-slate-800/40 transition-colors group"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-sky-400 group-hover:text-sky-300">
                {inc.id}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-400">{inc.detected_at}</td>
              <td className="py-3.5 px-4 font-bold text-white font-sans">{inc.current_stage}</td>
              <td className="py-3.5 px-4 font-mono text-slate-300 truncate max-w-[140px]">
                {inc.affected_assets?.join(', ')}
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={inc.risk_level} />
              </td>
              <td className="py-3.5 px-4 font-mono text-sky-400 font-bold truncate max-w-[180px]">
                {inc.predicted_progression}
              </td>
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    inc.status === 'Active'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {inc.status}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
