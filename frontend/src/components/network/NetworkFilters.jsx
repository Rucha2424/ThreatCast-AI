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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-soc-slate-200 shadow-sm">
      {/* Search Input */}
      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-soc-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Node ID, IP, or Department..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-soc-slate-200 focus:outline-none focus:ring-2 focus:ring-soc-ai/20 focus:border-soc-ai bg-soc-slate-50/50"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 text-soc-slate-700 focus:outline-none focus:ring-2 focus:ring-soc-ai/20 focus:border-soc-ai"
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
          className="text-xs px-3 py-1.5 rounded-lg border border-soc-slate-200 bg-soc-slate-50/50 text-soc-slate-700 focus:outline-none focus:ring-2 focus:ring-soc-ai/20 focus:border-soc-ai"
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
