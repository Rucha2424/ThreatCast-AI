import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Network, MousePointerClick, ShieldCheck, Sparkles } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import InteractiveNetworkGraph from '../components/network/InteractiveNetworkGraph';
import NodeDetailsDrawer from '../components/network/NodeDetailsDrawer';
import NetworkFilters from '../components/network/NetworkFilters';
import SecurityInsightBanner from '../components/common/SecurityInsightBanner';
import { useNetworkGraph } from '../hooks/useNetworkGraph';

export default function NetworkGraph() {
  const { refreshTrigger, activeScenario } = useOutletContext() || {};

  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const { graph, loading, error, refetch } = useNetworkGraph();

  useEffect(() => {
    if (refreshTrigger) refetch();
  }, [refreshTrigger, refetch]);

  // Set default selected node once graph loads
  useEffect(() => {
    if (graph?.nodes?.length && !selectedNode) {
      const highRisk = graph.nodes.find((n) => n.state === 'compromised') || graph.nodes[0];
      setSelectedNode(highRisk);
    }
  }, [graph, selectedNode]);

  if (loading && !graph) {
    return <LoadingState message="Rendering neural network topology & Neo4j FastRP vector distances..." />;
  }

  if (error && !graph) {
    return (
      <ErrorState
        title="Failed to Load Network Topology"
        message={error}
        onRetry={refetch}
      />
    );
  }

  // Filter nodes according to criteria
  const rawNodes = graph?.nodes || [];
  const filteredNodes = rawNodes.filter((n) => {
    if (!n) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        n.id.toLowerCase().includes(q) ||
        n.label.toLowerCase().includes(q) ||
        n.ip.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (selectedType !== 'all' && n.type !== selectedType) return false;
    if (selectedRisk === 'critical' && n.risk_score <= 75) return false;
    if (selectedRisk === 'high' && n.risk_score <= 50) return false;
    if (selectedRisk === 'normal' && n.risk_score > 50) return false;
    return true;
  });

  const filteredGraph = {
    ...graph,
    nodes: filteredNodes,
  };

  const compromisedCount = rawNodes.filter((n) => n.state === 'compromised').length;

  return (
    <div className="space-y-6 relative z-10 text-slate-100">
      {/* Header */}
      <PageHeader
        title="Network State & Topological Graph"
        subtitle="Explore structural relationships between users, workstations, domain servers, and database clusters."
        badge="Neo4j + FastRP"
      />

      {/* Grounded Insight Banner */}
      <SecurityInsightBanner
        title="Topology Health Overview"
        insight={
          compromisedCount > 0
            ? `${compromisedCount} host(s) actively compromised with active traversal vectors directed toward Core Infrastructure Subnet 10.0.3.0/24.`
            : 'All network entities are operating within benign baseline parameters with zero active traverse vectors.'
        }
        recommendation={
          compromisedCount > 0
            ? 'Inspect the highlighted compromised nodes and stage pre-emptive host quarantines.'
            : 'Network topology is healthy.'
        }
        type={compromisedCount > 0 ? 'warning' : 'success'}
      />

      {/* Filter Controls */}
      <NetworkFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedRisk={selectedRisk}
        onRiskChange={setSelectedRisk}
      />

      {/* Main Grid: Interactive Graph + Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <InteractiveNetworkGraph
            graphData={filteredGraph}
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
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white">Select a Node on the Map</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any user, workstation, or server on the topology map to view human-readable threat analysis, observed telemetry, and proactive quarantine controls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
