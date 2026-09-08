import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Lock, ArrowRight, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-[#fbf8f4] text-[#301a0a] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d97706] to-[#78350f] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#fdfcf9] rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#b45309]" />
            </div>
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base font-mono text-[#221207]">
              THREATCAST AI
            </span>
            <p className="text-[10px] tracking-widest text-[#7a644c] uppercase font-semibold">
              Neural Network Defence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#7a644c]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#65a30d]" />
          <span>Neural Engine Online</span>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md w-full mx-auto px-6 py-12 z-10">
        <div className="text-center mb-8 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            Enterprise Threat Forecasting Edition
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#221207]">
            Predict the Attack. Stop It Before It Progresses.
          </h1>
          <p className="text-xs text-[#544230] max-w-sm mx-auto">
            Next-generation enterprise neural attack forecasting and proactive early warning platform.
          </p>
        </div>

        {/* Login Form Container */}
        <div className="p-8 rounded-2xl bg-white border border-[#ebdcc7] shadow-sm space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#544230] block">
                Analyst ID / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-[#221207] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#b45309]/30 focus:border-[#b45309]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#544230] block">
                Security Key / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-[#221207] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#b45309]/30 focus:border-[#b45309]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold tracking-wide transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2 mt-3 disabled:opacity-50 font-mono"
            >
              <span>{loading ? 'Authenticating...' : 'Access ThreatCast SOC Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-[#ebdcc7] text-center">
            <p className="text-[11px] text-[#7a644c] font-mono">
              Demo Credentials preloaded for instant evaluation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs font-mono text-[#7a644c] z-10">
        ThreatCast AI • Real-Time Graph Attack Forecasting Engine
      </footer>
    </div>
  );
}
