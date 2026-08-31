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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 rounded-2xl border border-cyber-maroon-800 shadow-xl backdrop-blur-md">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-cyber-grey-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Node ID, IP, or Department..."
          className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-cyber-maroon-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 bg-cyber-black text-white placeholder:text-cyber-grey-500 font-mono"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-xl border border-cyber-maroon-800 bg-cyber-black text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 font-mono cursor-pointer"
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
          className="text-xs px-3.5 py-2 rounded-xl border border-cyber-maroon-800 bg-cyber-black text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 font-mono cursor-pointer"
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
