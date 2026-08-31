import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentTable({ incidents = [], onSelectIncident }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-soc-slate-200 text-soc-slate-500 text-xs">
        No active incidents tracked in this filter range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-soc-slate-200 bg-white shadow-soc-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-soc-slate-50/80 border-b border-soc-slate-200 text-soc-slate-500 font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-semibold">Incident ID</th>
            <th className="py-3 px-4 font-semibold">Detected</th>
            <th className="py-3 px-4 font-semibold">Attack Stage</th>
            <th className="py-3 px-4 font-semibold">Affected Assets</th>
            <th className="py-3 px-4 font-semibold">Risk Level</th>
            <th className="py-3 px-4 font-semibold">K=3 Forecast</th>
            <th className="py-3 px-4 font-semibold">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-soc-slate-100">
          {incidents.map((inc) => (
            <tr
              key={inc.id}
              onClick={() => onSelectIncident && onSelectIncident(inc)}
              className="cursor-pointer hover:bg-soc-slate-50/80 transition-colors group"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-soc-navy-900 group-hover:text-soc-ai">
                {inc.id}
              </td>
              <td className="py-3.5 px-4 font-mono text-soc-slate-500">{inc.detected_at}</td>
              <td className="py-3.5 px-4 font-medium text-soc-slate-900">{inc.current_stage}</td>
              <td className="py-3.5 px-4 font-mono text-soc-slate-600 truncate max-w-[140px]">
                {inc.affected_assets?.join(', ')}
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={inc.risk_level} />
              </td>
              <td className="py-3.5 px-4 font-mono text-indigo-900 font-semibold truncate max-w-[180px]">
                {inc.predicted_progression}
              </td>
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    inc.status === 'Forecasted'
                      ? 'bg-purple-100 text-purple-800'
                      : inc.status === 'Investigating'
                      ? 'bg-amber-100 text-amber-800'
                      : inc.status === 'Contained'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {inc.status}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button className="p-1 rounded-lg hover:bg-soc-slate-200 text-soc-slate-400 group-hover:text-soc-ai">
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
