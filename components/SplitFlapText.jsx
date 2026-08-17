"use client";

import { useEffect, useState } from "react";

// React Bits' "Split Flap Text" is Pro-only — this is an original,
// lightweight implementation of the same departures-board concept
// (each character cycles through random glyphs before landing on the
// real one, staggered left to right), tuned to Grade Arena's existing
// LED-scoreboard identity rather than pulled from that library.
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.!?";
const TICK_MS = 45;
const STAGGER_MS = 45;

function FlapChar({ finalChar, delay }) {
  const isSpace = finalChar === " ";
  const [display, setDisplay] = useState(isSpace ? " " : CHARSET[0]);
  const [settled, setSettled] = useState(isSpace);

  useEffect(() => {
    if (isSpace) return;
    let ticks = 0;
    const maxTicks = 8 + Math.floor(Math.random() * 4);
    let intervalId = null;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        ticks += 1;
        if (ticks >= maxTicks) {
          setDisplay(finalChar);
          setSettled(true);
          clearInterval(intervalId);
        } else {
          setDisplay(CHARSET[Math.floor(Math.random() * CHARSET.length)]);
        }
      }, TICK_MS);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span className={`gr-flap-char${settled ? " settled" : ""}`}>{display}</span>;
}

// segments: [{ text: "Compete.", className: "compete" }, ...] — mirrors
// how the tagline already splits into separately-colored words.
export default function SplitFlapText({ segments }) {
  let index = 0;
  return (
    <>
      {segments.map((seg, si) => {
        const chars = seg.text.split("").map((ch, ci) => {
          const el = <FlapChar key={ci} finalChar={ch} delay={index * STAGGER_MS} />;
          index += 1;
          return el;
        });
        return (
          <span key={si} className={`gr-flap-word ${seg.className || ""}`}>
            {chars}
            {si < segments.length - 1 ? " " : null}
          </span>
        );
      })}
    </>
  );
}
