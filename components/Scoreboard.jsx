"use client";

import SevenSeg from "./SevenSeg";

function fmtGpa(v) {
  return v == null ? "-.--" : v.toFixed(2);
}

export default function Scoreboard({ gpa, standing, rival, levelInfo, scoresLogged, onNavigate }) {
  const xpPct = Math.min(100, Math.round((levelInfo.into / levelInfo.need) * 100));

  // Just the lead state for a visual highlight on the scoreboard digits —
  // the full "X ahead of Y" narrative already lives in the Rivalry Radar
  // board further down; repeating that sentence here would just echo it.
  let leading = null;
  if (rival) {
    const d = gpa - rival.gpa;
    leading = Math.abs(d) < 0.01 ? null : d > 0 ? "you" : "rival";
  }

  return (
    <div className="gr-scoreboard">
      <div className="gr-scoreboard-labels">
        <span className="side">Home · You</span>
        <span className="side">Visitor · {rival ? rival.name : "Rival"}</span>
      </div>

      <div className="gr-scoreboard-main">
        <div className={`gr-scoreboard-panel you ${leading === "you" ? "leading" : ""}`}>
          <div className="gr-scoreboard-digits-wrap">
            <SevenSeg value={fmtGpa(gpa)} color="var(--led-red)" size={3.1} />
          </div>
          <div className="gr-scoreboard-caption">
            GPA{leading === "you" && <span className="gr-scoreboard-lead"> · leading</span>}
          </div>
        </div>

        <div className="gr-scoreboard-center">
          <div className="gr-scoreboard-clock">
            <SevenSeg value={`${levelInfo.into}:${levelInfo.need}`} color="var(--led-amber)" size={1.5} />
          </div>
          <div className="gr-xp-track" style={{ width: 140, margin: "6px auto 0" }}>
            <div className="gr-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="gr-scoreboard-clock-caption">XP to Lv. {levelInfo.level + 1}</div>

          <div className="gr-scoreboard-level">
            <SevenSeg value={String(levelInfo.level)} color="var(--led-green)" size={1.7} />
            <span className="label">Level</span>
          </div>

          {standing && (
            <div className={`gr-standing-chip ${standing.ok ? "ok" : "watch"}`}>{standing.text}</div>
          )}
          <p className="gr-scoreboard-xp-hint">+5 assignment · +15 file · +5 post · +12–52 quiz</p>
        </div>

        <div className={`gr-scoreboard-panel rival ${leading === "rival" ? "leading" : ""}`}>
          <div className="gr-scoreboard-digits-wrap">
            <SevenSeg value={rival ? fmtGpa(rival.gpa) : "-.--"} color="var(--led-red)" size={3.1} />
          </div>
          <div className="gr-scoreboard-caption">
            GPA{leading === "rival" && <span className="gr-scoreboard-lead"> · leading</span>}
          </div>
          {!rival && (
            <button className="gr-scoreboard-cta" onClick={() => onNavigate("social")}>
              Add a rival →
            </button>
          )}
        </div>
      </div>

      <div className="gr-scoreboard-nav-row">
        <button className="gr-btn small ghost" onClick={() => onNavigate("classes")}>
          ◄◄ Classes
        </button>
        <div className="gr-scoreboard-stats">
          <div className="gr-scoreboard-stat">
            <div className="n">
              <SevenSeg value={String(scoresLogged)} color="var(--led-amber)" size={1.25} />
            </div>
            <span className="k">Scores logged</span>
          </div>
          <div className="gr-scoreboard-stat">
            <div className="n">
              <SevenSeg value={rival?.level != null ? String(rival.level) : "-"} color="var(--led-amber)" size={1.25} />
            </div>
            <span className="k">Rival level</span>
          </div>
        </div>
        <button className="gr-btn small ghost" onClick={() => onNavigate("social")}>
          Groups ►►
        </button>
      </div>
    </div>
  );
}
