"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, computeClassPct, pctToLetterPoints, GRADE_SCALE, MAX_GPA, PROBATION_THRESHOLD } from "../lib/store";
import {
  Target,
  Activity,
  ListOrdered,
  Sparkles,
  Radar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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

function GPAOrb({ gpa, standing }) {
  const pct = Math.max(0, Math.min(1, gpa / MAX_GPA));
  const r = 58;
  const c = 2 * Math.PI * r;
  const dash = `${c * pct} ${c}`;
  return (
    <div>
      <div className="gr-orb">
        <svg viewBox="0 0 140 140">
          <defs>
            <linearGradient id="gr-orb-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--cyan)" />
              <stop offset="100%" stopColor="var(--violet)" />
            </linearGradient>
          </defs>
          <circle className="track" cx="70" cy="70" r={r} />
          <circle className="fill" cx="70" cy="70" r={r} strokeDasharray={dash} />
        </svg>
        <div className="gr-orb-center">
          <div className="gpa">{gpa ? gpa.toFixed(2) : "—"}</div>
          <div className="scale">/ {MAX_GPA.toFixed(2)}</div>
          <div className="label">Live GPA</div>
        </div>
      </div>
      {standing && (
        <div className={`gr-standing-chip ${standing.ok ? "ok" : "watch"}`}>{standing.text}</div>
      )}
    </div>
  );
}

function MissionCard({ tone, icon: Icon, title, children }) {
  return (
    <div className="gr-card gr-mission-card">
      <div className={`gr-mission-head ${tone}`}>
        <Icon />
        {title}
      </div>
      <div className="gr-mission-body">{children}</div>
    </div>
  );
}

function FocusNowCard({ classes, onNavigate }) {
  const analyses = useMemo(() => classes.map((k) => ({ klass: k, a: analyzeClass(k) })), [classes]);
  const allGaps = analyses.flatMap(({ a }) => a.gaps);
  const topGap = allGaps[0];

  if (!classes.length) {
    return (
      <MissionCard tone="cyan" icon={Target} title="Focus Now">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No classes yet</b>
          Add a class to see your best next move.
        </div>
      </MissionCard>
    );
  }

  if (topGap) {
    return (
      <MissionCard tone="cyan" icon={Target} title="Focus Now">
        <p style={{ margin: "0 0 10px" }}>
          <b>{topGap.className}</b> — {topGap.categoryName} is still open.
        </p>
        <span className="gr-impact-chip">{topGap.weight}% of course grade</span>
        <div style={{ marginTop: 14 }}>
          <button className="gr-btn small primary" onClick={() => onNavigate("classes")}>
            Open {topGap.className}
          </button>
        </div>
      </MissionCard>
    );
  }

  const graded = analyses.filter(({ a }) => a.pct != null);
  if (!graded.length) {
    return (
      <MissionCard tone="cyan" icon={Target} title="Focus Now">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Log your first score</b>
          Add an assignment in Classes to see where to focus.
        </div>
      </MissionCard>
    );
  }
  const weakest = graded.reduce((a, b) => (a.a.pct < b.a.pct ? a : b));
  return (
    <MissionCard tone="cyan" icon={Target} title="Focus Now">
      <p style={{ margin: "0 0 10px" }}>
        <b>{weakest.klass.name}</b> is your focus zone at {weakest.a.pct.toFixed(1)}%. Every category
        is logged — small gains here move your GPA most.
      </p>
      <button className="gr-btn small primary" onClick={() => onNavigate("classes")}>
        Open {weakest.klass.name}
      </button>
    </MissionCard>
  );
}

function GradePulseCard({ classes, perClass, onNavigate }) {
  const graded = classes.filter((c) => perClass.find((p) => p.id === c.id)?.pct != null);
  if (!graded.length) {
    return (
      <MissionCard tone="mint" icon={Activity} title="Grade Pulse">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No grades logged yet</b>
          Your live percentages will show up here.
        </div>
      </MissionCard>
    );
  }
  return (
    <MissionCard tone="mint" icon={Activity} title="Grade Pulse">
      {graded.map((c) => {
        const p = perClass.find((pp) => pp.id === c.id);
        return (
          <div className="gr-pulse-row" key={c.id}>
            <div className="top">
              <span className="name">
                <span className="gr-swatch" style={{ background: c.color }} />
                {c.name}
              </span>
              <span className="val">
                {p.pct.toFixed(1)}% · {p.row.letter}
              </span>
            </div>
            <div className="gr-pct-track">
              <div className="gr-pct-fill" style={{ width: `${Math.min(100, p.pct)}%`, background: c.color }} />
            </div>
          </div>
        );
      })}
      <button className="gr-btn small ghost" style={{ marginTop: 4 }} onClick={() => onNavigate("classes")}>
        View all classes
      </button>
    </MissionCard>
  );
}

function UpcomingImpactCard({ classes, onNavigate }) {
  const gaps = useMemo(() => {
    const all = classes.flatMap((k) => analyzeClass(k).gaps);
    all.sort((a, b) => b.weight - a.weight);
    return all.slice(0, 5);
  }, [classes]);

  if (!gaps.length) {
    return (
      <MissionCard tone="gold" icon={ListOrdered} title="Upcoming Impact">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Nothing outstanding</b>
          Every weighted category has at least one score logged.
        </div>
      </MissionCard>
    );
  }

  return (
    <MissionCard tone="gold" icon={ListOrdered} title="Upcoming Impact">
      <p style={{ margin: "0 0 4px", fontSize: 12 }}>Open categories, ranked by weight.</p>
      {gaps.map((g, i) => (
        <div className="gr-row-line" key={`${g.classId}-${g.categoryName}-${i}`}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="gr-swatch" style={{ background: g.color }} />
            {g.className} · {g.categoryName}
          </span>
          <span className="gr-impact-chip">{g.weight}%</span>
        </div>
      ))}
      <button className="gr-btn small ghost" style={{ marginTop: 10 }} onClick={() => onNavigate("classes")}>
        Log a score
      </button>
    </MissionCard>
  );
}

function GradeInsightCard({ classes }) {
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
      <MissionCard tone="violet" icon={Sparkles} title="Grade Insight">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Log more scores</b>
          Once a class has some open weight left, you'll see the exact target needed for your next
          letter grade here.
        </div>
      </MissionCard>
    );
  }

  const { klass, t } = best;

  return (
    <MissionCard tone="violet" icon={Sparkles} title="Grade Insight">
      <p style={{ margin: "0 0 10px" }}>
        Average <b>{t.requiredAvg.toFixed(1)}%+</b> on the remaining {t.remainingWeight}% of{" "}
        <b>{klass.name}</b> to reach <b>{t.targetLetter}</b>.
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
    </MissionCard>
  );
}

function RivalryRadarCard({ friends, profile, gpa, onNavigate }) {
  if (!friends.length) {
    return (
      <MissionCard tone="cyan" icon={Radar} title="Rivalry Radar">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No rivals yet</b>
          Add a friend in Groups to start a friendly GPA race.
        </div>
      </MissionCard>
    );
  }

  const closest = [...friends].sort((a, b) => Math.abs(a.gpa - gpa) - Math.abs(b.gpa - gpa))[0];
  const delta = gpa - closest.gpa;
  const ahead = delta >= 0;
  const Arrow = Math.abs(delta) < 0.01 ? Minus : ahead ? ArrowUpRight : ArrowDownRight;

  const youPct = Math.max(4, Math.min(96, (gpa / MAX_GPA) * 100));
  const rivalPct = Math.max(4, Math.min(96, (closest.gpa / MAX_GPA) * 100));

  return (
    <MissionCard tone="cyan" icon={Radar} title="Rivalry Radar">
      <div className="gr-rivalry-pair">
        <div className="gr-rivalry-side">
          <div className="who">{profile.name || "You"}</div>
          <div className="gpa" style={{ color: "var(--cyan-text)" }}>
            {gpa.toFixed(2)}
          </div>
        </div>
        <Arrow style={{ color: ahead ? "var(--mint-text)" : "var(--amber-text)", flex: "none" }} />
        <div className="gr-rivalry-side">
          <div className="who">{closest.name}</div>
          <div className="gpa">{closest.gpa.toFixed(2)}</div>
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
      <p style={{ margin: "0 0 10px" }}>
        {Math.abs(delta) < 0.01
          ? `You're tied with ${closest.name} — next score decides it.`
          : ahead
          ? `You're ${delta.toFixed(2)} ahead of ${closest.name}. Momentum building.`
          : `${closest.name} is ${Math.abs(delta).toFixed(2)} ahead — within reach.`}
      </p>
      <button className="gr-btn small ghost" onClick={() => onNavigate("social")}>
        Open Groups
      </button>
    </MissionCard>
  );
}

function SquadSignalCard({ groups, onNavigate }) {
  if (!groups.length) {
    return (
      <MissionCard tone="amber" icon={Users} title="Squad Signal">
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No groups yet</b>
          Start a study group to trade files and keep each other on track.
        </div>
        <button className="gr-btn small ghost" style={{ marginTop: 10 }} onClick={() => onNavigate("social")}>
          Create a group
        </button>
      </MissionCard>
    );
  }
  const members = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
  return (
    <MissionCard tone="amber" icon={Users} title="Squad Signal">
      <p style={{ margin: "0 0 6px" }}>
        <b>{groups.length}</b> group{groups.length === 1 ? "" : "s"} · <b>{members.size}</b> teammate
        {members.size === 1 ? "" : "s"} in your circle.
      </p>
      <div className="gr-squad-chip-row">
        {groups.slice(0, 4).map((g) => (
          <span className="gr-tag" key={g.id}>
            {g.name}
          </span>
        ))}
        {groups.length > 4 && <span className="gr-tag">+{groups.length - 4} more</span>}
      </div>
      <button className="gr-btn small ghost" style={{ marginTop: 12 }} onClick={() => onNavigate("social")}>
        Open Groups
      </button>
    </MissionCard>
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

  const rank =
    [...friends, { id: "you", gpa }].sort((a, b) => b.gpa - a.gpa).findIndex((p) => p.id === "you") + 1;

  const gradedClasses = perClass.filter((p) => p.pct != null);
  const bestClass = gradedClasses.length
    ? classes.find(
        (c) => c.id === gradedClasses.reduce((a, b) => (a.pct > b.pct ? a : b)).id
      )
    : null;

  const xpPct = Math.min(100, Math.round((levelInfo.into / levelInfo.need) * 100));

  const standing = gradedClasses.length
    ? gpa >= PROBATION_THRESHOLD
      ? { ok: true, text: "Good academic standing" }
      : { ok: false, text: `Below the ${PROBATION_THRESHOLD.toFixed(1)} minimum — let's build it back up` }
    : null;

  return (
    <div>
      <div className="gr-hero">
        <div className="gr-hero-main">
          <GPAOrb gpa={gpa} standing={standing} />
          <div className="gr-hero-copy">
            <p className="eyebrow">Good to see you{profile.name ? `, ${profile.name}` : ""}</p>
            <h1>
              You're rank #{friends.length ? rank : 1} out of {friends.length + 1} in your circle.
            </h1>
            <p>
              {gradedClasses.length
                ? `${bestClass ? bestClass.name : "Your top class"} is currently your strongest grade. Head to Classes to log new scores or run a what-if projection.`
                : "Add your classes and log a few scores to see your GPA take shape."}
            </p>
            <div className="gr-row" style={{ marginTop: 16 }}>
              <button className="gr-btn primary" onClick={() => onNavigate("classes")}>
                View projection
              </button>
              <button className="gr-btn ghost" onClick={() => onNavigate("study")}>
                Take a quiz · +XP
              </button>
            </div>
          </div>
        </div>

        <div className="gr-card gr-level-card">
          <div className="gr-level-top">
            <div>
              <div className="gr-level-badge">
                Lv. {levelInfo.level}
                <sup>{profile.name || "Scholar"}</sup>
              </div>
            </div>
            <span className="gr-tag">{profile.xp || 0} XP total</span>
          </div>
          <div className="gr-xp-track">
            <div className="gr-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="gr-xp-caption">
            <span>{levelInfo.into} XP</span>
            <span>{levelInfo.need} XP to Lv. {levelInfo.level + 1}</span>
          </div>
          <div className="gr-xp-sources">
            <div className="gr-xp-source-row">
              <span>Log an assignment</span>
              <b>+5 XP</b>
            </div>
            <div className="gr-xp-source-row">
              <span>Upload a study file</span>
              <b>+15 XP</b>
            </div>
            <div className="gr-xp-source-row">
              <span>Finish an in-app quiz</span>
              <b>+12–52 XP</b>
            </div>
          </div>
        </div>
      </div>

      <div className="gr-grid cols-3" style={{ marginBottom: 20 }}>
        <div className="gr-stat">
          <div className="n">{classes.length}</div>
          <div className="k">Classes tracked</div>
        </div>
        <div className="gr-stat">
          <div className="n">{files.length}</div>
          <div className="k">Files shared</div>
        </div>
        <div className="gr-stat">
          <div className="n">{friends.length}</div>
          <div className="k">Rivals in your circle</div>
        </div>
      </div>

      <div className="gr-mission-grid">
        <FocusNowCard classes={classes} onNavigate={onNavigate} />
        <GradePulseCard classes={classes} perClass={perClass} onNavigate={onNavigate} />
        <UpcomingImpactCard classes={classes} onNavigate={onNavigate} />
        <GradeInsightCard classes={classes} />
        <RivalryRadarCard friends={friends} profile={profile} gpa={gpa} onNavigate={onNavigate} />
        <SquadSignalCard groups={groups} onNavigate={onNavigate} />
      </div>

      <div className="gr-card">
        <div className="gr-card-title">Recent activity</div>
        <p className="gr-card-sub">Where your XP has come from.</p>
        {activity.length ? (
          activity.slice(0, 6).map((a) => (
            <div key={a.id} className="gr-xp-source-row" style={{ marginBottom: 6 }}>
              <span>{a.reason}</span>
              <b>+{a.amount} XP</b>
            </div>
          ))
        ) : (
          <div className="gr-empty">
            <b>Nothing yet</b>
            Log a grade, upload a file, or take a quiz to start earning XP.
          </div>
        )}
      </div>
    </div>
  );
}
