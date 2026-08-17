"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useInView,
  animate,
} from "framer-motion";
import { lerpKeyframes, useSegmentMotion } from "../lib/scrollMotion";

/* ============================================================
   The Compete -> Improve -> Celebrate scroll story. Desktop (and
   anyone without prefers-reduced-motion set) gets a pinned,
   scroll-scrubbed sequence: one tall (300vh) wrapper with a
   sticky 100vh stage inside it, where scroll position drives
   opacity/scale/position directly via Framer Motion's
   useScroll + useTransform — the animation IS the scroll, not
   triggered by it.

   Each phase is a short sequence of REAL screenshots of the real
   Grade Arena app (Dashboard, Classes, and two small real components
   built for the parts of the story the app doesn't have live yet —
   ChallengeInviteCard and FeedPreview, styled with the app's actual
   design system, not illustrated). Scrolling zooms the camera into a
   specific real detail on each screenshot — the Accept button, the
   grade that just landed, the reaction counts — then the next beat
   swaps in the next real screenshot. Scrolling forward plays the
   sequence forward; scrolling back reverses it — true scrubbing.

   Mobile and reduced-motion both get a simpler fallback: the same
   three scenes, stacked normally, each auto-playing its own zoom
   sequence once when it scrolls into view (no pinning, no
   scroll-jacking) — true scroll-jacking is more likely to feel
   broken than premium on touch devices, and must be skippable for
   anyone who asked for less motion, in which case the clip resolves
   straight to its final frame instead of animating.
   ============================================================ */

const SEG = [0, 1 / 3, 2 / 3, 1];

function Beat({ progress, index, children }) {
  const { opacity, y } = useSegmentMotion(progress, SEG[index], SEG[index + 1], {
    fadeIn: index > 0,
    fadeOut: index < 2,
  });
  return (
    <motion.div className="gr-scene-beat" style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

// One real screenshot, zoomed toward `origin` (a CSS transform-origin
// percentage pair pointing at the specific real detail this beat is
// about) as the beat plays. `frame` picks how it sits in its window:
// "screen" full-bleed-crops a real full-page app screenshot; "card" is
// for the small standalone component screenshots, shown whole.
function ZoomShot({ progress, index, src, origin, from, to, frame, chrome, alt }) {
  const scale = useTransform(progress, (v) =>
    lerpKeyframes(v, [SEG[index], SEG[index + 1]], [from, to])
  );
  return (
    <div className={`gr-scene-shot ${frame}`}>
      {chrome && (
        <div className="gr-scene-shot-chrome">
          <span />
          <span />
          <span />
        </div>
      )}
      <motion.img
        src={src}
        alt={alt}
        className={`gr-scene-shot-img ${frame === "screen" ? "cover" : "contain"}`}
        style={{ scale, transformOrigin: origin }}
      />
    </div>
  );
}

function ChallengeVisual({ progress }) {
  return (
    <div className="gr-scene gr-scene-compete">
      <Beat progress={progress} index={0}>
        <ZoomShot
          progress={progress}
          index={0}
          src="/story/compete-invite.png"
          origin="50% 50%"
          from={1}
          to={1.12}
          frame="card"
          alt="Grade Arena challenge invite from Alex M."
        />
      </Beat>
      <Beat progress={progress} index={1}>
        <ZoomShot
          progress={progress}
          index={1}
          src="/story/compete-invite.png"
          origin="83% 68%"
          from={1.2}
          to={2.6}
          frame="card"
          alt="Accepting the challenge invite"
        />
      </Beat>
      <Beat progress={progress} index={2}>
        <ZoomShot
          progress={progress}
          index={2}
          src="/story/compete-accepted.png"
          origin="50% 55%"
          from={1.5}
          to={1.05}
          frame="card"
          alt="Head-to-head GPA race against Alex M."
        />
      </Beat>
    </div>
  );
}

function AverageVisual({ progress }) {
  return (
    <div className="gr-scene gr-scene-improve">
      <Beat progress={progress} index={0}>
        <ZoomShot
          progress={progress}
          index={0}
          src="/story/improve-before.png"
          origin="52% 78%"
          from={1.1}
          to={1.7}
          frame="screen"
          chrome
          alt="Logging a grade for Chemistry 101 in Grade Arena"
        />
      </Beat>
      <Beat progress={progress} index={1}>
        <ZoomShot
          progress={progress}
          index={1}
          src="/story/improve-after.png"
          origin="50% 61%"
          from={1.6}
          to={2.3}
          frame="screen"
          chrome
          alt="New grade landing and the class average updating"
        />
      </Beat>
      <Beat progress={progress} index={2}>
        <ZoomShot
          progress={progress}
          index={2}
          src="/story/improve-dashboard.png"
          origin="26% 14%"
          from={1.9}
          to={1.15}
          frame="screen"
          chrome
          alt="Live GPA climbing on the Grade Arena dashboard"
        />
      </Beat>
    </div>
  );
}

function FeedVisual({ progress }) {
  return (
    <div className="gr-scene gr-scene-celebrate">
      <Beat progress={progress} index={0}>
        <ZoomShot
          progress={progress}
          index={0}
          src="/story/celebrate-composing.png"
          origin="50% 50%"
          from={1}
          to={1.12}
          frame="card"
          alt="Ready to share a Grade Arena win"
        />
      </Beat>
      <Beat progress={progress} index={1}>
        <ZoomShot
          progress={progress}
          index={1}
          src="/story/celebrate-composing.png"
          origin="80% 40%"
          from={1.2}
          to={2.5}
          frame="card"
          alt="Posting the win to the feed"
        />
      </Beat>
      <Beat progress={progress} index={2}>
        <ZoomShot
          progress={progress}
          index={2}
          src="/story/celebrate-final.png"
          origin="83% 60%"
          from={1.6}
          to={1.05}
          frame="card"
          alt="Friends reacting to the win in the feed"
        />
      </Beat>
    </div>
  );
}

const PHASES = [
  {
    key: "compete",
    word: "COMPETE",
    color: "violet",
    copy: "Accept the challenge. Race for the grade.",
    Visual: ChallengeVisual,
  },
  {
    key: "improve",
    word: "IMPROVE",
    color: "cyan",
    copy: "Post a grade. Watch your average climb.",
    Visual: AverageVisual,
  },
  {
    key: "celebrate",
    word: "CELEBRATE",
    color: "gold",
    copy: "Share the win. Let your friends celebrate with you.",
    Visual: FeedVisual,
  },
];

const B1 = 1 / 3;
const B2 = 2 / 3;
const FADE = 0.07;
const PHASE_RANGES = [
  [0, B1],
  [B1, B2],
  [B2, 1],
];

function PhaseLayer({ phase, index, scrollYProgress }) {
  let inputRange, opacityKf, scaleKf, yKf;
  if (index === 0) {
    // No entrance ramp here (unlike the other two phases): this is the
    // first thing the pinned stage shows, arriving right as the hero
    // section's own scroll-linked exit finishes fading it out, so it
    // needs to already be fully visible the instant the pin engages —
    // otherwise there's a blank beat between the two.
    inputRange = [0, B1 - FADE, B1];
    opacityKf = [1, 1, 0];
    scaleKf = [1, 1, 0.95];
    yKf = [0, 0, -22];
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

  const [rangeStart, rangeEnd] = PHASE_RANGES[index];
  const localProgress = useTransform(scrollYProgress, (v) => {
    const t = (v - rangeStart) / (rangeEnd - rangeStart);
    return Math.max(0, Math.min(1, t));
  });

  const Visual = phase.Visual;
  return (
    <motion.div className={`gr-story-phase ${phase.color}`} style={{ opacity, scale, y }}>
      <h2 className="gr-story-word">{phase.word}</h2>
      <p className="gr-story-phase-copy">{phase.copy}</p>
      <Visual progress={localProgress} />
    </motion.div>
  );
}

function ProgressDot({ index, scrollYProgress, color }) {
  const [start, end] = PHASE_RANGES[index];
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

function AutoPlayVisual({ Visual }) {
  const progress = useMotionValue(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { duration: 2.8, ease: "easeInOut", delay: 0.2 });
    return () => controls.stop();
  }, [inView, reduceMotion, progress]);

  return (
    <div ref={ref}>
      <Visual progress={progress} />
    </div>
  );
}

function SequentialStory() {
  return (
    <div className="gr-sequential-story">
      {PHASES.map((p) => (
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
          <AutoPlayVisual Visual={p.Visual} />
        </motion.div>
      ))}
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
