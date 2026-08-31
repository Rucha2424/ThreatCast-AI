import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, Sparkles, Clock, AlertTriangle, ShieldCheck, Server } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import ForecastStageCard from '../components/forecast/ForecastStageCard';
import ForecastConfidenceChart from '../components/forecast/ForecastConfidenceChart';
import LSTMComparisonMatrix from '../components/forecast/LSTMComparisonMatrix';
import { useForecast } from '../hooks/useForecast';

export default function AttackForecast() {
  const { refreshTrigger } = useOutletContext() || {};
  const { forecast, comparison, loading, error, refetch } = useForecast();

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
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <PageHeader
        title="K=3 Future-State Attack Progression Forecast"
        subtitle="Predicting how the current network intrusion is likely to evolve across the next 3 states before impact occurs."
        badge="Flagship Innovation"
      />

      {/* Current Observed State Hero Card */}
      {current && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cyber-beige-400">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
            <span>State Baseline (T_0)</span>
          </div>
          <ForecastStageCard stage={current} isCurrent={true} />
        </div>
      )}

      {/* K=3 Future States Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>K=3 Forecast Projections (T+1, T+2, T+3)</span>
          </div>
          <span className="text-xs font-mono text-cyber-beige-400">
            Engine: {forecast?.model_used}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {futureStages.map((stg, idx) => (
            <ForecastStageCard key={stg.stage_id || idx} stage={stg} isCurrent={false} />
          ))}
        </div>
      </div>

      {/* Forecast Confidence Decay Chart */}
      <ForecastConfidenceChart futureStages={futureStages} />

      {/* LSTM-A vs LSTM-B Architecture Matrix */}
      <LSTMComparisonMatrix comparisonData={comparison} />
    </div>
  );
}
