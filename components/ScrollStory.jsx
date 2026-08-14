"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/* ============================================================
   The Compete -> Improve -> Celebrate scroll story. Desktop (and
   anyone without prefers-reduced-motion set) gets a pinned,
   scroll-scrubbed sequence: one tall (300vh) wrapper with a
   sticky 100vh stage inside it, where scroll position drives
   opacity/scale/position directly via Framer Motion's
   useScroll + useTransform — the animation IS the scroll, not
   triggered by it.

   Mobile and reduced-motion both get a simpler fallback: the
   same three visuals, same copy, just stacked normally and
   revealed once each scrolls into view (no pinning, no scrubbing)
   — true scroll-jacking is more likely to feel broken than
   premium on touch devices, and must be skippable for anyone who
   asked for less motion.
   ============================================================ */

const PHASES = [
  {
    key: "compete",
    word: "COMPETE",
    color: "violet",
    copy: "Challenge a friend. Race for the grade.",
    Visual: RivalryVisual,
  },
  {
    key: "improve",
    word: "IMPROVE",
    color: "cyan",
    copy: "Watch your average climb — see exactly what it takes.",
    Visual: GraphVisual,
  },
  {
    key: "celebrate",
    word: "CELEBRATE",
    color: "gold",
    copy: "Every win, recognized. Every milestone, celebrated.",
    Visual: CelebrateVisual,
  },
];

function RivalryVisual() {
  return (
    <div className="gr-story-mock gr-rivalry-mock">
      <div className="gr-rivalry-row">
        <div className="gr-rivalry-side">
          <div className="gr-rivalry-avatar you">YOU</div>
          <div className="gr-rivalry-name">You</div>
        </div>
        <div className="gr-rivalry-vs">VS</div>
        <div className="gr-rivalry-side">
          <div className="gr-rivalry-avatar rival">AM</div>
          <div className="gr-rivalry-name">Alex M.</div>
        </div>
      </div>
      <div className="gr-rivalry-track">
        <div className="gr-rivalry-fill" />
      </div>
      <p className="gr-story-mock-caption">
        You're <b>0.12</b> ahead in Chemistry 101 — momentum building.
      </p>
    </div>
  );
}

function GraphVisual() {
  return (
    <div className="gr-story-mock gr-graph-mock">
      <svg viewBox="0 0 280 130" className="gr-graph-svg" preserveAspectRatio="none">
        <line x1="0" y1="26" x2="280" y2="26" className="gr-graph-target" />
        <polyline points="0,112 56,98 112,82 168,60 224,40 280,24" className="gr-graph-you" />
        <polyline points="0,116 56,110 112,102 168,95 224,90 280,86" className="gr-graph-rival" />
      </svg>
      <div className="gr-graph-legend">
        <span>
          <i className="you" /> You
        </span>
        <span>
          <i className="rival" /> Alex M.
        </span>
        <span>
          <i className="target" /> Target: A
        </span>
      </div>
      <p className="gr-story-mock-caption">
        Average <b>88%+</b> on remaining work to reach A.
      </p>
    </div>
  );
}

function CelebrateVisual() {
  return (
    <div className="gr-story-mock gr-celebrate-mock">
      <div className="gr-celebrate-card">
        <span className="gr-celebrate-icon">🏆</span>
        <div className="gr-celebrate-body">
          <div className="gr-celebrate-title">Won the Chemistry 101 Rivalry</div>
          <div className="gr-celebrate-sub">+50 XP</div>
        </div>
        <div className="gr-celebrate-reactions">🔥 8 · 👏 12</div>
      </div>
      <div className="gr-celebrate-card">
        <span className="gr-celebrate-icon">⭐</span>
        <div className="gr-celebrate-body">
          <div className="gr-celebrate-title">Reached Honor Roll — 3.90 GPA</div>
          <div className="gr-celebrate-sub">+100 XP</div>
        </div>
        <div className="gr-celebrate-reactions">🎉 15 · 👏 6</div>
      </div>
    </div>
  );
}

const B1 = 1 / 3;
const B2 = 2 / 3;
const FADE = 0.07;

// Manual clamped piecewise-linear interpolation, used instead of
// useTransform's array-keyframes overload — that overload produced
// visibly wrong (stuck) output for one specific phase in testing here;
// this function-based form sidesteps whatever that was.
function lerpKeyframes(v, inputRange, outputRange) {
  if (v <= inputRange[0]) return outputRange[0];
  if (v >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
  for (let i = 0; i < inputRange.length - 1; i++) {
    const a = inputRange[i];
    const b = inputRange[i + 1];
    if (v >= a && v <= b) {
      const t = b === a ? 0 : (v - a) / (b - a);
      return outputRange[i] + (outputRange[i + 1] - outputRange[i]) * t;
    }
  }
  return outputRange[outputRange.length - 1];
}

function PhaseLayer({ phase, index, scrollYProgress }) {
  let inputRange, opacityKf, scaleKf, yKf;
  if (index === 0) {
    inputRange = [0, 0.04, B1 - FADE, B1];
    opacityKf = [0, 1, 1, 0];
    scaleKf = [0.94, 1, 1, 0.95];
    yKf = [26, 0, 0, -22];
  } else if (index === 1) {
    inputRange = [B1 - FADE, B1, B2 - FADE, B2];
    opacityKf = [0, 1, 1, 0];
    scaleKf = [0.95, 1, 1, 0.95];
    yKf = [22, 0, 0, -22];
  } else {
    inputRange = [B2 - FADE, B2, 1];
    opacityKf = [0, 1, 1];
    scaleKf = [0.95, 1, 1];
    yKf = [22, 0, 0];
  }

  const opacity = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, opacityKf));
  const scale = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, scaleKf));
  const y = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, yKf));

  const Visual = phase.Visual;
  return (
    <motion.div className={`gr-story-phase ${phase.color}`} style={{ opacity, scale, y }}>
      <h2 className="gr-story-word">{phase.word}</h2>
      <p className="gr-story-phase-copy">{phase.copy}</p>
      <Visual />
    </motion.div>
  );
}

function ProgressDot({ index, scrollYProgress, color }) {
  const ranges = [
    [0, B1],
    [B1, B2],
    [B2, 1],
  ];
  const [start, end] = ranges[index];
  const mid = (start + end) / 2;
  const dotRange = [start, mid, end];
  const scale = useTransform(scrollYProgress, (v) => lerpKeyframes(v, dotRange, [0.55, 1.3, 0.55]));
  const opacity = useTransform(scrollYProgress, (v) => lerpKeyframes(v, dotRange, [0.3, 1, 0.3]));
  return <motion.span className={`gr-story-dot ${color}`} style={{ scale, opacity }} />;
}

function PinnedStory() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // [R,G,B] per phase for a manual lerp — see lerpKeyframes' comment for
  // why this avoids useTransform's array-keyframes overload.
  const GLOW_STOPS = [
    [139, 92, 255],
    [59, 231, 255],
    [255, 200, 87],
  ];
  const glowBg = useTransform(scrollYProgress, (v) => {
    const t = Math.max(0, Math.min(1, v));
    const seg = t < 0.5 ? 0 : 1;
    const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const [r1, g1, b1] = GLOW_STOPS[seg];
    const [r2, g2, b2] = GLOW_STOPS[seg + 1];
    const r = Math.round(r1 + (r2 - r1) * localT);
    const g = Math.round(g1 + (g2 - g1) * localT);
    const b = Math.round(b1 + (b2 - b1) * localT);
    return `radial-gradient(circle, rgba(${r},${g},${b},0.32), transparent 70%)`;
  });

  return (
    <div ref={ref} className="gr-story-pin-wrap">
      <div className="gr-story-stage">
        <motion.div className="gr-story-glow" style={{ background: glowBg }} />
        <div className="gr-story-progress-rail">
          {PHASES.map((p, i) => (
            <ProgressDot key={p.key} index={i} scrollYProgress={scrollYProgress} color={p.color} />
          ))}
        </div>
        {PHASES.map((p, i) => (
          <PhaseLayer key={p.key} phase={p} index={i} scrollYProgress={scrollYProgress} />
        ))}
      </div>
    </div>
  );
}

function SequentialStory() {
  return (
    <div className="gr-sequential-story">
      {PHASES.map((p) => {
        const Visual = p.Visual;
        return (
          <motion.div
            key={p.key}
            className={`gr-story-phase-static ${p.color}`}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="gr-story-word">{p.word}</h2>
            <p className="gr-story-phase-copy">{p.copy}</p>
            <Visual />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ScrollStory() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {!reduceMotion && (
        <div className="gr-story-desktop-only">
          <PinnedStory />
        </div>
      )}
      <div className={reduceMotion ? undefined : "gr-story-mobile-only"}>
        <SequentialStory />
      </div>
    </>
  );
}
