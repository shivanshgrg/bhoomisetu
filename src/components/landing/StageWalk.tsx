import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export type WalkStage = {
  id: string;
  label: string;
  shortLabel: string;
  body: string;
};

// An articulated walk cycle: the thigh/knee/foot groups are nested so each
// joint rotates in its parent's rotated frame. `transform-box: view-box` (set
// in landing.css) pins every transform-origin to a viewBox coordinate, which
// is what makes the chain read as a leg rather than three sliding sticks.
function Walker() {
  return (
    <svg className="bs-walker" viewBox="0 0 24 48" aria-hidden="true">
      <g className="bs-walk-bob">
        <g className="bs-walk-limb bs-walk-back">
          <g className="bs-walk-arm">
            <line x1="12" y1="15" x2="12" y2="24" />
          </g>
          <g className="bs-walk-thigh">
            <line x1="12" y1="27" x2="12" y2="37" />
            <g className="bs-walk-knee">
              <line x1="12" y1="37" x2="12" y2="45" />
              <g className="bs-walk-foot">
                <line x1="12" y1="45" x2="16.4" y2="45" />
              </g>
            </g>
          </g>
        </g>

        <g className="bs-walk-torso">
          <circle cx="12" cy="7" r="4.2" />
          <line x1="12" y1="11.4" x2="12" y2="27" />
        </g>

        <g className="bs-walk-limb bs-walk-front">
          <g className="bs-walk-thigh">
            <line x1="12" y1="27" x2="12" y2="37" />
            <g className="bs-walk-knee">
              <line x1="12" y1="37" x2="12" y2="45" />
              <g className="bs-walk-foot">
                <line x1="12" y1="45" x2="16.4" y2="45" />
              </g>
            </g>
          </g>
          <g className="bs-walk-arm">
            <line x1="12" y1="15" x2="12" y2="24" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 960px)');
    const sync = () => setIsCompact(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isCompact;
}

export function StageWalk({ stages }: { stages: WalkStage[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isCompact = useIsCompact();
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const lastIndex = stages.length - 1;
  const walkerX = useTransform(scrollYProgress, [0.04, 0.96], ['0%', '100%'], { clamp: true });
  const fillWidth = useTransform(scrollYProgress, [0.04, 0.96], ['0%', '100%'], { clamp: true });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.max(0, Math.min(lastIndex, Math.round(value * lastIndex)));
    setActiveIndex(next);
  });

  // Reduced motion and narrow screens get the same plain list — no scrub, no
  // sticky viewport, every stage readable at once.
  if (prefersReducedMotion || isCompact) {
    return (
      <ol className="bs-journey-list">
        {stages.map((stage, index) => (
          <li className="bs-journey-list-item" key={stage.id}>
            <span className="bs-journey-list-index">{String(index + 1).padStart(2, '0')}</span>
            <h3>{stage.label}</h3>
            <p>{stage.body}</p>
          </li>
        ))}
      </ol>
    );
  }

  const active = stages[activeIndex];

  return (
    <div className="bs-journey-scroll" ref={sectionRef}>
      <div className="bs-journey-stage">
        <div className="bs-walk-scene">
          <div className="bs-walk-rail" />
          <motion.div className="bs-walk-rail-fill" style={{ width: fillWidth }} />

          {stages.map((stage, index) => (
            <div
              className={
                index <= activeIndex ? 'bs-walk-station bs-walk-station-done' : 'bs-walk-station'
              }
              key={stage.id}
              style={{ left: `${(index / lastIndex) * 100}%` }}
            >
              <span className="bs-walk-post" />
              <span className="bs-walk-dot" />
              <span className="bs-walk-label">{stage.shortLabel}</span>
            </div>
          ))}

          <motion.div className="bs-walk-figure" style={{ left: walkerX }}>
            <Walker />
          </motion.div>
        </div>

        <div className="bs-journey-readout">
          <span className="bs-journey-counter">
            {String(activeIndex + 1).padStart(2, '0')} <i>/</i> {String(stages.length).padStart(2, '0')}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <h3>{active.label}</h3>
              <p>{active.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
