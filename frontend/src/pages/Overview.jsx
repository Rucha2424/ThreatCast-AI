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

import InteractiveNetworkGraph3D from '../components/network/InteractiveNetworkGraph3D';

import { useDashboard } from '../hooks/useDashboard';
import { useForecast } from '../hooks/useForecast';
import { useNetworkGraph } from '../hooks/useNetworkGraph';
import { useDisagreements } from '../hooks/useDisagreements';


export default function Overview() {

  const {
    refreshTrigger,
    activeScenario,
  } = useOutletContext() || {};


  const {
    summary,
    kpis,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard();


  const {
    forecast,
    loading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useForecast();


  const {
    graph,
    loading: graphLoading,
    error: graphError,
    refetch: refetchGraph,
  } = useNetworkGraph();


  const {
    disagreementsData,
    loading: disagreementsLoading,
    error: disagreementsError,
    refetch: refetchDisagreements,
  } = useDisagreements();


  /*
   * Refresh all API-backed dashboard data
   * whenever the application refresh trigger changes.
   */
  useEffect(() => {

    if (!refreshTrigger) {
      return;
    }

    refetchDashboard();
    refetchForecast();
    refetchGraph();
    refetchDisagreements();

  }, [
    refreshTrigger,
    refetchDashboard,
    refetchForecast,
    refetchGraph,
    refetchDisagreements,
  ]);


  const loading =
    dashboardLoading ||
    forecastLoading ||
    graphLoading ||
    disagreementsLoading;


  const error =
    dashboardError ||
    forecastError ||
    graphError ||
    disagreementsError;


  if (loading && !summary) {

    return (
      <LoadingState
        message="Connecting to ThreatCast CTU13 LSTM early-warning engine..."
      />
    );

  }


  if (error && !summary) {

    return (
      <ErrorState
        title="Failed to Load SOC Overview"
        message={error}
        onRetry={() => {

          refetchDashboard();
          refetchForecast();
          refetchGraph();
          refetchDisagreements();

        }}
      />
    );

  }


  const currentScenario =
    activeScenario ||
    summary?.active_scenario ||
    'ctu13_lstm';


  return (

    <div className="space-y-6 relative z-10">

      {/* Page heading */}
      <PageHeader
        title="Executive Security Overview"
        subtitle="CTU13 network-state intelligence and LSTM early-warning analysis."
        badge="Predictive SOC Mode"
      />


      {/* Main security status */}
      <SecurityStatusHero
        summary={summary}
      />


      {/* KPI cards */}
      {kpis?.cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {kpis.cards.map((card) => (

            <KpiCard
              key={card.id}
              item={card}
            />

          ))}

        </div>
      )}


      {/* Real CTU13 temporal assessment */}
      <AttackProgressionTimeline
        forecastData={forecast}
      />


      {/* Model verification + network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ModelRuleComparisonCard
          disagreementData={disagreementsData}
        />


        <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs flex flex-col justify-between space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-sm font-bold text-threatcast-text tracking-tight">
                Network Entity Topology
              </h3>

              <p className="text-xs text-threatcast-muted">
                Network visualization from the current application data source.
              </p>

            </div>


            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-cyan border border-tc-border font-bold">
              Network View
            </span>

          </div>


          <InteractiveNetworkGraph3D
            graphData={graph}
            compact={true}
            activeScenario={currentScenario}
          />

        </div>

      </div>


      {/* Early-warning explanation */}
      <EarlyWarningCard
        summary={summary}
      />

    </div>

  );
}