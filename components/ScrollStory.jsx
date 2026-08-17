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
import { Swords, ArrowUpRight, Star, Flame, ThumbsUp, Trophy } from "lucide-react";
import { lerpKeyframes, useCameraPath, useGate, useMotionValueState } from "../lib/scrollMotion";

// On the pinned desktop stage the camera has a whole 100vh, 1180px-wide
// canvas to push around in. On the mobile/reduced-motion fallback the
// same scenes render at natural page width in normal flow, where that
// same zoom math would just crop content against a much narrower frame
// — so that path keeps the camera flat (no zoom) and leans on the live
// content animations (button press, counters, new rows) instead.
const FLAT_CAM = [
  { at: 0, scale: 1, x: 50, y: 50 },
  { at: 1, scale: 1, x: 50, y: 50 },
];

/* ============================================================
   The Compete -> Improve -> Celebrate scroll story: one pinned,
   scroll-scrubbed cinematic sequence. Each act is real, live-coded
   Grade Arena UI filling the whole stage (no screenshots, no small
   framed cards) — a single continuous "camera" (scale + transform
   origin, driven straight off scroll position via useCameraPath)
   pushes into specific real elements while they animate as if the
   product is actually being used: a button gets pressed, a rank
   climbs, a grade lands and the average ticks up, a post drops into
   the feed and reactions count in. Scrolling forward plays the shot
   forward; scrolling back reverses it — true scrubbing, not a
   triggered animation.

   Mobile and reduced-motion both get the same three scenes, full
   height, stacked in normal flow, each auto-playing its camera path
   once as it scrolls into view (no pinning, no scroll-jacking) — true
   scroll-jacking is more likely to feel broken than premium on touch
   devices, and must be skippable for anyone who asked for less
   motion, in which case the scene resolves straight to its final
   frame instead of animating.
   ============================================================ */

function SceneTitle({ progress, word, copy, color }) {
  const opacity = useTransform(progress, (v) => lerpKeyframes(v, [0, 0.1, 0.32, 0.4], [0, 1, 1, 0]));
  const scale = useTransform(progress, (v) => lerpKeyframes(v, [0, 0.1, 0.4], [0.94, 1.02, 1]));
  return (
    <motion.div className="gr-cine-title" style={{ opacity, scale }}>
      <h2 className={`gr-story-word ${color}`}>{word}</h2>
      <p className="gr-story-phase-copy">{copy}</p>
    </motion.div>
  );
}

function CompeteScene({ progress, cinematic = true }) {
  const cam = useCameraPath(
    progress,
    cinematic
      ? [
          { at: 0, scale: 1, x: 50, y: 50 },
          { at: 0.22, scale: 1.04, x: 50, y: 50 },
          { at: 0.48, scale: 1.5, x: 40, y: 44 },
          { at: 0.72, scale: 1.3, x: 50, y: 46 },
          { at: 1, scale: 1.16, x: 46, y: 44 },
        ]
      : FLAT_CAM
  );
  // The side panel (leaderboard) sits far enough right that zooming hard
  // into the main card would otherwise drag it half off-screen — dim it
  // out while the camera is pushed in, then bring it back before the
  // rank-climb plays. Not needed when the camera isn't zooming (mobile).
  const sideOpacity = useTransform(progress, (v) =>
    cinematic ? lerpKeyframes(v, [0.28, 0.42, 0.6, 0.68], [1, 0.15, 0.15, 1]) : 1
  );

  const acceptGate = useGate(progress, 0.5, 0.05);
  const acceptScale = useTransform(acceptGate, (g) => 1 - g * 0.12);
  const inviteOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.52, 0.6], [1, 0]));
  const raceOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.52, 0.6], [0, 1]));
  const fillWidth = useTransform(progress, (v) => `${lerpKeyframes(v, [0.6, 0.8], [0, 62])}%`);
  const lbAOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.68, 0.82], [1, 0]));
  const lbBOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.68, 0.82], [0, 1]));

  return (
    <motion.div className="gr-cine-cam" style={{ scale: cam.scale, transformOrigin: cam.transformOrigin }}>
      <div className="gr-cine-grid">
        <div className="gr-cine-panel main">
          <span className="gr-pillar-tag compete gr-cine-tag">compete</span>
          <div className="gr-cine-stack">
            <motion.div className="gr-cine-card" style={{ opacity: inviteOpacity }}>
              <div className="gr-cine-card-head">
                <div className="gr-avatar" style={{ background: "var(--surface-elevated)", color: "var(--text)" }}>
                  AM
                </div>
                <div>
                  <div className="gr-cine-card-title">Alex M. wants to compete</div>
                  <div className="gr-cine-card-sub">Chemistry 101 · Final grade</div>
                </div>
              </div>
              <div className="gr-cine-actions">
                <motion.button className="gr-btn primary" style={{ scale: acceptScale }}>
                  Accept
                </motion.button>
                <button className="gr-btn ghost">Decline</button>
              </div>
            </motion.div>

            <motion.div className="gr-cine-card" style={{ opacity: raceOpacity }}>
              <div className="gr-rivalry-pair" style={{ margin: "4px 0 18px" }}>
                <div className="gr-rivalry-side">
                  <div className="who">You</div>
                  <div className="gpa" style={{ color: "var(--accent-text)" }}>
                    3.78
                  </div>
                </div>
                <ArrowUpRight style={{ color: "var(--success-text)", flex: "none" }} />
                <div className="gr-rivalry-side">
                  <div className="who">Alex M.</div>
                  <div className="gpa">3.66</div>
                </div>
              </div>
              <div className="gr-momentum-track">
                <motion.div className="gr-momentum-fill" style={{ width: fillWidth }} />
              </div>
              <p className="gr-cine-note">You're 0.12 ahead in Chemistry 101 — momentum building.</p>
            </motion.div>
          </div>
        </div>

        <motion.div className="gr-cine-panel side" style={{ opacity: sideOpacity }}>
          <div className="gr-cine-card-title" style={{ marginBottom: 16 }}>
            Class leaderboard
          </div>
          <div className="gr-cine-stack">
            <motion.div className="gr-cine-lb" style={{ opacity: lbAOpacity }}>
              <div className="gr-cine-lb-row">
                <span className="rank">#1</span>
                <span className="name">Alex M.</span>
                <span className="val">3.66</span>
              </div>
              <div className="gr-cine-lb-row you">
                <span className="rank">#2</span>
                <span className="name">You</span>
                <span className="val">3.78</span>
              </div>
              <div className="gr-cine-lb-row">
                <span className="rank">#3</span>
                <span className="name">Priya K.</span>
                <span className="val">3.51</span>
              </div>
            </motion.div>
            <motion.div className="gr-cine-lb" style={{ opacity: lbBOpacity }}>
              <div className="gr-cine-lb-row you">
                <span className="rank">#1</span>
                <span className="name">You</span>
                <span className="val">3.78</span>
              </div>
              <div className="gr-cine-lb-row">
                <span className="rank">#2</span>
                <span className="name">Alex M.</span>
                <span className="val">3.66</span>
              </div>
              <div className="gr-cine-lb-row">
                <span className="rank">#3</span>
                <span className="name">Priya K.</span>
                <span className="val">3.51</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ImproveScene({ progress, cinematic = true }) {
  const cam = useCameraPath(
    progress,
    cinematic
      ? [
          { at: 0, scale: 1, x: 50, y: 50 },
          { at: 0.22, scale: 1.04, x: 50, y: 50 },
          { at: 0.46, scale: 1.5, x: 38, y: 52 },
          { at: 0.7, scale: 1.32, x: 62, y: 34 },
          { at: 1, scale: 1.18, x: 62, y: 36 },
        ]
      : FLAT_CAM
  );
  // The camera swings from the grade card (left) all the way to the GPA
  // ring (right) — dim whichever panel isn't currently in frame instead
  // of letting the rigid two-panel grid stretch/crop past the viewport.
  // Not needed when the camera isn't zooming (mobile, stacked panels).
  const mainOpacity = useTransform(progress, (v) =>
    cinematic ? lerpKeyframes(v, [0, 0.28, 0.58, 0.72], [1, 1, 1, 0.15]) : 1
  );
  const sideOpacity = useTransform(progress, (v) =>
    cinematic ? lerpKeyframes(v, [0, 0.28, 0.4, 0.6, 0.72], [1, 1, 0.15, 0.15, 1]) : 1
  );

  const newRowOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.42, 0.52], [0, 1]));
  const newRowY = useTransform(progress, (v) => lerpKeyframes(v, [0.42, 0.52], [12, 0]));
  const pctRaw = useTransform(progress, (v) => lerpKeyframes(v, [0.48, 0.64], [84, 87.5]));
  const pctWidth = useTransform(pctRaw, (v) => `${v}%`);
  const pctDisplay = useMotionValueState(useTransform(pctRaw, (v) => v.toFixed(1)));

  const gpaRaw = useTransform(progress, (v) => lerpKeyframes(v, [0.72, 0.92], [3.78, 4.09]));
  const gpaDisplay = useMotionValueState(useTransform(gpaRaw, (v) => v.toFixed(2)));
  const ringOffset = useTransform(gpaRaw, (v) => 251 - (v / 4.3) * 251);
  const xpWidth = useTransform(progress, (v) => `${lerpKeyframes(v, [0.72, 0.92], [40, 68])}%`);

  return (
    <motion.div className="gr-cine-cam" style={{ scale: cam.scale, transformOrigin: cam.transformOrigin }}>
      <div className="gr-cine-grid">
        <motion.div className="gr-cine-panel main" style={{ opacity: mainOpacity }}>
          <span className="gr-pillar-tag improve gr-cine-tag">improve</span>
          <div className="gr-cine-card">
            <div className="gr-cine-card-head-row">
              <div className="gr-cine-card-title">Chemistry 101</div>
              <div className="gr-cine-pct">{pctDisplay}%</div>
            </div>
            <div className="gr-pct-track" style={{ marginBottom: 16 }}>
              <motion.div className="gr-pct-fill" style={{ width: pctWidth, background: "var(--accent)" }} />
            </div>
            <div className="gr-cine-row">
              <span>Midterm 1</span>
              <span>84/100</span>
            </div>
            <motion.div className="gr-cine-row" style={{ opacity: newRowOpacity, y: newRowY }}>
              <span>Midterm 2</span>
              <span>91/100</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="gr-cine-panel side center" style={{ opacity: sideOpacity }}>
          <div className="gr-cine-ring">
            <svg width="150" height="150" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ strokeDashoffset: ringOffset }}
              />
            </svg>
            <div className="gr-cine-ring-label">
              <div className="gr-cine-gpa-value">{gpaDisplay}</div>
              <div className="gr-cine-gpa-sub">LIVE GPA</div>
            </div>
          </div>
          <div className="gr-cine-xp">
            <div className="gr-xp-track">
              <motion.div className="gr-xp-fill" style={{ width: xpWidth }} />
            </div>
            <div className="gr-xp-caption">
              <span>Lv. 4</span>
              <span>Lv. 5</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CelebrateScene({ progress, cinematic = true }) {
  const cam = useCameraPath(
    progress,
    cinematic
      ? [
          { at: 0, scale: 1, x: 50, y: 50 },
          { at: 0.22, scale: 1.04, x: 50, y: 50 },
          { at: 0.46, scale: 1.7, x: 60, y: 38 },
          { at: 0.7, scale: 1.4, x: 52, y: 46 },
          { at: 1, scale: 1.22, x: 55, y: 50 },
        ]
      : FLAT_CAM
  );

  const shareGate = useGate(progress, 0.5, 0.05);
  const shareScale = useTransform(shareGate, (g) => 1 - g * 0.12);
  const newPostOpacity = useTransform(progress, (v) => lerpKeyframes(v, [0.54, 0.66], [0, 1]));
  const newPostY = useTransform(progress, (v) => lerpKeyframes(v, [0.54, 0.66], [-18, 0]));
  const fire = useMotionValueState(useTransform(progress, (v) => Math.round(lerpKeyframes(v, [0.74, 0.92], [0, 8]))));
  const clap = useMotionValueState(useTransform(progress, (v) => Math.round(lerpKeyframes(v, [0.78, 0.95], [0, 12]))));

  return (
    <motion.div className="gr-cine-cam" style={{ scale: cam.scale, transformOrigin: cam.transformOrigin }}>
      <div className="gr-cine-grid single">
        <div className="gr-cine-panel main wide">
          <span className="gr-pillar-tag celebrate gr-cine-tag">celebrate</span>

          <div className="gr-cine-card gr-cine-share-row">
            <span className="gr-cine-share-label">
              <Star size={20} style={{ color: "var(--accent-text)", flex: "none" }} />
              Reached Honor Roll — 3.90 GPA
            </span>
            <motion.button className="gr-btn primary" style={{ scale: shareScale }}>
              Share to feed
            </motion.button>
          </div>

          <motion.div className="gr-feed-item gr-cine-feed-item" style={{ opacity: newPostOpacity, y: newPostY }}>
            <Star size={22} className="gr-feed-icon" />
            <div className="gr-feed-body">
              <div className="gr-feed-title">Reached Honor Roll — 3.90 GPA</div>
              <div className="gr-feed-sub">+100 XP</div>
            </div>
            <div className="gr-feed-reactions">
              <span>
                <Flame size={13} /> {fire}
              </span>
              <span>
                <ThumbsUp size={13} /> {clap}
              </span>
            </div>
          </motion.div>

          <div className="gr-feed-item gr-cine-feed-item muted">
            <Trophy size={22} className="gr-feed-icon" />
            <div className="gr-feed-body">
              <div className="gr-feed-title">Won the Chemistry 101 Rivalry</div>
              <div className="gr-feed-sub">+50 XP</div>
            </div>
            <div className="gr-feed-reactions">
              <span>
                <Flame size={13} /> 8
              </span>
              <span>
                <ThumbsUp size={13} /> 12
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const PHASES = [
  {
    key: "compete",
    word: "COMPETE",
    color: "violet",
    copy: "Accept the challenge. Race for the grade.",
    Scene: CompeteScene,
  },
  {
    key: "improve",
    word: "IMPROVE",
    color: "cyan",
    copy: "Post a grade. Watch your average climb.",
    Scene: ImproveScene,
  },
  {
    key: "celebrate",
    word: "CELEBRATE",
    color: "gold",
    copy: "Share the win. Let your friends celebrate with you.",
    Scene: CelebrateScene,
  },
];

const B1 = 1 / 3;
const B2 = 2 / 3;
const FADE = 0.06;
const PHASE_RANGES = [
  [0, B1],
  [B1, B2],
  [B2, 1],
];

function PhaseLayer({ phase, index, scrollYProgress }) {
  let inputRange, opacityKf, scaleKf, blurKf;
  if (index === 0) {
    // No entrance ramp here (unlike the other two phases): this is the
    // first thing the pinned stage shows, arriving right as the hero
    // section's own scroll-linked exit finishes fading it out, so it
    // needs to already be fully visible the instant the pin engages —
    // otherwise there's a blank beat between the two.
    inputRange = [0, B1 - FADE, B1];
    opacityKf = [1, 1, 0];
    scaleKf = [1, 1, 0.96];
    blurKf = [0, 0, 6];
  } else if (index === 1) {
    inputRange = [B1 - FADE, B1, B2 - FADE, B2];
    opacityKf = [0, 1, 1, 0];
    scaleKf = [1.04, 1, 1, 0.96];
    blurKf = [6, 0, 0, 6];
  } else {
    inputRange = [B2 - FADE, B2, 1];
    opacityKf = [0, 1, 1];
    scaleKf = [1.04, 1, 1];
    blurKf = [6, 0, 0];
  }

  const opacity = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, opacityKf));
  const scale = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, scaleKf));
  const blurPx = useTransform(scrollYProgress, (v) => lerpKeyframes(v, inputRange, blurKf));
  const filter = useTransform(blurPx, (b) => `blur(${b}px)`);

  const [rangeStart, rangeEnd] = PHASE_RANGES[index];
  const localProgress = useTransform(scrollYProgress, (v) => {
    const t = (v - rangeStart) / (rangeEnd - rangeStart);
    return Math.max(0, Math.min(1, t));
  });

  const Scene = phase.Scene;
  return (
    <motion.div className="gr-story-phase" style={{ opacity, scale, filter }}>
      <SceneTitle progress={localProgress} word={phase.word} copy={phase.copy} color={phase.color} />
      <Scene progress={localProgress} />
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
  // why this avoids useTransform's array-keyframes overload. All three
  // stay in the brand's orange family (single accent, no per-section
  // hues) — differentiated by luminance so the three acts still read as
  // distinct beats.
  const GLOW_STOPS = [
    [199, 90, 28],
    [242, 106, 33],
    [255, 179, 71],
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

function AutoPlayScene({ phase }) {
  const progress = useMotionValue(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const Scene = phase.Scene;

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { duration: 3.2, ease: "easeInOut", delay: 0.2 });
    return () => controls.stop();
  }, [inView, reduceMotion, progress]);

  return (
    <div ref={ref} className={`gr-story-phase-static ${phase.color}`}>
      <SceneTitle progress={progress} word={phase.word} copy={phase.copy} color={phase.color} />
      <Scene progress={progress} cinematic={false} />
    </div>
  );
}

function SequentialStory() {
  return (
    <div className="gr-sequential-story">
      {PHASES.map((p) => (
        <AutoPlayScene key={p.key} phase={p} />
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
