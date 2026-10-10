import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { PcapAnalysisProvider } from '../../context/PcapAnalysisContext';

export default function Layout({ onScenarioChange, lastUpdated, activeScenario }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = async () => {
    setRefreshTrigger((prev) => prev + 1);
    if (onScenarioChange) onScenarioChange();
  };

  return (
    <PcapAnalysisProvider>
      <div className="min-h-screen bg-threatcast-bg text-cyber-brown-900 flex relative selection:bg-amber-500 selection:text-white">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 relative z-10">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet
            key={`${activeScenario}-${refreshTrigger}`}
            context={{ refreshTrigger, onRefresh: handleRefresh, activeScenario }}
          />
        </main>
      </div>
      </div>
    </PcapAnalysisProvider>
  );
}
