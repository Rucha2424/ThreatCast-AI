import React from 'react';
import { Menu, Zap, Clock, Compass, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import RefreshButton from '../common/RefreshButton';
import { startOnboardingTour } from '../common/OnboardingTour';

export default function Header({
  onToggleSidebar,
  onOpenSimModal,
  onRefresh,
  refreshing = false,
  lastUpdated,
  activeScenario,
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 sm:h-18 px-4 sm:px-6 md:px-8 bg-cyber-surface/90 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-800/60 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 text-xs font-medium">
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Neural AI Engine Online
          </span>

          {activeScenario && activeScenario !== 'default' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulation: {activeScenario}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Guided Tour Trigger */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={startOnboardingTour}
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-700 bg-cyber-card hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono font-medium transition-colors"
          title="Take Guided Product Tour"
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>Tour</span>
        </motion.button>

        {/* Backend Timestamp */}
        {lastUpdated && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>
        )}

        <RefreshButton onRefresh={onRefresh} loading={refreshing} />

        {/* Attack Simulation Modal Trigger */}
        <motion.button
          id="tour-sim-trigger"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenSimModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/25 transition-all group font-mono"
        >
          <Zap className="w-4 h-4 text-sky-200 group-hover:scale-110 transition-transform" />
          <span>Simulate Attack</span>
        </motion.button>

        {/* Profile Avatar */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400 shadow-sm font-mono">
          TC
        </div>
      </div>
    </header>
  );
}
