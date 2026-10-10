import React from "react";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Network,
  GitCompare,
  ShieldAlert,
  Sparkles,
  Settings,
  X,
} from "lucide-react";
import { GiShieldBash } from 'react-icons/gi';

import { NAV_ITEMS } from "../../utils/constants";

const ICON_MAP = {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Network,
  GitCompare,
  ShieldAlert,
  Sparkles,
};

// Small, muted labels for nav items that need a secondary tag.
// Kept deliberately quiet (no neon/glow) so they read as metadata,
// not as decoration competing with the primary label.
const NAV_TAGS = {
  forecast: "LSTM",
  disagreements: "Signal",
};

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* MOBILE BACKDROP */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-64
          flex flex-col
          bg-threatcast-card text-threatcast-silver
          border-r border-white/[0.06]
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* BRAND */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-threatcast-cyan flex items-center justify-center shrink-0">
                <GiShieldBash className="h-5 w-5 text-black" aria-hidden="true" />
              </div>

              <div>
                <span className="rounded-md bg-threatcast-cyan px-2 py-1 font-bold tracking-wide text-sm text-threatcast-deep">
                  ThreatCast AI
                </span>
                <p className="mt-0.5 text-[10px] tracking-wide text-threatcast-muted uppercase font-medium">
                  Early Warning Engine
                </p>
              </div>
            </div>

            {/* MOBILE CLOSE */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-threatcast-muted hover:text-white hover:bg-threatcast-elevated/70 transition-colors"
              aria-label="Close navigation"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-threatcast-muted">
            Navigation
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            const tag = NAV_TAGS[item.id];

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-threatcast-elevated/70 text-white"
                      : "text-threatcast-muted hover:text-white hover:bg-threatcast-elevated/70"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-threatcast-cyan" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-threatcast-cyan" : "text-threatcast-muted"
                      }`}
                    />

                    <span className="flex-1 truncate">{item.label}</span>

                    {tag && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-threatcast-elevated/70 text-threatcast-muted">
                        {tag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          {/* USER */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-threatcast-elevated flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                TC
              </div>

              <div>
                <p className="text-[11px] font-semibold text-white leading-tight">
                  Security Analyst
                </p>
                <p className="mt-0.5 text-[10px] text-threatcast-muted">
                  SOC Console
                </p>
              </div>
            </div>

            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-threatcast-muted hover:text-white hover:bg-threatcast-elevated/70 transition-colors"
              aria-label="Settings"
              type="button"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
