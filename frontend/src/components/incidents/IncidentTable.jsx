import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentTable({ incidents = [], onSelectIncident }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#ebdcc7] text-[#7a644c] text-xs">
        No active incidents tracked in this filter range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#ebdcc7] bg-white shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#fcfaf7] border-b border-[#ebdcc7] text-[#7a644c] font-mono uppercase text-[10px] tracking-wider">
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
        <tbody className="divide-y divide-[#f5efe6] font-mono">
          {incidents.map((inc) => (
            <tr
              key={inc.id}
              onClick={() => onSelectIncident && onSelectIncident(inc)}
              className="cursor-pointer hover:bg-[#fcfaf7] transition-colors group"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-[#b45309] group-hover:text-[#92400e]">
                {inc.id}
              </td>
              <td className="py-3.5 px-4 font-mono text-[#7a644c]">{inc.detected_at}</td>
              <td className="py-3.5 px-4 font-bold text-[#221207] font-sans">{inc.current_stage}</td>
              <td className="py-3.5 px-4 font-mono text-[#544230] truncate max-w-[140px]">
                {inc.affected_assets?.join(', ')}
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={inc.risk_level} />
              </td>
              <td className="py-3.5 px-4 font-mono text-[#b45309] font-bold truncate max-w-[180px]">
                {inc.predicted_progression}
              </td>
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    inc.status === 'Forecasted'
                      ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                      : inc.status === 'Investigating'
                      ? 'bg-[#ffedd5] text-[#ea580c] border border-[#fdba74]'
                      : inc.status === 'Contained'
                      ? 'bg-[#f5efe6] text-[#544230] border border-[#ded0bc]'
                      : 'bg-[#f7fee7] text-[#4d7c0f] border border-[#d9f99d]'
                  }`}
                >
                  {inc.status}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] group-hover:text-[#221207] transition-colors">
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
