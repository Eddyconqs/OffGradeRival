"use client";

// Standard 7-segment glyph map (segments a-g, clockwise from top).
const GLYPHS = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgecd",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

const SEG_NAMES = ["a", "b", "c", "d", "e", "f", "g"];

function Digit({ char }) {
  const on = new Set((GLYPHS[char] ?? "").split(""));
  return (
    <span className="gr-7seg-digit">
      {SEG_NAMES.map((s) => (
        <i key={s} className={`gr-7seg-seg gr-7seg-${s}${on.has(s) ? " on" : ""}`} />
      ))}
    </span>
  );
}

function Dot() {
  return <i className="gr-7seg-dot on" />;
}

function Colon() {
  return (
    <span className="gr-7seg-colon">
      <i className="on" />
      <i className="on" />
    </span>
  );
}

// Renders a string as LED scoreboard digits — pure CSS segments, no font
// dependency. `.`/`:` render as their own narrow glyphs so a GPA like
// "3.85" doesn't waste a full digit-width slot on the point.
export default function SevenSeg({ value, color = "var(--led-red)", size = 1, className = "" }) {
  const chars = String(value).split("");
  return (
    <span className={`gr-7seg ${className}`} style={{ fontSize: `${size}em`, "--seg-color": color }}>
      {chars.map((ch, i) => {
        if (ch === ".") return <Dot key={i} />;
        if (ch === ":") return <Colon key={i} />;
        return <Digit key={i} char={ch} />;
      })}
    </span>
  );
}
