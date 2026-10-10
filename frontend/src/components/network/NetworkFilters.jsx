import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function NetworkFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedRisk,
  onRiskChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-threatcast-card rounded-2xl border border-tc-border shadow-xs">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-threatcast-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Node ID, IP, or Department..."
          className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-tc-border focus:outline-none focus:ring-2 focus:ring-[var(--tc-cyan)]/30 focus:border-threatcast-cyan bg-threatcast-card text-threatcast-text placeholder:text-threatcast-muted font-mono"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-xl border border-tc-border bg-threatcast-card text-threatcast-silver focus:outline-none focus:ring-2 focus:ring-[var(--tc-cyan)]/30 focus:border-threatcast-cyan font-mono cursor-pointer"
        >
          <option value="all">All Node Types</option>
          <option value="user">User Entities</option>
          <option value="endpoint">Workstations</option>
          <option value="server">Domain Servers</option>
          <option value="database">Databases</option>
          <option value="gateway">Gateways</option>
        </select>

        <select
          value={selectedRisk}
          onChange={(e) => onRiskChange(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-xl border border-tc-border bg-threatcast-card text-threatcast-silver focus:outline-none focus:ring-2 focus:ring-[var(--tc-cyan)]/30 focus:border-threatcast-cyan font-mono cursor-pointer"
        >
          <option value="all">All Risk Tiers</option>
          <option value="critical">Critical (&gt; 75)</option>
          <option value="high">High (&gt; 50)</option>
          <option value="normal">Normal (&lt;= 50)</option>
        </select>
      </div>
    </div>
  );
}
