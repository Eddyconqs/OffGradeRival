"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { lerpKeyframes } from "../lib/scrollMotion";
import ScrollStory from "./ScrollStory";

/* Hero and Unify aren't pinned (no added scroll height, no scroll-jacking)
   — they ride their own natural scroll distance. Hero reads its progress
   from "fully in view" to "scrolled past" and uses that to fade/scale/blur
   itself away, like a title card being pulled off screen. Unify reads its
   progress from "just entering" to "reaching center" and runs the same
   transform in reverse, like the next scene racking into focus. Together
   with the pinned Compete/Improve/Celebrate sequence in between, the whole
   page reads as one continuous scroll-driven scene change rather than a
   stack of sections. */

function useSceneExit(ref) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const range = [0, 0.65, 1];
  const opacity = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [1, 0.4, 0]));
  const scale = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [1, 0.96, 0.9]));
  const y = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [0, -20, -70]));
  const blur = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [0, 2, 7]));
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return { opacity, scale, y, filter };
}

function useSceneEnter(ref) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const range = [0, 0.55, 1];
  const opacity = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [0, 0.6, 1]));
  const scale = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [0.92, 0.97, 1]));
  const y = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [50, 16, 0]));
  const blur = useTransform(scrollYProgress, (v) => lerpKeyframes(v, range, [6, 2, 0]));
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return { opacity, scale, y, filter };
}

export default function Landing({ onGetStarted, onLogin }) {
  const heroRef = useRef(null);
  const unifyRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const heroMotion = useSceneExit(heroRef);
  const unifyMotion = useSceneEnter(unifyRef);

  return (
    <div className="gr-landing">
      <header className="gr-landing-header-fixed">
        <div className="gr-landing-shell gr-landing-header">
          <div className="gr-wordmark">
            Grade<span className="accent">Arena</span>
            <span className="dot" />
          </div>
          <div className="gr-landing-header-actions">
            <button className="gr-landing-loginlink" onClick={onLogin}>
              Log in
            </button>
            <button className="gr-btn primary" onClick={onGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      <div className="gr-landing-shell">
        <motion.section
          ref={heroRef}
          className="gr-landing-hero"
          style={reduceMotion ? undefined : heroMotion}
        >
          <div className="gr-landing-hero-glow" aria-hidden="true" />
          <p className="gr-landing-tagline">
            <span className="compete">Compete.</span> <span className="improve">Improve.</span>{" "}
            <span className="celebrate">Celebrate.</span>
          </p>
          <h1 className="gr-landing-headline">
            GRADE<span className="accent"> ARENA</span>
          </h1>
          <p className="gr-landing-sub">
            Turn your grades into goals, challenges, rivals, and achievements. Compete with your
            friends, track your progress, and celebrate every win.
          </p>
          <div className="gr-landing-cta-row">
            <button className="gr-landing-cta" onClick={onGetStarted}>
              Enter Grade Arena
            </button>
          </div>
          <p className="gr-landing-cta-note">Just your name and a password — free, no email required.</p>
          <div className="gr-landing-scrollcue" aria-hidden="true">
            <span />
          </div>
        </motion.section>
      </div>

      <ScrollStory />

      <div className="gr-landing-shell">
        <motion.section
          ref={unifyRef}
          className="gr-landing-unify"
          style={reduceMotion ? undefined : unifyMotion}
        >
          <div className="gr-landing-unify-glow" aria-hidden="true" />
          <div className="gr-landing-unify-words">
            <span className="compete">Compete</span>
            <span className="improve">Improve</span>
            <span className="celebrate">Celebrate</span>
          </div>
          <h2>All in one arena.</h2>
          <p>Set up your account in under a minute — just your name and a password.</p>
          <button className="gr-landing-cta" onClick={onGetStarted}>
            Enter Grade Arena
          </button>
        </motion.section>
      </div>

      <footer className="gr-landing-footer">
        <div className="gr-wordmark">
          Grade<span className="accent">Arena</span>
          <span className="dot" />
        </div>
        <p className="gr-landing-footer-note">Compete. Improve. Celebrate.</p>
      </footer>
    </div>
  );
}
