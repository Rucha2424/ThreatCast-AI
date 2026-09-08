import React, { useState, useRef, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';

export default function InfoTooltip({
  title,
  whatItMeasures,
  whyItMatters,
  interpretation,
  technicalNote,
  size = 'sm',
  align = 'center',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const alignStyles = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 rounded-full text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
        aria-label={title ? `Help for ${title}` : 'More information'}
      >
        <HelpCircle className={`${iconSizes[size] || 'w-3.5 h-3.5'} transition-transform hover:scale-110`} />
      </button>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 ${alignStyles[align] || alignStyles.center} z-50 w-72 sm:w-80 p-4 rounded-xl bg-cyber-surface border border-slate-700 shadow-2xl text-left text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-auto text-slate-200`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-800">
            <div className="w-5 h-5 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Info className="w-3 h-3" />
            </div>
            <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
              {title || 'Security Context'}
            </span>
          </div>

          <div className="space-y-2.5 leading-relaxed">
            {whatItMeasures && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-0.5">
                  What This Measures:
                </span>
                <p className="text-xs text-slate-300">{whatItMeasures}</p>
              </div>
            )}

            {whyItMatters && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block mb-0.5">
                  Why It Matters:
                </span>
                <p className="text-xs text-slate-300">{whyItMatters}</p>
              </div>
            )}

            {interpretation && (
              <div className="p-2.5 rounded-lg bg-cyber-card border border-slate-800">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block mb-0.5">
                  Interpretation:
                </span>
                <p className="text-[11px] text-slate-300 font-medium">{interpretation}</p>
              </div>
            )}

            {technicalNote && (
              <div className="pt-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                <strong className="text-slate-300">Technical: </strong>
                {technicalNote}
              </div>
            )}
          </div>

          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2.5 h-2.5 bg-cyber-surface border-r border-b border-slate-700 rotate-45" />
        </div>
      )}
    </div>
  );
}
