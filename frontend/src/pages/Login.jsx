import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Lock, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-soc-navy-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-soc-ai/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-soc-threat/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-soc-navy-900 p-0.5 shadow-lg">
            <div className="w-full h-full bg-soc-navy-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base font-mono">
              THREATCAST AI
            </span>
            <p className="text-[10px] tracking-widest text-soc-slate-400 uppercase font-semibold">
              AI Network Defence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-soc-slate-400">
          <span className="w-2 h-2 rounded-full bg-soc-secure animate-pulse" />
          <span>AI Engine Online</span>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md w-full mx-auto px-6 py-12 z-10">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Threat Forecasting Edition
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Predict the Attack. Stop It Before It Progresses.
          </h1>
          <p className="text-xs text-soc-slate-400 max-w-sm mx-auto">
            Next-generation enterprise network attack forecasting and proactive early warning platform.
          </p>
        </div>

        {/* Login Form Container */}
        <div className="p-8 rounded-2xl bg-soc-navy-900/90 border border-soc-navy-800 shadow-2xl backdrop-blur space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-soc-slate-300 block">
                Analyst ID / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-soc-navy-950 border border-soc-navy-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-soc-ai/40 focus:border-soc-ai"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-soc-slate-300 block">
                Security Key / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-soc-navy-950 border border-soc-navy-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-soc-ai/40 focus:border-soc-ai"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-soc-ai hover:bg-soc-ai-electric text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-indigo-500/20 active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Access ThreatCast SOC Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-soc-navy-800 text-center">
            <p className="text-[11px] text-soc-slate-400 font-mono">
              Demo Credentials preloaded for instant evaluation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs font-mono text-soc-slate-500 z-10">
        ThreatCast AI • Real-Time Graph Attack Forecasting Engine
      </footer>
    </div>
  );
}
