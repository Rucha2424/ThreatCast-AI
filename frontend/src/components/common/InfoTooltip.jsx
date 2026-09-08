import React, { useState, useRef, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';

/**
 * InfoTooltip — Accessible, tap & hover friendly contextual explainer.
 * Displays "What it measures", "Why it matters", and "Interpretation".
 */
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
        className="p-0.5 rounded-full text-[#998165] hover:text-[#b45309] hover:bg-[#fef3c7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#b45309]"
        aria-label={title ? `Help for ${title}` : 'More information'}
      >
        <HelpCircle className={`${iconSizes[size]} transition-transform hover:scale-110`} />
      </button>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 ${alignStyles[align]} z-50 w-72 sm:w-80 p-4 rounded-xl bg-white border border-[#ebdcc7] shadow-xl text-left text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-auto`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-[#ebdcc7]">
            <div className="w-5 h-5 rounded-md bg-[#fef3c7] text-[#b45309] flex items-center justify-center shrink-0">
              <Info className="w-3 h-3" />
            </div>
            <span className="font-bold text-[#221207] text-xs tracking-tight">
              {title || 'Security Context'}
            </span>
          </div>

          <div className="space-y-2.5 leading-relaxed text-[#544230]">
            {whatItMeasures && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block mb-0.5">
                  What This Measures:
                </span>
                <p className="text-xs text-[#301a0a]">{whatItMeasures}</p>
              </div>
            )}

            {whyItMatters && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#b45309] block mb-0.5">
                  Why It Matters:
                </span>
                <p className="text-xs text-[#42240f]">{whyItMatters}</p>
              </div>
            )}

            {interpretation && (
              <div className="p-2 rounded-lg bg-[#fcfaf7] border border-[#ebdcc7]">
                <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block mb-0.5">
                  Interpretation:
                </span>
                <p className="text-[11px] text-[#221207] font-medium">{interpretation}</p>
              </div>
            )}

            {technicalNote && (
              <div className="pt-1.5 border-t border-[#f5efe6] text-[10px] font-mono text-[#7a644c]">
                <strong className="text-[#998165]">Technical: </strong>
                {technicalNote}
              </div>
            )}
          </div>

          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2.5 h-2.5 bg-white border-r border-b border-[#ebdcc7] rotate-45" />
        </div>
      )}
    </div>
  );
}
