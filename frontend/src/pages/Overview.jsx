import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import SecurityStatusHero from '../components/dashboard/SecurityStatusHero';
import KpiCard from '../components/dashboard/KpiCard';
import EarlyWarningCard from '../components/dashboard/EarlyWarningCard';
import ModelRuleComparisonCard from '../components/dashboard/ModelRuleComparisonCard';
import AttackProgressionTimeline from '../components/forecast/AttackProgressionTimeline';
import InteractiveNetworkGraph from '../components/network/InteractiveNetworkGraph';
import SimulationResultModal from '../components/common/SimulationResultModal';
import OnboardingTour from '../components/common/OnboardingTour';
import NodeDetailsDrawer from '../components/network/NodeDetailsDrawer';
import ThreeCanvasWrapper from '../components/3d/ThreeCanvasWrapper';
import { useDashboard } from '../hooks/useDashboard';
import { useForecast } from '../hooks/useForecast';
import { useNetworkGraph } from '../hooks/useNetworkGraph';
import { useDisagreements } from '../hooks/useDisagreements';

const HeroNetwork3D = lazy(() => import('../components/3d/HeroNetwork3D'));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export default function Overview() {
  const { refreshTrigger, activeScenario, openSimModal } = useOutletContext() || {};

  const { summary, kpis, loading: dashLoading, error: dashError, refetch: refetchDash } = useDashboard();
  const { forecast, loading: fcastLoading, error: fcastError, refetch: refetchFcast } = useForecast();
  const { graph, loading: graphLoading, error: graphError, refetch: refetchGraph } = useNetworkGraph();
  const { disagreementsData, loading: disLoading, error: disError, refetch: refetchDis } = useDisagreements();

  const [selectedNode, setSelectedNode] = useState(null);
  const [resultModalScenario, setResultModalScenario] = useState(null);

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 relative z-10"
    >
      {/* Driver.js Lightweight Guided Tour */}
      <OnboardingTour />

      {/* Post-Simulation Result Narrative Modal */}
      <SimulationResultModal
        isOpen={!!resultModalScenario}
        onClose={() => setResultModalScenario(null)}
        scenarioId={resultModalScenario || currentScenario}
        forecastSummary={summary}
      />

      {/* Top Header */}
      <motion.div variants={itemVariants} id="tour-overview-header">
        <PageHeader
          title="Executive Security Overview"
          subtitle="Real-time network state intelligence, K=3 attack progression forecasting, and 3D neural spatial verification."
          badge="Predictive SOC Mode"
        />
      </motion.div>

      {/* Section 1: Hero Security Posture + 3D Spatial Network Mesh */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <SecurityStatusHero summary={summary} />
        </div>

        <div className="lg:col-span-5 h-80 sm:h-96 lg:h-auto min-h-[340px] flex flex-col">
          <ThreeCanvasWrapper className="h-full w-full">
            <HeroNetwork3D
              activeScenario={currentScenario}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </ThreeCanvasWrapper>
        </div>
      </motion.div>

      {/* Section 2: 5 KPI Metric Cards with In-UI Context */}
      {kpis?.cards && (
        <motion.div
          variants={itemVariants}
          id="tour-kpi-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {kpis.cards.map((card) => (
            <KpiCard key={card.id} item={card} />
          ))}
        </motion.div>
      )}

      {/* Section 3: Attack Progression Forecast Timeline (Flagship Visual) */}
      <motion.div variants={itemVariants}>
        <AttackProgressionTimeline forecastData={forecast} />
      </motion.div>

      {/* Section 4 & 5: Model vs Rule Comparison & 2D/3D Network Risk Graph */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ModelRuleComparisonCard disagreementData={disagreementsData} />

        <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Network Entity Risk Topology
              </h3>
              <p className="text-xs text-slate-400">
                Compromise vectors & predicted neural traversal trajectory.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
              2D Graph
            </span>
          </div>

          <InteractiveNetworkGraph
            graphData={graph}
            compact={true}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => setSelectedNode(node)}
            activeScenario={currentScenario}
          />

          {selectedNode && (
            <div className="mt-4">
              <NodeDetailsDrawer
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Section 6: Early Warning Banner */}
      <motion.div variants={itemVariants}>
        <EarlyWarningCard summary={summary} />
      </motion.div>
    </motion.div>
  );
}
