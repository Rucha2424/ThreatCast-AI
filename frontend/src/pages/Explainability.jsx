import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Brain, Info, Network, Layers } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import ReasoningCard from '../components/explainability/ReasoningCard';
import ContributingSignalBars from '../components/explainability/ContributingSignalBars';
import SubGraphContext from '../components/explainability/SubGraphContext';
import { useExplainability } from '../hooks/useExplainability';

export default function Explainability() {
  const { refreshTrigger } = useOutletContext() || {};
  const { explainData, loading, error, refetch } = useExplainability('INC-8042');

  useEffect(() => {
    if (refreshTrigger) refetch();
  }, [refreshTrigger, refetch]);

  if (loading && !explainData) {
    return <LoadingState message="Extracting temporal attention weights and FastRP topological attribution scores..." />;
  }

  if (error && !explainData) {
    return (
      <ErrorState
        title="Failed to Load Explainability Telemetry"
        message={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <PageHeader
        title="AI Forecast Explainability & Feature Attribution"
        subtitle="Transparent diagnostic insight into why ThreatCast AI predicted this specific attack progression."
        badge="Interpretable AI"
      />

      {/* Top Hero Reasoning Card */}
      <ReasoningCard explainData={explainData} />

      {/* Grid: Contributing Signals + SubGraph Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContributingSignalBars signals={explainData?.contributing_signals} />
        <SubGraphContext
          subgraphNodes={explainData?.subgraph_nodes}
          subgraphEdges={explainData?.subgraph_edges}
          fastrpNote={explainData?.fastrp_embedding_note}
        />
      </div>
    </div>
  );
}
