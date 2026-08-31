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
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-cyber-brown-950 text-cyber-beige-200 border-r border-cyber-brown-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyber-brown-800 bg-cyber-brown-900/60">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-cyber-brown-600 to-cyber-amber-900 p-0.5 shadow-lg shadow-amber-950/50">
              <div className="w-full h-full bg-cyber-obsidian rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-sm text-cyber-beige-50 font-mono">
                  THREATCAST
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-cyber-beige-400 uppercase font-semibold">
                Neural Defence Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cyber-beige-400 hover:text-white hover:bg-cyber-brown-900/80 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-cyber-beige-400 font-mono">
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
                      ? 'bg-gradient-to-r from-cyber-brown-800 via-cyber-amber-950 to-transparent text-white border-l-2 border-amber-500 shadow-md shadow-amber-950/40'
                      : 'text-cyber-beige-300 hover:text-white hover:bg-cyber-brown-900/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-amber-400'
                          : 'text-cyber-beige-400 group-hover:text-amber-300'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'forecast' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        K=3
                      </span>
                    )}
                    {item.id === 'disagreements' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
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
        <div className="p-4 border-t border-cyber-brown-800 bg-cyber-brown-950/80 space-y-2.5">
          <div className="p-3 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyber-beige-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_#84cc16]" />
                Neural FastRP Engine
              </span>
              <span className="font-mono text-lime-400 text-[10px] font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyber-beige-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                API Contract
              </span>
              <span className="font-mono text-cyber-beige-300 text-[10px] font-medium">FastAPI:8000</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyber-brown-800 flex items-center justify-center text-cyber-beige-100 font-bold text-xs border border-amber-700/60">
                TC
              </div>
              <div>
                <p className="text-[11px] font-bold text-cyber-beige-50 leading-tight">SecOps Lead</p>
                <p className="text-[9px] text-cyber-beige-400 font-mono">SOC Analyst Console</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-cyber-beige-400 hover:text-white cursor-pointer" />
          </div>
        </div>
      </aside>
    </>
  );
}
