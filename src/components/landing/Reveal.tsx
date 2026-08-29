import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  index?: number;
  className?: string;
  /** Play on mount instead of waiting for the element to scroll into view.
      Use for above-the-fold content, which may already be past the observer's
      trigger band by the time it is registered. */
  immediate?: boolean;
};

export function Reveal({ children, index = 0, className }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// A heading that wipes up from behind a clipping edge — used for section
// titles so each block announces itself without another fade.
export function RevealLine({ children, index = 0, className, immediate = false }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <span className={className}>{children}</span>;
  }

  // The trigger lives on the mask, not on the moving span. The span starts
  // translated 110% down — outside the mask's clip box — so observing it
  // directly means the reveal can simply never fire.
  const play = immediate ? { animate: 'visible' } : ({ whileInView: 'visible', viewport: { once: true, amount: 0.2 } } as const);

  return (
    <motion.span className="bs-mask" initial="hidden" {...play}>
      <motion.span
        className={className}
        variants={{ hidden: { y: '110%' }, visible: { y: '0%' } }}
        transition={{ duration: 0.6, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
