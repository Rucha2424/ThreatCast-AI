import React from 'react';
import { Menu, Zap, Clock, ShieldCheck, Activity, Cpu } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-cyber-black/85 backdrop-blur-xl border-b border-cyber-maroon-800/80 shadow-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-cyber-grey-300 hover:bg-cyber-maroon-900/60 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 text-xs font-medium">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-maroon-950/90 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            Neural AI Engine Online
          </span>

          {activeScenario && activeScenario !== 'default' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-burgundy-950/90 text-rose-300 border border-rose-500/40 font-mono text-[11px] shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <Zap className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>Simulation: {activeScenario}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Backend Timestamp */}
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-cyber-grey-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyber-maroon-400" />
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>
        )}

        <RefreshButton onRefresh={onRefresh} loading={refreshing} />

        {/* Attack Simulation Modal Trigger */}
        <button
          onClick={onOpenSimModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-maroon-700 via-rose-700 to-cyber-burgundy-600 hover:from-cyber-maroon-600 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all active:scale-95 border border-rose-500/40 group"
        >
          <Zap className="w-3.5 h-3.5 text-rose-200 group-hover:scale-125 transition-transform" />
          <span>Simulate Attack</span>
        </button>

        {/* Profile Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyber-maroon-800 to-cyber-burgundy-950 border border-cyber-maroon-600/70 flex items-center justify-center text-xs font-bold text-white shadow-md">
          TC
        </div>
      </div>
    </header>
  );
}
