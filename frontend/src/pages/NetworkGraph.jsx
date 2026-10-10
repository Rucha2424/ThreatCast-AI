import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import InteractiveNetworkGraph3D from '../components/network/InteractiveNetworkGraph3D';
import NodeDetailsDrawer from '../components/network/NodeDetailsDrawer';
import NetworkFilters from '../components/network/NetworkFilters';
import MotionReveal from '../components/common/MotionReveal';
import { useNetworkGraph } from '../hooks/useNetworkGraph';

export default function NetworkGraph() {
  const { refreshTrigger, activeScenario } = useOutletContext() || {};

  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const { graph, loading, error, refetch } = useNetworkGraph();

  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  useEffect(() => {
    if (graph?.nodes?.length && !selectedNode) {
      const highRisk =
        graph.nodes.find((node) => node.state === 'compromised') ||
        graph.nodes[0];

      setSelectedNode(highRisk);
    }
  }, [graph, selectedNode]);

  if (loading && !graph) {
    return (
      <LoadingState message="Loading network topology and current telemetry..." />
    );
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

  const rawNodes = graph?.nodes || [];

  const filteredNodes = rawNodes.filter((node) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      const matchSearch =
        node.id?.toLowerCase().includes(q) ||
        node.label?.toLowerCase().includes(q) ||
        node.ip?.toLowerCase().includes(q) ||
        node.department?.toLowerCase().includes(q);

      if (!matchSearch) return false;
    }

    if (selectedType !== 'all' && node.type !== selectedType) {
      return false;
    }

    if (selectedRisk === 'critical' && node.risk_score <= 75) {
      return false;
    }

    if (selectedRisk === 'high' && node.risk_score <= 50) {
      return false;
    }

    if (selectedRisk === 'normal' && node.risk_score > 50) {
      return false;
    }

    return true;
  });

  const filteredGraph = {
    ...graph,
    nodes: filteredNodes,
  };

  return (
    <div className="space-y-6 relative z-10">
      <PageHeader
        title="Network State & Topology"
        subtitle="Select a node to inspect its current network telemetry."
        badge="Network Telemetry"
      />

      <MotionReveal hover>
        <NetworkFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedRisk={selectedRisk}
          onRiskChange={setSelectedRisk}
        />
      </MotionReveal>

      <MotionReveal className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InteractiveNetworkGraph3D
            graphData={filteredGraph}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            compact={false}
            activeScenario={activeScenario || 'ctu13'}
          />
        </div>

        <div>
          {selectedNode ? (
            <NodeDetailsDrawer
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <div className="p-12 text-center bg-threatcast-card rounded-2xl border border-tc-border text-threatcast-muted text-xs font-mono">
              Select a network node to inspect available telemetry.
            </div>
          )}
        </div>
      </MotionReveal>
    </div>
  );
}
