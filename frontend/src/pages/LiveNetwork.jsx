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
    return <LoadingState message="Streaming live neural network telemetry & flow records..." />;
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
    <div className="space-y-6 relative z-10">
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
      <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ebdcc7] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#221207] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#b45309]" />
              Live Security Telemetry Log
            </h3>
            <p className="text-xs text-[#7a644c]">
              Raw network events annotated with MITRE ATT&CK taxonomy & neural forecast trigger flags.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7a644c] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter events..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#ebdcc7] bg-[#fcfaf7] text-[#221207] placeholder:text-[#998165] focus:outline-none focus:ring-2 focus:ring-[#b45309]/30 font-mono"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-[#ebdcc7] bg-[#fcfaf7] text-[#544230] focus:outline-none font-mono cursor-pointer"
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
              <tr className="bg-[#fcfaf7] border-b border-[#ebdcc7] text-[#7a644c] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5 font-bold">Timestamp</th>
                <th className="py-3 px-3.5 font-bold">Source Entity</th>
                <th className="py-3 px-3.5 font-bold">Destination Entity</th>
                <th className="py-3 px-3.5 font-bold">Event Description</th>
                <th className="py-3 px-3.5 font-bold">ATT&CK Tactic</th>
                <th className="py-3 px-3.5 font-bold">Risk Level</th>
                <th className="py-3 px-3.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efe6] font-mono">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#fcfaf7] transition-colors">
                  <td className="py-3 px-3.5 text-[#7a644c]">{evt.timestamp}</td>
                  <td className="py-3 px-3.5 font-bold text-[#221207]">
                    {evt.source_entity} <span className="text-[#7a644c] font-normal">({evt.source_ip})</span>
                  </td>
                  <td className="py-3 px-3.5 text-[#544230]">
                    {evt.destination_entity} <span className="text-[#998165]">({evt.destination_ip})</span>
                  </td>
                  <td className="py-3 px-3.5 font-sans font-medium text-[#301a0a] max-w-xs">
                    {evt.event_type}
                    {evt.is_forecast_trigger && (
                      <span className="ml-2 inline-flex text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                        AI Trigger
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-[#b45309] font-bold">{evt.tactic}</td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={evt.risk_level} />
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="text-[11px] font-medium text-[#544230]">
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
