import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export default function PageHeader({ title, subtitle, badge, action }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-tc-border"
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-threatcast-text">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber">
              <Sparkles className="w-3 h-3 text-threatcast-cyan" />
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-threatcast-silver font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </motion.div>
  );
}
