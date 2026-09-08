import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Radio, Search, MousePointerClick, ShieldCheck, Activity } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import SecurityInsightBanner from '../components/common/SecurityInsightBanner';
import InteractiveNetworkGraph from '../components/network/InteractiveNetworkGraph';
import NodeDetailsDrawer from '../components/network/NodeDetailsDrawer';
import NetworkTrafficChart from '../components/charts/NetworkTrafficChart';
import AuthActivityChart from '../components/charts/AuthActivityChart';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import { useNetworkGraph } from '../hooks/useNetworkGraph';
import { useEvents } from '../hooks/useEvents';

const DEFAULT_EVENTS = [
  {
    id: 'evt-1094',
    timestamp: '15:32:10',
    source_ip: '10.0.1.14',
    source_entity: 'User-014',
    destination_ip: '10.0.2.7',
    destination_entity: 'Endpoint-07',
    event_type: 'Token Impersonation & SeDebugPrivilege Enablement',
    tactic: 'Privilege Escalation',
    risk_level: 'CRITICAL',
    status: 'Observed',
    is_forecast_trigger: true,
  },
  {
    id: 'evt-1093',
    timestamp: '15:31:45',
    source_ip: '10.0.2.7',
    source_entity: 'Endpoint-07',
    destination_ip: '10.0.3.3',
    destination_entity: 'Server-03',
    event_type: 'SMB/RPC Administrative Share Probing (C$)',
    tactic: 'Lateral Movement',
    risk_level: 'HIGH',
    status: 'Under Analysis',
    is_forecast_trigger: true,
  },
  {
    id: 'evt-1092',
    timestamp: '15:30:12',
    source_ip: '10.0.2.7',
    source_entity: 'Endpoint-07',
    destination_ip: '10.0.3.0/24',
    destination_entity: 'Core Subnet',
    event_type: 'Rapid SYN Port Sweep (Ports 135, 445, 3389)',
    tactic: 'Discovery',
    risk_level: 'MEDIUM',
    status: 'Flagged',
    is_forecast_trigger: false,
  },
  {
    id: 'evt-1091',
    timestamp: '15:28:40',
    source_ip: '10.0.1.9',
    source_entity: 'User-009',
    destination_ip: '10.0.2.12',
    destination_entity: 'Endpoint-12',
    event_type: 'Standard SSH Key Auth Session',
    tactic: 'Initial Access',
    risk_level: 'LOW',
    status: 'Benign',
    is_forecast_trigger: false,
  },
];

export default function LiveNetwork() {
  const { refreshTrigger, activeScenario } = useOutletContext() || {};

  const [selectedNode, setSelectedNode] = useState(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { graph, activity, loading: actLoading, error: actError, refetch: refetchAct } = useNetworkGraph();
  const { eventsData, loading: evtLoading, error: evtError, refetch: refetchEvt } = useEvents({
    risk_level: riskFilter || undefined,
  });

  useEffect(() => {
    if (refreshTrigger) {
      refetchAct();
      refetchEvt();
    }
  }, [refreshTrigger, refetchAct, refetchEvt]);

  // Set default selected node once graph is ready
  useEffect(() => {
    if (graph?.nodes?.length && !selectedNode) {
      const highRisk = graph.nodes.find((n) => n.state === 'compromised') || graph.nodes[0];
      setSelectedNode(highRisk);
    }
  }, [graph, selectedNode]);

  const rawEvents = (eventsData?.events && eventsData.events.length > 0) ? eventsData.events : DEFAULT_EVENTS;
  const filteredEvents = rawEvents.filter((e) => {
    if (riskFilter && e.risk_level.toUpperCase() !== riskFilter.toUpperCase()) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.source_entity?.toLowerCase().includes(q) ||
      e.destination_entity?.toLowerCase().includes(q) ||
      e.event_type?.toLowerCase().includes(q) ||
      e.tactic?.toLowerCase().includes(q)
    );
  });

  const compromisedCount = graph?.nodes?.filter((n) => n.state === 'compromised')?.length || 2;

  return (
    <div className="space-y-7 relative z-10 text-slate-100">
      {/* Header */}
      <PageHeader
        title="Live Network Observability & Telemetry"
        subtitle="Real-time interactive topology, flow throughput, authentication dynamics, and MITRE ATT&CK security events."
        badge="Live Telemetry"
      />

      {/* Security Health Insight */}
      <SecurityInsightBanner
        title="Live Subnet Observability Status"
        insight={
          compromisedCount > 0
            ? `Active lateral traversal detected across ${compromisedCount} host node(s). High anomalous bandwidth observed originating from Endpoint-07.`
            : 'All network interfaces and subnets operating within standard benign behavioral baselines.'
        }
        recommendation={
          compromisedCount > 0
            ? 'Inspect the highlighted compromised nodes on the live topology below and review active socket bindings.'
            : 'Continuous telemetry active.'
        }
        type={compromisedCount > 0 ? 'warning' : 'success'}
      />

      {/* Interactive Topology + Node Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <InteractiveNetworkGraph
            graphData={graph}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            compact={false}
            activeScenario={activeScenario || 'default'}
          />
        </div>

        <div>
          {selectedNode ? (
            <NodeDetailsDrawer
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <div className="p-8 text-center bg-cyber-surface rounded-2xl border border-slate-800 shadow-soc-card space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">Select a Node on the Live Map</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Click any device, user workstation, or domain server on the map to inspect real-time metrics, socket connections, and proactive quarantine triggers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkTrafficChart trafficSeries={activity?.traffic_series} />
        <AuthActivityChart authSeries={activity?.auth_series} />
      </div>

      {/* Risk Dynamics Evolution */}
      <RiskTrendChart riskTrend={activity?.risk_trend} />

      {/* Security Event Telemetry Log */}
      <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              Live Security Telemetry Log
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Raw network events annotated with MITRE ATT&CK taxonomy & neural forecast trigger flags.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search telemetry events..."
                className="pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-cyber-card text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 font-mono"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-700 bg-cyber-card text-slate-300 focus:outline-none font-mono cursor-pointer"
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
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-cyber-card border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 font-bold">Timestamp</th>
                <th className="py-3.5 px-4 font-bold">Source Entity</th>
                <th className="py-3.5 px-4 font-bold">Destination Entity</th>
                <th className="py-3.5 px-4 font-bold">Event Description</th>
                <th className="py-3.5 px-4 font-bold">ATT&CK Tactic</th>
                <th className="py-3.5 px-4 font-bold">Risk Level</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400">{evt.timestamp}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {evt.source_entity} <span className="text-slate-500 font-normal">({evt.source_ip})</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {evt.destination_entity} <span className="text-slate-500">({evt.destination_ip})</span>
                  </td>
                  <td className="py-3.5 px-4 font-sans font-medium text-slate-200 max-w-xs">
                    {evt.event_type}
                    {evt.is_forecast_trigger && (
                      <span className="ml-2 inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        AI Trigger
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-sky-400 font-bold">{evt.tactic}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={evt.risk_level} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-medium text-slate-400">
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
