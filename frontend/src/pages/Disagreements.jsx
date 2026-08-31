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
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <PageHeader
        title="Model–Rule Disagreement Intelligence"
        subtitle="When learned predictions and deterministic rules disagree, the disagreement itself becomes an additional, high-fidelity security signal."
        badge="Secondary Telemetry Layer"
      />

      {/* Conceptual Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 text-xs space-y-2 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2 text-rose-400 font-bold font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Core Thesis: Why Model–Rule Divergence Is Actionable</span>
        </div>
        <p className="text-cyber-grey-300 leading-relaxed max-w-4xl">
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
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Active Deterministic Security Rules Monitored
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800"
                >
                  <div>
                    <span className="font-bold text-white">{r.name}</span>
                    <span className="text-[11px] text-cyber-grey-400 block">{r.pattern}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-cyber-grey-400">24h Triggers: {r.triggers_last_24h}</span>
                    <span className="px-2.5 py-0.5 rounded bg-cyber-maroon-900 text-rose-300 border border-cyber-maroon-700 font-bold">
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
            <div className="p-12 text-center bg-cyber-maroon-950/80 rounded-2xl border border-cyber-maroon-800 text-cyber-grey-400 text-xs">
              Select a disagreement row to inspect the full analytical rationale.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
