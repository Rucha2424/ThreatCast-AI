import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * A small, consistent viewport reveal for dashboard sections and cards.
 * It respects the user's reduced-motion setting and avoids hiding content
 * when JavaScript animation is unavailable.
 */
export default function MotionReveal({
  children,
  className = '',
  delay = 0,
  hover = false,
}) {
  const reduceMotion = useReducedMotion();
  // Sections below the fold rise into place as they enter the viewport.
  // The longer easing makes the movement noticeable without feeling sluggish.
  const reveal = { opacity: 1, y: 0 };

  return (
    <motion.div
      className={className}
      initial={reveal}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: reduceMotion ? 0 : 0.68, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover && !reduceMotion ? { y: -4, scale: 1.01, transition: { duration: 0.24 } } : undefined}
    >
      {children}
    </motion.div>
  );
}
