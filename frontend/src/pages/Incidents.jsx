import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert, Filter, Search, Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import IncidentTable from '../components/incidents/IncidentTable';
import IncidentDetailsModal from '../components/incidents/IncidentDetailsModal';
import { useIncidents } from '../hooks/useIncidents';

export default function Incidents() {
  const { refreshTrigger } = useOutletContext() || {};

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { incidentsData, loading, error, refetch } = useIncidents();

  useEffect(() => {
    if (refreshTrigger) refetch();
  }, [refreshTrigger, refetch]);

  if (loading && !incidentsData) {
    return <LoadingState message="Fetching security incident records and active containment playbooks..." />;
  }

  if (error && !incidentsData) {
    return (
      <ErrorState
        title="Failed to Load Incident Registry"
        message={error}
        onRetry={refetch}
      />
    );
  }

  const rawIncidents = incidentsData?.incidents || [];
  const filteredIncidents = rawIncidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.current_stage.toLowerCase().includes(q) ||
        inc.affected_assets.some((a) => a.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Security Incident Management & Playbooks"
        subtitle="Track observed and forecasted security incidents across the enterprise lifecycle."
        badge="Proactive Response"
      />

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-soc-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-soc-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Incident ID, title, or asset..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 focus:outline-none focus:ring-2 focus:ring-soc-ai/20"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 text-soc-slate-700 focus:outline-none"
          >
            <option value="all">All Incident Statuses</option>
            <option value="Forecasted">Forecasted (Pre-emptive)</option>
            <option value="Investigating">Investigating</option>
            <option value="Contained">Contained</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <IncidentTable
        incidents={filteredIncidents}
        onSelectIncident={handleSelectIncident}
      />

      {/* Details Modal */}
      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
