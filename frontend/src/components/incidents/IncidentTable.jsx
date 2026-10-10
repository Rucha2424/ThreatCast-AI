import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

import StatusBadge from '../common/StatusBadge';

export default function IncidentTable({
  incidents = [],
  onSelectIncident,
}) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-12 text-center bg-threatcast-card rounded-2xl border border-tc-border shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-threatcast-card border border-tc-border flex items-center justify-center text-threatcast-cyan mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-threatcast-text">No persistent incidents are currently stored.</h3>
        <p className="text-xs text-threatcast-muted max-w-md mx-auto">
          The persistent Neo4j pipeline is connected (0 Incident Records). The CTU13 dataset pipeline currently has no Incident nodes stored in the database.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    if (status === 'Contained' || status === 'Resolved') {
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    }

    if (status === 'Investigating') {
      return <AlertTriangle className="w-3.5 h-3.5" />;
    }

    return <ShieldAlert className="w-3.5 h-3.5" />;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-tc-border bg-threatcast-card shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-threatcast-card border-b border-tc-border text-threatcast-muted font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-bold">Incident ID</th>
            <th className="py-3 px-4 font-bold">Detected</th>
            <th className="py-3 px-4 font-bold">Assessment</th>
            <th className="py-3 px-4 font-bold">Affected Assets</th>
            <th className="py-3 px-4 font-bold">Risk Level</th>
            <th className="py-3 px-4 font-bold">ML Signal</th>
            <th className="py-3 px-4 font-bold">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-tc-border font-mono">
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              onClick={() =>
                onSelectIncident && onSelectIncident(incident)
              }
              className="cursor-pointer hover:bg-threatcast-card transition-colors group"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-threatcast-cyan group-hover:text-threatcast-cyan">
                {incident.id}
              </td>

              <td className="py-3.5 px-4 text-threatcast-muted">
                {incident.detected_at}
              </td>

              <td className="py-3.5 px-4 font-bold text-threatcast-text font-sans">
                {incident.current_stage || 'Early-Warning Assessment'}
              </td>

              <td className="py-3.5 px-4 text-threatcast-silver truncate max-w-[180px]">
                {incident.affected_assets?.length
                  ? incident.affected_assets.join(', ')
                  : 'Not attributed'}
              </td>

              <td className="py-3.5 px-4">
                <StatusBadge status={incident.risk_level} />
              </td>

              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1.5 text-threatcast-cyan font-bold">
                  {getStatusIcon(incident.status)}
                  {incident.predicted_progression ||
                    'Early-warning signal'}
                </span>
              </td>

              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    incident.status === 'Forecasted'
                      ? 'bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber'
                      : incident.status === 'Investigating'
                      ? 'bg-threatcast-elevated text-threatcast-amber border border-threatcast-red'
                      : incident.status === 'Contained'
                      ? 'bg-threatcast-elevated text-threatcast-silver border border-tc-border'
                      : 'bg-threatcast-elevated text-threatcast-green border border-tc-border'
                  }`}
                >
                  {incident.status || 'Unknown'}
                </span>
              </td>

              <td className="py-3.5 px-4 text-right">
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-threatcast-elevated text-threatcast-muted group-hover:text-threatcast-text transition-colors"
                >
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