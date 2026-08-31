import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Lock, ArrowRight, Zap } from 'lucide-react';
import NeuralBackground from '../components/common/NeuralBackground';

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
    <div className="min-h-screen bg-cyber-obsidian text-cyber-beige-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Animated Synaptic Canvas Background */}
      <NeuralBackground />

      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyber-brown-600/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-cyber-brown-600 to-cyber-amber-900 p-0.5 shadow-lg shadow-amber-950/50">
            <div className="w-full h-full bg-cyber-obsidian rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base font-mono text-white">
              THREATCAST AI
            </span>
            <p className="text-[10px] tracking-widest text-cyber-beige-400 uppercase font-semibold">
              Neural Network Defence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyber-beige-300">
          <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_#84cc16]" />
          <span>Neural Engine Online</span>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md w-full mx-auto px-6 py-12 z-10">
        <div className="text-center mb-8 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Enterprise Threat Forecasting Edition
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Predict the Attack. Stop It Before It Progresses.
          </h1>
          <p className="text-xs text-cyber-beige-300 max-w-sm mx-auto">
            Next-generation enterprise neural attack forecasting and proactive early warning platform.
          </p>
        </div>

        {/* Login Form Container */}
        <div className="p-8 rounded-2xl bg-gradient-to-b from-cyber-brown-950/95 via-cyber-black to-cyber-amber-950/90 border border-cyber-brown-700 shadow-2xl backdrop-blur-md space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-cyber-beige-300 block">
                Analyst ID / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-black border border-cyber-brown-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-cyber-beige-300 block">
                Security Key / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-black border border-cyber-brown-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyber-brown-700 via-amber-700 to-cyber-amber-600 hover:from-cyber-brown-600 hover:to-amber-600 text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-amber-950/60 active:scale-98 flex items-center justify-center gap-2 mt-3 disabled:opacity-50 border border-amber-500/40 font-mono"
            >
              <span>{loading ? 'Authenticating...' : 'Access ThreatCast SOC Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-cyber-brown-850 text-center">
            <p className="text-[11px] text-cyber-beige-400 font-mono">
              Demo Credentials preloaded for instant evaluation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs font-mono text-cyber-beige-400 z-10">
        ThreatCast AI • Real-Time Graph Attack Forecasting Engine
      </footer>
    </div>
  );
}
