import React from 'react';
import { Sparkles } from 'lucide-react';

export default function PageHeader({ title, subtitle, badge, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-cyber-brown-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-cyber-beige-300 font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
