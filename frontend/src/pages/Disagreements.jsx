import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { GitCompare, AlertTriangle, Sparkles, Shield, Info } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import DisagreementTable from '../components/disagreements/DisagreementTable';
import DisagreementDrawer from '../components/disagreements/DisagreementDrawer';
import { useDisagreements } from '../hooks/useDisagreements';

export default function Disagreements() {
  const { refreshTrigger } = useOutletContext() || {};
  const [selectedItem, setSelectedItem] = useState(null);

  const { disagreementsData, rulesData, loading, error, refetch } = useDisagreements();

  useEffect(() => {
    if (refreshTrigger) refetch();
  }, [refreshTrigger, refetch]);

  // Set default selected item
  useEffect(() => {
    if (disagreementsData?.disagreements?.length && !selectedItem) {
      setSelectedItem(disagreementsData.disagreements[0]);
    }
  }, [disagreementsData, selectedItem]);

  if (loading && !disagreementsData) {
    return <LoadingState message="Cross-referencing temporal AI predictions against deterministic security rules..." />;
  }

  if (error && !disagreementsData) {
    return (
      <ErrorState
        title="Failed to Load Model-Rule Disagreements"
        message={error}
        onRetry={refetch}
      />
    );
  }

  const disagreements = disagreementsData?.disagreements || [];
  const rules = rulesData?.rules || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Model–Rule Disagreement Intelligence"
        subtitle="When learned predictions and deterministic rules disagree, the disagreement itself becomes an additional, high-fidelity security signal."
        badge="Secondary Telemetry Layer"
      />

      {/* Conceptual Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 text-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Core Thesis: Why Model–Rule Divergence Is Actionable</span>
        </div>
        <p className="text-amber-900/90 leading-relaxed max-w-4xl">
          Traditional IDS systems rely on fixed thresholds (e.g. port scan count or auth failure spikes). Sophisticated adversaries design stealth attacks (Kerberoasting single TGS requests, chunked slow data exfiltration) to stay below static rule thresholds. ThreatCast AI’s temporal graph models detect the structural attack progression, producing a disagreement signal that exposes evasive adversary behavior.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DisagreementTable
            disagreements={disagreements}
            selectedId={selectedItem?.id}
            onSelect={setSelectedItem}
          />

          {/* Active Deterministic Rule Engine List */}
          <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-4">
            <h3 className="text-sm font-bold text-soc-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-soc-slate-600" />
              Active Deterministic Security Rules Monitored
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-soc-slate-50 border border-soc-slate-200"
                >
                  <div>
                    <span className="font-bold text-soc-slate-900">{r.name}</span>
                    <span className="text-[11px] text-soc-slate-500 block">{r.pattern}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-soc-slate-500">24h Triggers: {r.triggers_last_24h}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-soc-slate-700 border border-soc-slate-300 font-semibold">
                      {r.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {selectedItem ? (
            <DisagreementDrawer
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-soc-slate-200 text-soc-slate-400 text-xs">
              Select a disagreement row to inspect the full analytical rationale.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
