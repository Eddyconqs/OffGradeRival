"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, pctToLetterPoints, GRADE_SCALE, MAX_GPA, PROBATION_THRESHOLD } from "../lib/store";
import {
  Target,
  Activity,
  ListOrdered,
  Sparkles,
  Radar,
  Users,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import Scoreboard from "./Scoreboard";
import SevenSeg from "./SevenSeg";

/* Weighted breakdown for a class: how much of its final grade is
   already graded vs. still open, and which categories have zero
   assignments logged (the real, honest stand-in for "impact" since
   this app doesn't track due dates). */
function analyzeClass(klass) {
  const totalWeight = klass.categories.reduce((s, c) => s + c.weight, 0);
  let weightedSum = 0;
  let weightUsed = 0;
  const gaps = [];
  for (const cat of klass.categories) {
    const items = klass.assignments.filter((a) => a.categoryId === cat.id);
    if (!items.length) {
      gaps.push({ classId: klass.id, className: klass.name, color: klass.color, categoryName: cat.name, weight: cat.weight });
      continue;
    }
    const totalScore = items.reduce((s, i) => s + Number(i.score), 0);
    const totalMax = items.reduce((s, i) => s + Number(i.max), 0);
    if (totalMax <= 0) continue;
    const catPct = (totalScore / totalMax) * 100;
    weightedSum += catPct * cat.weight;
    weightUsed += cat.weight;
  }
  gaps.sort((a, b) => b.weight - a.weight);
  const pct = weightUsed > 0 ? weightedSum / weightUsed : null;
  const remainingWeight = totalWeight - weightUsed;
  return { totalWeight, weightedSum, weightUsed, remainingWeight, gaps, pct };
}

/* What score on the rest of the term would move this class to the
   next letter-grade tier. Fully shown, no hidden math. */
function nextTierTarget(klass, analysis) {
  if (analysis.pct == null || analysis.remainingWeight <= 0) return null;
  const row = pctToLetterPoints(analysis.pct);
  const idx = GRADE_SCALE.findIndex((r) => r.letter === row.letter);
  if (idx <= 0) return null; // already at the top tier
  const target = GRADE_SCALE[idx - 1];
  const requiredAvg =
    (target.min * analysis.totalWeight - analysis.weightedSum) / analysis.remainingWeight;
  if (requiredAvg <= analysis.pct || requiredAvg > 100) return null;
  return { targetLetter: target.letter, targetMin: target.min, requiredAvg, ...analysis };
}

/* ---------- Board chrome — every dashboard section is one panel of
   the same physical scoreboard, so they all share this head+body shell.
   navTo makes the header itself the link ("scoreboard headers ... link
   to the right place"); boards with no single destination (Play-by-Play)
   just omit it and render a plain, non-clickable label. ---------- */

function BoardHead({ label, icon: Icon, tone = "cyan", navTo, onNavigate }) {
  const clickable = Boolean(navTo && onNavigate);
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      type={clickable ? "button" : undefined}
      className={`gr-board-head tone-${tone} ${clickable ? "clickable" : ""}`}
      onClick={clickable ? () => onNavigate(navTo) : undefined}
    >
      {Icon && <Icon size={13} />}
      <span>{label}</span>
      {clickable && <ChevronRight size={13} className="gr-board-chevron" />}
    </Tag>
  );
}

function BoardHalf({ label, icon, tone, navTo, onNavigate, children }) {
  return (
    <div>
      <BoardHead label={label} icon={icon} tone={tone} navTo={navTo} onNavigate={onNavigate} />
      <div className="gr-board-body">{children}</div>
    </div>
  );
}

function Board({ label, icon, tone, navTo, onNavigate, children }) {
  return (
    <div className="gr-board">
      <BoardHalf label={label} icon={icon} tone={tone} navTo={navTo} onNavigate={onNavigate}>
        {children}
      </BoardHalf>
    </div>
  );
}

function BoardPair({ children }) {
  return (
    <div className="gr-board">
      <div className="gr-board-2col">{children}</div>
    </div>
  );
}

function FocusNowBoard({ as: Wrapper = Board, classes, onNavigate }) {
  const analyses = useMemo(() => classes.map((k) => ({ klass: k, a: analyzeClass(k) })), [classes]);
  const allGaps = analyses.flatMap(({ a }) => a.gaps);
  const topGap = allGaps[0];

  const shell = (body) => (
    <Wrapper label="Focus Now" icon={Target} tone="cyan" navTo="classes" onNavigate={onNavigate}>
      {body}
    </Wrapper>
  );

  if (!classes.length) {
    return shell(
      <div className="gr-empty" style={{ padding: "16px 10px" }}>
        <b>No classes yet</b>
        Add a class to see your best next move.
      </div>
    );
  }

  if (topGap) {
    return shell(
      <>
        <p style={{ margin: "0 0 10px" }}>
          <b>{topGap.className}</b> — {topGap.categoryName} is still open.
        </p>
        <span className="gr-impact-chip">{topGap.weight}% of course grade</span>
        <div style={{ marginTop: 14 }}>
          <button className="gr-btn small primary" onClick={() => onNavigate("classes")}>
            Open {topGap.className}
          </button>
        </div>
      </>
    );
  }

  const graded = analyses.filter(({ a }) => a.pct != null);
  if (!graded.length) {
    return shell(
      <div className="gr-empty" style={{ padding: "16px 10px" }}>
        <b>Log your first score</b>
        Add an assignment in Classes to see where to focus.
      </div>
    );
  }
  const weakest = graded.reduce((a, b) => (a.a.pct < b.a.pct ? a : b));
  return shell(
    <>
      <p style={{ margin: "0 0 10px" }}>
        <b>{weakest.klass.name}</b> is your focus zone at {weakest.a.pct.toFixed(1)}%. Every category
        is logged — small gains here move your GPA most.
      </p>
      <button className="gr-btn small primary" onClick={() => onNavigate("classes")}>
        Open {weakest.klass.name}
      </button>
    </>
  );
}

function GradePulseBoard({ as: Wrapper = Board, classes, perClass, onNavigate }) {
  const graded = classes.filter((c) => perClass.find((p) => p.id === c.id)?.pct != null);

  return (
    <Wrapper label="Grade Pulse" icon={Activity} tone="mint" navTo="classes" onNavigate={onNavigate}>
      {!graded.length ? (
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No grades logged yet</b>
          Your live percentages will show up here.
        </div>
      ) : (
        <>
          {graded.map((c) => {
            const p = perClass.find((pp) => pp.id === c.id);
            return (
              <div className="gr-pulse-row" key={c.id}>
                <div className="top">
                  <span className="name">
                    <span className="gr-swatch" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="val" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SevenSeg value={p.pct.toFixed(1)} color="var(--led-green)" size={1.05} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {p.row.letter}
                    </span>
                  </span>
                </div>
                <div className="gr-pct-track">
                  <div className="gr-pct-fill" style={{ width: `${Math.min(100, p.pct)}%`, background: c.color }} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </Wrapper>
  );
}

function PenaltyBoard({ as: Wrapper = Board, classes, onNavigate }) {
  const gaps = useMemo(() => {
    const all = classes.flatMap((k) => analyzeClass(k).gaps);
    all.sort((a, b) => b.weight - a.weight);
    return all.slice(0, 5);
  }, [classes]);

  return (
    <Wrapper label="Penalty Box" icon={ListOrdered} tone="gold" navTo="classes" onNavigate={onNavigate}>
      {!gaps.length ? (
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Nothing outstanding</b>
          Every weighted category has at least one score logged.
        </div>
      ) : (
        <>
          <p style={{ margin: "0 0 4px", fontSize: 12 }}>Open categories, ranked by weight — like minutes in the box.</p>
          {gaps.map((g, i) => (
            <div className="gr-penalty-row" key={`${g.classId}-${g.categoryName}-${i}`}>
              <span className="gr-penalty-who">
                <span className="gr-swatch" style={{ background: g.color, flex: "none" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.className} · {g.categoryName}
                </span>
              </span>
              <span className="gr-penalty-weight">
                <SevenSeg value={String(g.weight)} color="var(--led-amber)" size={1.1} />
                <span className="unit">%</span>
              </span>
            </div>
          ))}
        </>
      )}
    </Wrapper>
  );
}

function GradeInsightBoard({ as: Wrapper = Board, classes, onNavigate }) {
  const [showCalc, setShowCalc] = useState(false);

  const best = useMemo(() => {
    const candidates = classes
      .map((k) => {
        const a = analyzeClass(k);
        const t = nextTierTarget(k, a);
        return t ? { klass: k, t } : null;
      })
      .filter(Boolean)
      .sort((x, y) => x.t.requiredAvg - y.t.requiredAvg);
    return candidates[0] || null;
  }, [classes]);

  if (!best) {
    return (
      <Wrapper label="Grade Insight" icon={Sparkles} tone="violet" navTo="classes" onNavigate={onNavigate}>
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Log more scores</b>
          Once a class has some open weight left, you'll see the exact target needed for your next
          letter grade here.
        </div>
      </Wrapper>
    );
  }

  const { klass, t } = best;

  return (
    <Wrapper label="Grade Insight" icon={Sparkles} tone="violet" navTo="classes" onNavigate={onNavigate}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <SevenSeg value={t.requiredAvg.toFixed(1)} color="var(--led-red)" size={1.6} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-muted)" }}>% needed</span>
      </div>
      <p style={{ margin: "0 0 10px" }}>
        Average that on the remaining {t.remainingWeight}% of <b>{klass.name}</b> to reach{" "}
        <b>{t.targetLetter}</b>.
      </p>
      <button className="gr-calc-toggle" onClick={() => setShowCalc((v) => !v)}>
        {showCalc ? "Hide calculation" : "See calculation"}
      </button>
      {showCalc && (
        <div className="gr-calc-box">
          current weighted points = {t.weightedSum.toFixed(1)}
          <br />
          weight graded so far = {t.weightUsed}
          <br />
          weight still open = {t.remainingWeight}
          <br />
          target: {t.targetLetter} (≥ {t.targetMin}%) on a {t.totalWeight}-weight scale
          <br />
          required avg = ({t.targetMin} × {t.totalWeight} − {t.weightedSum.toFixed(1)}) ÷{" "}
          {t.remainingWeight} = {t.requiredAvg.toFixed(1)}%
        </div>
      )}
    </Wrapper>
  );
}

function RivalryRadarBoard({ as: Wrapper = Board, friends, profile, gpa, onNavigate }) {
  const shell = (body) => (
    <Wrapper label="Rivalry Radar" icon={Radar} tone="cyan" navTo="social" onNavigate={onNavigate}>
      {body}
    </Wrapper>
  );

  if (!friends.length) {
    return shell(
      <div className="gr-empty" style={{ padding: "16px 10px" }}>
        <b>No rivals yet</b>
        Add a friend in Groups to start a friendly GPA race.
      </div>
    );
  }

  // Only friends who've opted in to sharing can be compared against —
  // grades are private by default.
  const comparable = friends.filter((f) => f.gpa != null);
  if (!comparable.length) {
    return shell(
      <>
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Nobody's sharing yet</b>
          Your friends keep their GPA private by default. Once one of you turns on "Share my GPA"
          in Groups, you'll see a head-to-head here.
        </div>
      </>
    );
  }

  const closest = [...comparable].sort((a, b) => Math.abs(a.gpa - gpa) - Math.abs(b.gpa - gpa))[0];
  const delta = gpa - closest.gpa;
  const ahead = delta >= 0;
  const Arrow = Math.abs(delta) < 0.01 ? Minus : ahead ? ArrowUpRight : ArrowDownRight;

  const youPct = Math.max(4, Math.min(96, (gpa / MAX_GPA) * 100));
  const rivalPct = Math.max(4, Math.min(96, (closest.gpa / MAX_GPA) * 100));

  return shell(
    <>
      <div className="gr-rivalry-pair">
        <div className="gr-rivalry-side">
          <div className="who">{profile.name || "You"}</div>
          <SevenSeg value={gpa.toFixed(2)} color="var(--led-red)" size={1.5} />
        </div>
        <Arrow style={{ color: ahead ? "var(--mint-text)" : "var(--amber-text)", flex: "none" }} />
        <div className="gr-rivalry-side">
          <div className="who">{closest.name}</div>
          <SevenSeg value={closest.gpa.toFixed(2)} color="var(--led-red)" size={1.5} />
        </div>
      </div>
      <div className="gr-momentum-track">
        <div
          className="gr-momentum-fill"
          style={{
            left: `${Math.min(youPct, rivalPct)}%`,
            width: `${Math.abs(youPct - rivalPct)}%`,
          }}
        />
      </div>
      <p style={{ margin: "10px 0" }}>
        {Math.abs(delta) < 0.01
          ? `You're tied with ${closest.name} — next score decides it.`
          : ahead
          ? `You're ${delta.toFixed(2)} ahead of ${closest.name}. Momentum building.`
          : `${closest.name} is ${Math.abs(delta).toFixed(2)} ahead — within reach.`}
      </p>
    </>
  );
}

function SquadSignalBoard({ as: Wrapper = Board, groups, onNavigate }) {
  const shell = (body) => (
    <Wrapper label="Squad Signal" icon={Users} tone="amber" navTo="social" onNavigate={onNavigate}>
      {body}
    </Wrapper>
  );

  if (!groups.length) {
    return shell(
      <div className="gr-empty" style={{ padding: "16px 10px" }}>
        <b>No groups yet</b>
        Start a study group to trade files and keep each other on track.
      </div>
    );
  }
  const members = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
  return shell(
    <>
      <div className="gr-board-grid" style={{ marginBottom: 14 }}>
        <div className="gr-led-stat">
          <div className="n">
            <SevenSeg value={String(groups.length)} color="var(--led-amber)" size={1.3} />
          </div>
          <div className="k">Groups</div>
        </div>
        <div className="gr-led-stat">
          <div className="n">
            <SevenSeg value={String(members.size)} color="var(--led-amber)" size={1.3} />
          </div>
          <div className="k">Teammates</div>
        </div>
      </div>
      <div className="gr-squad-chip-row">
        {groups.slice(0, 4).map((g) => (
          <span className="gr-tag" key={g.id}>
            {g.name}
          </span>
        ))}
        {groups.length > 4 && <span className="gr-tag">+{groups.length - 4} more</span>}
      </div>
    </>
  );
}

function PlayByPlayBoard({ as: Wrapper = Board, activity }) {
  return (
    <Wrapper label="Play-by-Play" icon={Zap} tone="mint">
      {activity.length ? (
        activity.slice(0, 6).map((a) => (
          <div key={a.id} className="gr-xp-source-row" style={{ marginBottom: 6, alignItems: "center" }}>
            <span>{a.reason}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <SevenSeg value={`+${a.amount}`} color="var(--led-green)" size={1} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)" }}>XP</span>
            </span>
          </div>
        ))
      ) : (
        <div className="gr-empty">
          <b>Nothing yet</b>
          Log a grade, upload a file, or take a quiz to start earning XP.
        </div>
      )}
    </Wrapper>
  );
}

function TeamStatsBoard({ classes, files, friends, onNavigate }) {
  return (
    <div className="gr-board">
      <BoardHead label="Team Stats" tone="cyan" />
      <div className="gr-board-body">
        <div className="gr-board-grid">
          <button className="gr-led-stat" onClick={() => onNavigate("classes")}>
            <div className="n">
              <SevenSeg value={String(classes.length)} color="var(--led-red)" size={1.6} />
            </div>
            <div className="k">Classes tracked</div>
          </button>
          <button className="gr-led-stat" onClick={() => onNavigate("files")}>
            <div className="n">
              <SevenSeg value={String(files.length)} color="var(--led-red)" size={1.6} />
            </div>
            <div className="k">Files shared</div>
          </button>
          <button className="gr-led-stat" onClick={() => onNavigate("social")}>
            <div className="n">
              <SevenSeg value={String(friends.length)} color="var(--led-red)" size={1.6} />
            </div>
            <div className="k">Rivals in circle</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const { profile, gpa, classes, perClass, friends, levelInfo, files, activity, groups, refreshFriends, refreshGroups } =
    useStore();

  // Friends' GPA and group content can change from someone else's
  // account — pick that up whenever the dashboard is opened.
  useEffect(() => {
    refreshFriends();
    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only ranked against friends who've opted in to sharing their GPA.
  const comparableFriends = friends.filter((f) => f.gpa != null);
  const rank =
    [...comparableFriends, { id: "you", gpa }].sort((a, b) => b.gpa - a.gpa).findIndex((p) => p.id === "you") + 1;
  const closestRival = comparableFriends.length
    ? [...comparableFriends].sort((a, b) => Math.abs(a.gpa - gpa) - Math.abs(b.gpa - gpa))[0]
    : null;
  const scoresLogged = classes.reduce((s, k) => s + k.assignments.length, 0);

  const gradedClasses = perClass.filter((p) => p.pct != null);
  const bestClass = gradedClasses.length
    ? classes.find(
        (c) => c.id === gradedClasses.reduce((a, b) => (a.pct > b.pct ? a : b)).id
      )
    : null;

  const standing = gradedClasses.length
    ? gpa >= PROBATION_THRESHOLD
      ? { ok: true, text: "Good academic standing" }
      : { ok: false, text: `Below the ${PROBATION_THRESHOLD.toFixed(1)} minimum — let's build it back up` }
    : null;

  return (
    <div className="gr-arena">
      <span className="gr-arena-bolt tl" />
      <span className="gr-arena-bolt tr" />
      <span className="gr-arena-bolt bl" />
      <span className="gr-arena-bolt br" />

      <div className="gr-stagger">
        <div className="gr-arena-marquee">
          <span className="gr-arena-ticker">
            Good to see you{profile.name ? `, ${profile.name}` : ""} · rank #
            {comparableFriends.length ? rank : 1} of {comparableFriends.length + 1} ·{" "}
            {gradedClasses.length
              ? `${bestClass ? bestClass.name : "your top class"} is your strongest grade`
              : "log a score to get on the board"}
          </span>
          <div className="gr-row">
            <button className="gr-btn small primary" onClick={() => onNavigate("classes")}>
              View projection
            </button>
            <button className="gr-btn small ghost" onClick={() => onNavigate("study")}>
              Take a quiz · +XP
            </button>
          </div>
        </div>

        <div className="gr-board">
          <Scoreboard
            gpa={gpa}
            standing={standing}
            rival={closestRival}
            levelInfo={levelInfo}
            scoresLogged={scoresLogged}
            onNavigate={onNavigate}
          />
        </div>

        <TeamStatsBoard classes={classes} files={files} friends={friends} onNavigate={onNavigate} />

        <FocusNowBoard classes={classes} onNavigate={onNavigate} />

        <BoardPair>
          <GradePulseBoard as={BoardHalf} classes={classes} perClass={perClass} onNavigate={onNavigate} />
          <PenaltyBoard as={BoardHalf} classes={classes} onNavigate={onNavigate} />
        </BoardPair>

        <BoardPair>
          <GradeInsightBoard as={BoardHalf} classes={classes} onNavigate={onNavigate} />
          <RivalryRadarBoard as={BoardHalf} friends={friends} profile={profile} gpa={gpa} onNavigate={onNavigate} />
        </BoardPair>

        <BoardPair>
          <SquadSignalBoard as={BoardHalf} groups={groups} onNavigate={onNavigate} />
          <PlayByPlayBoard as={BoardHalf} activity={activity} />
        </BoardPair>
      </div>
    </div>
  );
}
