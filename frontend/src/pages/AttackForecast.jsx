import React, { useEffect, useState, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, Clock, AlertTriangle, ShieldCheck, Server, Layers } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import ForecastStageCard from '../components/forecast/ForecastStageCard';
import ForecastConfidenceChart from '../components/forecast/ForecastConfidenceChart';
import LSTMComparisonMatrix from '../components/forecast/LSTMComparisonMatrix';
import ThreeCanvasWrapper from '../components/3d/ThreeCanvasWrapper';
import { useForecast } from '../hooks/useForecast';

const ForecastTimeline3D = lazy(() => import('../components/3d/ForecastTimeline3D'));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export default function AttackForecast() {
  const { refreshTrigger } = useOutletContext() || {};
  const { forecast, comparison, loading, error, refetch } = useForecast();
  const [selectedStage3D, setSelectedStage3D] = useState(1);

  useEffect(() => {
    if (refreshTrigger) refetch();
  }, [refreshTrigger, refetch]);

  if (loading && !forecast) {
    return <LoadingState message="Computing K=3 future-state attack progressions with LSTM-B..." />;
  }

  if (error && !forecast) {
    return (
      <ErrorState
        title="Failed to Load Attack Forecast"
        message={error}
        onRetry={refetch}
      />
    );
  }

  const current = forecast?.current_state;
  const futureStages = forecast?.future_stages || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 relative z-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="K=3 Future-State Attack Progression Forecast"
          subtitle="Predicting how the current network intrusion is likely to evolve across the next 3 states before impact occurs."
          badge="Flagship Innovation"
        />
      </motion.div>

      {/* 3D Visual Centerpiece: Spatial K=3 Forecast Horizon */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase text-sky-400">
            <Layers className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>3D Spatial Attack Trajectory Simulator</span>
          </div>
          <span className="text-2xs sm:text-xs font-mono text-slate-400 bg-cyber-card px-2.5 py-1 rounded-md border border-slate-800">
            Click Stage Node to Inspect Horizon
          </span>
        </div>

        <ThreeCanvasWrapper>
          <ForecastTimeline3D
            selectedStage={selectedStage3D}
            onSelectStage={(step) => setSelectedStage3D(step)}
          />
        </ThreeCanvasWrapper>
      </motion.div>

      {/* Current Observed State Hero Card */}
      {current && (
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>State Baseline (T_0)</span>
          </div>
          <ForecastStageCard stage={current} isCurrent={true} />
        </motion.div>
      )}

      {/* K=3 Future States Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-sky-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>K=3 Forecast Projections (T+1, T+2, T+3)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Engine: {forecast?.model_used}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {futureStages.map((stg, idx) => {
            const stepNum = idx + 1;
            const isHighlightedIn3D = selectedStage3D === stepNum;
            return (
              <div
                key={stg.stage_id || idx}
                onClick={() => setSelectedStage3D(stepNum)}
                className={`transition-all duration-300 rounded-2xl cursor-pointer ${
                  isHighlightedIn3D
                    ? 'ring-2 ring-sky-400 shadow-xl shadow-sky-500/20 scale-[1.02]'
                    : 'opacity-90 hover:opacity-100 hover:scale-[1.01]'
                }`}
              >
                <ForecastStageCard stage={stg} isCurrent={false} />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Forecast Confidence Decay Chart */}
      <motion.div variants={itemVariants}>
        <ForecastConfidenceChart futureStages={futureStages} />
      </motion.div>

      {/* LSTM-A vs LSTM-B Architecture Matrix */}
      <motion.div variants={itemVariants}>
        <LSTMComparisonMatrix comparisonData={comparison} />
      </motion.div>
    </motion.div>
  );
}
