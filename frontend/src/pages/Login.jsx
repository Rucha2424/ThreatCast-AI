import React, { useState, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Lock, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import ThreeCanvasWrapper from '../components/3d/ThreeCanvasWrapper';

const DashboardBackground3D = lazy(() => import('../components/3d/DashboardBackground3D'));

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('analyst@threatcast.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSignIn = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
      {/* 3D Cyber Ambient Canvas in Background */}
      <ThreeCanvasWrapper className="fixed inset-0 pointer-events-none z-0">
        <DashboardBackground3D />
      </ThreeCanvasWrapper>

      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-cyber-bg rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base sm:text-lg font-mono text-white">
              THREATCAST AI
            </span>
            <p className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
              Neural Network Defence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Neural Engine Online</span>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md w-full mx-auto px-6 py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8 space-y-2.5"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Enterprise Threat Forecasting Edition
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            Predict the Attack. Stop It Before It Progresses.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Next-generation enterprise neural attack forecasting and proactive early warning platform.
          </p>
        </motion.div>

        {/* Login Form Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="p-8 rounded-2xl bg-cyber-surface border border-slate-800 shadow-2xl space-y-6"
        >
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 block">
                Analyst ID / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-card border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 block">
                Security Key / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-card border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 mt-3 disabled:opacity-50 font-mono"
            >
              <span>{loading ? 'Authenticating...' : 'Access ThreatCast SOC Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-mono">
              Demo Credentials preloaded for instant evaluation.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs font-mono text-slate-500 z-10">
        ThreatCast AI • Real-Time Graph Attack Forecasting Engine
      </footer>
    </div>
  );
}
