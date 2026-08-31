import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Network,
  GitCompare,
  ShieldAlert,
  Sparkles,
  Shield,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import { NAV_ITEMS } from '../../utils/constants';

const ICON_MAP = {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Network,
  GitCompare,
  ShieldAlert,
  Sparkles,
};

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-cyber-obsidian/80 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-cyber-black text-cyber-grey-200 border-r border-cyber-maroon-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyber-maroon-800/80 bg-cyber-maroon-950/40">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-cyber-maroon-600 to-cyber-burgundy-900 p-0.5 shadow-lg shadow-rose-900/40">
              <div className="w-full h-full bg-cyber-obsidian rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-sm text-white font-mono">
                  THREATCAST
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-cyber-grey-400 uppercase font-semibold">
                Neural Defence Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cyber-grey-400 hover:text-white hover:bg-cyber-maroon-900/60 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-cyber-grey-400 font-mono">
            Platform Intelligence
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyber-maroon-800 via-cyber-burgundy-900 to-transparent text-white border-l-2 border-rose-500 shadow-md shadow-rose-950/50'
                      : 'text-cyber-grey-400 hover:text-white hover:bg-cyber-maroon-900/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-rose-400'
                          : 'text-cyber-grey-400 group-hover:text-rose-300'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'forecast' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        K=3
                      </span>
                    )}
                    {item.id === 'disagreements' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Signal
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Telemetry Badges */}
        <div className="p-4 border-t border-cyber-maroon-800/80 bg-cyber-maroon-950/60 space-y-2.5">
          <div className="p-3 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800/70 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyber-grey-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                Neural FastRP Engine
              </span>
              <span className="font-mono text-emerald-400 text-[10px] font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyber-grey-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                API Contract
              </span>
              <span className="font-mono text-cyber-grey-300 text-[10px] font-medium">FastAPI:8000</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyber-maroon-800 flex items-center justify-center text-white font-bold text-xs border border-cyber-maroon-600/70">
                TC
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-tight">SecOps Lead</p>
                <p className="text-[9px] text-cyber-grey-400 font-mono">SOC Analyst Console</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-cyber-grey-400 hover:text-white cursor-pointer" />
          </div>
        </div>
      </aside>
    </>
  );
}
