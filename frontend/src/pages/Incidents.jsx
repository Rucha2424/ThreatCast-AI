import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert, Search } from 'lucide-react';
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
    return <LoadingState message="Connecting to Neo4j persistent incident registry..." />;
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
  const totalCount = incidentsData?.total ?? rawIncidents.length;

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
        (inc.affected_assets && inc.affected_assets.some((a) => a.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <PageHeader
        title="Security Incident Management & Playbooks"
        subtitle={`${totalCount} Incident Records in persistent Neo4j storage. The CTU13 dataset pipeline has no active Incident nodes.`}
        badge="Persistent Incident Records"
      />

      {/* Status KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 font-mono text-xs">
        <div className="p-4 rounded-2xl border border-tc-border bg-threatcast-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-cyan">
            Persistent Incident Records
          </span>
          <div className="mt-2 text-2xl font-bold text-threatcast-text">
            {totalCount} Records
          </div>
          <p className="mt-1 text-[11px] text-threatcast-muted">
            Neo4j Incident nodes in database
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-tc-border bg-threatcast-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-cyan">
            Active Investigations
          </span>
          <div className="mt-2 text-2xl font-bold text-threatcast-text">
            0 Active
          </div>
          <p className="mt-1 text-[11px] text-threatcast-muted">
            Zero ongoing manual investigations
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-tc-border bg-threatcast-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-cyan">
            Containment Executions
          </span>
          <div className="mt-2 text-2xl font-bold text-threatcast-text">
            0 Playbooks
          </div>
          <p className="mt-1 text-[11px] text-threatcast-muted">
            No automated playbooks executed
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-threatcast-card rounded-2xl border border-tc-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-threatcast-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Incident ID, title, or asset..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-tc-border bg-threatcast-card text-threatcast-text placeholder:text-threatcast-muted focus:outline-none focus:ring-2 focus:ring-[var(--tc-cyan)]/30 font-mono"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3.5 py-2 rounded-xl border border-tc-border bg-threatcast-card text-threatcast-silver focus:outline-none font-mono cursor-pointer"
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