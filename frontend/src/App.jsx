import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import LiveNetwork from './pages/LiveNetwork';
import AttackForecast from './pages/AttackForecast';
import NetworkGraph from './pages/NetworkGraph';
import Disagreements from './pages/Disagreements';
import Incidents from './pages/Incidents';
import Explainability from './pages/Explainability';
import Login from './pages/Login';
import { getDashboardSummary } from './services/api';

export default function App() {
  const [activeScenario, setActiveScenario] = useState('default');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchGlobalState = async () => {
    try {
      const summary = await getDashboardSummary();
      setActiveScenario(summary.active_scenario || 'default');
      setLastUpdated(summary.last_updated);
    } catch (err) {
      console.warn('Backend not yet reachable:', err.message);
    }
  };

  useEffect(() => {
    fetchGlobalState();
    const interval = setInterval(fetchGlobalState, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleScenarioChange = (scenario) => {
    if (scenario) setActiveScenario(scenario);
    fetchGlobalState();
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected SOC Platform Shell */}
        <Route
          path="/"
          element={
            <Layout
              activeScenario={activeScenario}
              lastUpdated={lastUpdated}
              onScenarioChange={handleScenarioChange}
            />
          }
        >
          <Route index element={<Overview />} />
          <Route path="live-network" element={<LiveNetwork />} />
          <Route path="forecast" element={<AttackForecast />} />
          <Route path="network-graph" element={<NetworkGraph />} />
          <Route path="disagreements" element={<Disagreements />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="explainability" element={<Explainability />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
