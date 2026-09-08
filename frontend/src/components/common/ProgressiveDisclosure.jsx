import React, { useState } from 'react';
import { ChevronDown, Code2, Database, Shield } from 'lucide-react';

export default function ProgressiveDisclosure({
  title = 'Technical Details & Evidence',
  badge = 'Level 3 Deep Dive',
  icon = Code2,
  children,
  defaultOpen = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = icon;

  return (
    <div className={`rounded-xl border border-slate-800 bg-cyber-card overflow-hidden transition-all duration-200 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/80 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
            {title}
            {badge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                {badge}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isOpen ? 'Hide Details' : 'Expand Technical Details'}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-400' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-cyber-surface border-t border-slate-800 text-xs space-y-3 animate-in fade-in duration-150 text-slate-200">
          {children}
        </div>
      )}
    </div>
  );
}
