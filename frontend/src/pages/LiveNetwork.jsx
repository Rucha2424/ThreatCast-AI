import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Radio, Filter, Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import NetworkTrafficChart from '../components/charts/NetworkTrafficChart';
import AuthActivityChart from '../components/charts/AuthActivityChart';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import { useNetworkGraph } from '../hooks/useNetworkGraph';
import { useEvents } from '../hooks/useEvents';

export default function LiveNetwork() {
  const { refreshTrigger } = useOutletContext() || {};

  const [riskFilter, setRiskFilter] = useState('');
  const [tacticFilter, setTacticFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { activity, loading: actLoading, error: actError, refetch: refetchAct } = useNetworkGraph();
  const { eventsData, loading: evtLoading, error: evtError, refetch: refetchEvt } = useEvents({
    risk_level: riskFilter || undefined,
    tactic: tacticFilter || undefined,
  });

  useEffect(() => {
    if (refreshTrigger) {
      refetchAct();
      refetchEvt();
    }
  }, [refreshTrigger, refetchAct, refetchEvt]);

  const loading = actLoading || evtLoading;
  const error = actError || evtError;

  if (loading && !activity && !eventsData) {
    return <LoadingState message="Streaming live network telemetry & flow records..." />;
  }

  if (error && !activity && !eventsData) {
    return (
      <ErrorState
        title="Failed to Stream Network Telemetry"
        message={error}
        onRetry={() => {
          refetchAct();
          refetchEvt();
        }}
      />
    );
  }

  const rawEvents = eventsData?.events || [];
  const filteredEvents = rawEvents.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.source_entity.toLowerCase().includes(q) ||
      e.destination_entity.toLowerCase().includes(q) ||
      e.event_type.toLowerCase().includes(q) ||
      e.tactic.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Live Network Observability & Telemetry"
        subtitle="Real-time flow telemetry, authentication dynamics, and MITRE ATT&CK mapped security event stream."
        badge="Live Telemetry"
      />

      {/* Telemetry Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkTrafficChart trafficSeries={activity?.traffic_series} />
        <AuthActivityChart authSeries={activity?.auth_series} />
      </div>

      <RiskTrendChart riskTrend={activity?.risk_trend} />

      {/* Security Event Telemetry Log */}
      <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-soc-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-soc-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-soc-ai" />
              Live Security Telemetry Log
            </h3>
            <p className="text-xs text-soc-slate-500">
              Raw network events annotated with MITRE ATT&CK taxonomy & forecast trigger flags.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-soc-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter events..."
                className="pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 focus:outline-none focus:ring-2 focus:ring-soc-ai/20"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 focus:outline-none"
            >
              <option value="">All Risk Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-soc-slate-50 border-b border-soc-slate-200 text-soc-slate-500 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5 font-semibold">Timestamp</th>
                <th className="py-3 px-3.5 font-semibold">Source Entity</th>
                <th className="py-3 px-3.5 font-semibold">Destination Entity</th>
                <th className="py-3 px-3.5 font-semibold">Event Description</th>
                <th className="py-3 px-3.5 font-semibold">ATT&CK Tactic</th>
                <th className="py-3 px-3.5 font-semibold">Risk Level</th>
                <th className="py-3 px-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-slate-100 font-mono">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-soc-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5 text-soc-slate-500">{evt.timestamp}</td>
                  <td className="py-3 px-3.5 font-semibold text-soc-slate-900">
                    {evt.source_entity} ({evt.source_ip})
                  </td>
                  <td className="py-3 px-3.5 text-soc-slate-700">
                    {evt.destination_entity} ({evt.destination_ip})
                  </td>
                  <td className="py-3 px-3.5 font-sans font-medium text-soc-slate-800 max-w-xs">
                    {evt.event_type}
                    {evt.is_forecast_trigger && (
                      <span className="ml-2 inline-flex text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-soc-ai border border-indigo-200">
                        AI Trigger
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-indigo-900 font-semibold">{evt.tactic}</td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={evt.risk_level} />
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="text-[11px] font-medium text-soc-slate-600">
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
