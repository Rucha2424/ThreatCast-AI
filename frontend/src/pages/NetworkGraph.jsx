import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Network, Shield, Filter, Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import InteractiveNetworkGraph from '../components/network/InteractiveNetworkGraph';
import NodeDetailsDrawer from '../components/network/NodeDetailsDrawer';
import NetworkFilters from '../components/network/NetworkFilters';
import { useNetworkGraph } from '../hooks/useNetworkGraph';

export default function NetworkGraph() {
  const { refreshTrigger } = useOutletContext() || {};

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
    return <LoadingState message="Rendering network topology & Neo4j FastRP vector distances..." />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Network State & Topological Graph"
        subtitle="Explore structural relationships between users, workstations, domain servers, and database clusters."
        badge="Neo4j + FastRP"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InteractiveNetworkGraph
            graphData={filteredGraph}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            compact={false}
          />
        </div>

        <div>
          {selectedNode ? (
            <NodeDetailsDrawer
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-soc-slate-200 text-soc-slate-400 text-xs">
              Select any node on the graph canvas to inspect granular telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
