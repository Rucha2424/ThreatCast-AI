import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence } from '../../utils/formatters';

export default function IncidentTable({ incidents = [], onSelectIncident }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-cyber-brown-950/80 rounded-2xl border border-cyber-brown-800 text-cyber-beige-400 text-xs">
        No active incidents tracked in this filter range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cyber-brown-800 bg-cyber-black shadow-2xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-cyber-brown-950 border-b border-cyber-brown-800 text-cyber-beige-400 font-mono uppercase text-[10px] tracking-wider">
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
        <tbody className="divide-y divide-cyber-brown-900/60 font-mono">
          {incidents.map((inc) => (
            <tr
              key={inc.id}
              onClick={() => onSelectIncident && onSelectIncident(inc)}
              className="cursor-pointer hover:bg-cyber-brown-950/60 transition-colors group"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-amber-400 group-hover:text-amber-300">
                {inc.id}
              </td>
              <td className="py-3.5 px-4 font-mono text-cyber-beige-400">{inc.detected_at}</td>
              <td className="py-3.5 px-4 font-bold text-white font-sans">{inc.current_stage}</td>
              <td className="py-3.5 px-4 font-mono text-cyber-beige-300 truncate max-w-[140px]">
                {inc.affected_assets?.join(', ')}
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={inc.risk_level} />
              </td>
              <td className="py-3.5 px-4 font-mono text-amber-300 font-bold truncate max-w-[180px]">
                {inc.predicted_progression}
              </td>
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    inc.status === 'Forecasted'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                      : inc.status === 'Investigating'
                      ? 'bg-orange-950 text-orange-300 border border-orange-600/50'
                      : inc.status === 'Contained'
                      ? 'bg-cyber-brown-900 text-cyber-beige-200 border border-cyber-brown-700'
                      : 'bg-lime-950 text-lime-300 border border-lime-600/50'
                  }`}
                >
                  {inc.status}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button className="p-1.5 rounded-lg hover:bg-cyber-brown-800 text-cyber-beige-400 group-hover:text-white transition-colors">
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
