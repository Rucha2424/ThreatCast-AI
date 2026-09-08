import React, { useState } from 'react';
import { ChevronDown, Code2, Database, Shield } from 'lucide-react';

/**
 * ProgressiveDisclosure — 3rd-tier collapsible container for technical depth.
 * Keeps the primary view clean for non-technical users while allowing analysts to drill down.
 */
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
    <div className={`rounded-xl border border-[#ebdcc7] bg-[#fcfaf7] overflow-hidden transition-all duration-200 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f5efe6] transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#fffbeb] border border-[#fde68a] text-[#b45309] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#301a0a] tracking-tight flex items-center gap-2">
            {title}
            {badge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#f5efe6] text-[#7a644c] border border-[#ded0bc]">
                {badge}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#7a644c] text-xs font-mono">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isOpen ? 'Hide Details' : 'Expand Technical Details'}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#b45309]' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-white border-t border-[#ebdcc7] text-xs space-y-3 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
}
