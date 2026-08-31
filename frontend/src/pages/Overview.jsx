import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import SecurityStatusHero from '../components/dashboard/SecurityStatusHero';
import KpiCard from '../components/dashboard/KpiCard';
import EarlyWarningCard from '../components/dashboard/EarlyWarningCard';
import ModelRuleComparisonCard from '../components/dashboard/ModelRuleComparisonCard';
import AttackProgressionTimeline from '../components/forecast/AttackProgressionTimeline';
import InteractiveNetworkGraph from '../components/network/InteractiveNetworkGraph';
import { useDashboard } from '../hooks/useDashboard';
import { useForecast } from '../hooks/useForecast';
import { useNetworkGraph } from '../hooks/useNetworkGraph';
import { useDisagreements } from '../hooks/useDisagreements';

export default function Overview() {
  const { refreshTrigger, activeScenario } = useOutletContext() || {};

  const { summary, kpis, loading: dashLoading, error: dashError, refetch: refetchDash } = useDashboard();
  const { forecast, loading: fcastLoading, error: fcastError, refetch: refetchFcast } = useForecast();
  const { graph, loading: graphLoading, error: graphError, refetch: refetchGraph } = useNetworkGraph();
  const { disagreementsData, loading: disLoading, error: disError, refetch: refetchDis } = useDisagreements();

  useEffect(() => {
    if (refreshTrigger) {
      refetchDash();
      refetchFcast();
      refetchGraph();
      refetchDis();
    }
  }, [refreshTrigger, refetchDash, refetchFcast, refetchGraph, refetchDis]);

  const loading = dashLoading || fcastLoading || graphLoading || disLoading;
  const error = dashError || fcastError || graphError || disError;

  if (loading && !summary) {
    return <LoadingState message="Connecting to ThreatCast AI neural forecasting engine..." />;
  }

  if (error && !summary) {
    return (
      <ErrorState
        title="Failed to Load SOC Overview"
        message={error}
        onRetry={() => {
          refetchDash();
          refetchFcast();
          refetchGraph();
          refetchDis();
        }}
      />
    );
  }

  const currentScenario = activeScenario || summary?.active_scenario || 'default';

  return (
    <div className="space-y-6 relative z-10">
      {/* Top Header */}
      <PageHeader
        title="Executive Security Overview"
        subtitle="Real-time network state intelligence, K=3 attack progression forecasting, and neural model-rule verification."
        badge="Predictive SOC Mode"
      />

      {/* Section 1: Hero Security Posture */}
      <SecurityStatusHero summary={summary} />

      {/* Section 2: 5 KPI Metric Cards */}
      {kpis?.cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.cards.map((card) => (
            <KpiCard key={card.id} item={card} />
          ))}
        </div>
      )}

      {/* Section 3: Attack Progression Forecast Timeline (Flagship Visual) */}
      <AttackProgressionTimeline forecastData={forecast} />

      {/* Section 4 & 5: Model vs Rule Comparison & Mini Network Risk Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelRuleComparisonCard disagreementData={disagreementsData} />
        <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#221207] tracking-tight">
                Network Entity Risk Topology
              </h3>
              <p className="text-xs text-[#7a644c]">
                Compromise vectors & predicted neural traversal trajectory.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#f5efe6] text-[#78350f] border border-[#ded0bc] font-bold">
              Live Topology
            </span>
          </div>
          <InteractiveNetworkGraph
            graphData={graph}
            compact={true}
            activeScenario={currentScenario}
          />
        </div>
      </div>

      {/* Section 6: Early Warning Banner */}
      <EarlyWarningCard summary={summary} />
    </div>
  );
}
