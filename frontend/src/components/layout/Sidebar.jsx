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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#fcfaf7] text-[#42240f] border-r border-[#ebdcc7] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#ebdcc7] bg-[#f7f2ea]/80">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#d97706] to-[#78350f] p-0.5 shadow-sm">
              <div className="w-full h-full bg-[#fdfcf9] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#b45309]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-sm text-[#301a0a] font-mono">
                  THREATCAST
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                  AI
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-[#7a644c] uppercase font-semibold">
                Neural Defence Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7a644c] hover:text-[#301a0a] hover:bg-[#f5efe6] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#998165] font-mono">
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
                      ? 'bg-[#f5efe6] text-[#78350f] border-l-3 border-[#b45309] font-bold shadow-xs'
                      : 'text-[#544230] hover:text-[#221207] hover:bg-[#f7f2ea]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-[#b45309]'
                          : 'text-[#998165] group-hover:text-[#b45309]'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'forecast' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
                        K=3
                      </span>
                    )}
                    {item.id === 'disagreements' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
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
        <div className="p-4 border-t border-[#ebdcc7] bg-[#f7f2ea]/60 space-y-2.5">
          <div className="p-3 rounded-xl bg-white border border-[#ebdcc7] space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#7a644c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#65a30d]" />
                Neural FastRP Engine
              </span>
              <span className="font-mono text-[#4d7c0f] text-[10px] font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#7a644c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                API Contract
              </span>
              <span className="font-mono text-[#544230] text-[10px] font-medium">FastAPI:8000</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#f5efe6] flex items-center justify-center text-[#542e14] font-bold text-xs border border-[#ded0bc]">
                TC
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#301a0a] leading-tight">SecOps Lead</p>
                <p className="text-[9px] text-[#7a644c] font-mono">SOC Analyst Console</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-[#998165] hover:text-[#301a0a] cursor-pointer" />
          </div>
        </div>
      </aside>
    </>
  );
}
