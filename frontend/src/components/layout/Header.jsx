import React from 'react';
import { Menu, Zap, Bell, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import RefreshButton from '../common/RefreshButton';

export default function Header({
  onToggleSidebar,
  onOpenSimModal,
  onRefresh,
  refreshing = false,
  lastUpdated,
  activeScenario,
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white/95 backdrop-blur border-b border-soc-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-soc-slate-600 hover:bg-soc-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-soc-slate-500 font-medium">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-soc-secure animate-pulse" />
            AI Engine Online
          </span>
          {activeScenario && activeScenario !== 'default' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-mono text-[11px]">
              <Zap className="w-3 h-3 text-soc-threat" />
              Scenario: {activeScenario}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Timestamp */}
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-soc-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-soc-slate-400" />
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>
        )}

        <RefreshButton onRefresh={onRefresh} loading={refreshing} />

        {/* Attack Simulation Modal Trigger */}
        <button
          onClick={onOpenSimModal}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-soc-navy-900 to-indigo-900 hover:from-soc-navy-850 hover:to-indigo-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 border border-indigo-500/30 group"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-300 group-hover:scale-110 transition-transform" />
          <span>Simulate Attack</span>
        </button>

        {/* Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-soc-slate-100 border border-soc-slate-300 flex items-center justify-center text-xs font-bold text-soc-slate-700">
          SIH
        </div>
      </div>
    </header>
  );
}
