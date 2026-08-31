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
  Radio,
  Server,
  Settings,
  User,
  X,
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
          className="fixed inset-0 z-40 bg-soc-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-soc-navy-950 text-soc-slate-300 border-r border-soc-navy-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-soc-navy-800/80">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-soc-navy-800 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-soc-navy-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-sm text-white font-mono">
                  THREATCAST
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-soc-slate-400 uppercase font-semibold">
                AI Network Defence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-soc-slate-400 hover:text-white hover:bg-soc-navy-850 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-soc-slate-500">
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
                      ? 'bg-gradient-to-r from-soc-ai/20 to-transparent text-white border-l-2 border-soc-ai shadow-sm'
                      : 'text-soc-slate-400 hover:text-soc-slate-200 hover:bg-soc-navy-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-indigo-400'
                          : 'text-soc-slate-400 group-hover:text-soc-slate-200'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'forecast' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
        <div className="p-4 border-t border-soc-navy-800/80 bg-soc-navy-950/80 space-y-2.5">
          <div className="p-3 rounded-xl bg-soc-navy-900/90 border border-soc-navy-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-soc-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-soc-secure animate-pulse" />
                AI Engine
              </span>
              <span className="font-mono text-soc-secure text-[10px] font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-soc-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                API Contract
              </span>
              <span className="font-mono text-soc-slate-300 text-[10px] font-medium">FastAPI:8000</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 px-1 text-soc-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-soc-navy-800 flex items-center justify-center text-soc-slate-300 font-semibold text-xs border border-soc-navy-700">
                TC
              </div>
              <div>
                <p className="text-[11px] font-semibold text-soc-slate-200 leading-tight">SecOps Lead</p>
                <p className="text-[9px] text-soc-slate-500">Analyst Station</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-soc-slate-400 hover:text-soc-slate-200 cursor-pointer" />
          </div>
        </div>
      </aside>
    </>
  );
}
