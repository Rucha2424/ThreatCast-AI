import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import SimModal from '../common/SimModal';
import SimulationResultModal from '../common/SimulationResultModal';

export default function Layout({ onScenarioChange, lastUpdated, activeScenario }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [resultModalScenario, setResultModalScenario] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  const handleRefresh = async () => {
    setRefreshTrigger((prev) => prev + 1);
    if (onScenarioChange) onScenarioChange();
  };

  const handleSimulated = (scenario) => {
    setRefreshTrigger((prev) => prev + 1);
    if (onScenarioChange) onScenarioChange(scenario);
  };

  return (
    <div className="min-h-screen bg-[#070a10] cyber-grid-bg text-slate-100 flex relative selection:bg-sky-500 selection:text-white overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 relative z-10">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenSimModal={() => setSimModalOpen(true)}
          onRefresh={handleRefresh}
          lastUpdated={lastUpdated}
          activeScenario={activeScenario}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet
                key={`${activeScenario || 'none'}-${location.pathname}`}
                context={{
                  refreshTrigger,
                  onRefresh: handleRefresh,
                  activeScenario,
                  openSimModal: () => setSimModalOpen(true),
                  showResultModal: (sc) => setResultModalScenario(sc),
                }}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Attack Simulation Playbook Modal */}
      <SimModal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        onSimulated={handleSimulated}
        onShowResult={(sc) => setResultModalScenario(sc)}
      />

      {/* Post-Simulation Result Narrative Modal */}
      <SimulationResultModal
        isOpen={!!resultModalScenario}
        onClose={() => setResultModalScenario(null)}
        scenarioId={resultModalScenario || activeScenario || 'default'}
      />
    </div>
  );
}
