"use client";

import {
  Swords,
  TrendingUp,
  PartyPopper,
  LayoutDashboard,
  BookOpen,
  Brain,
  Users,
  Target,
  Radar,
  Sparkles,
} from "lucide-react";

/* Static, hand-authored preview of the dashboard — never real data. This
   renders for logged-out visitors, so there's no account to pull from
   anyway, but the values below are fictional on purpose either way. */
function AppMockup() {
  const gpaPct = 3.85 / 4.3;
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = `${c * gpaPct} ${c}`;

  return (
    <div className="gr-mockup-frame">
      <div className="gr-mockup-topbar">
        <div className="gr-mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="gr-mockup-url">grade-arena.app/dashboard</div>
      </div>
      <div className="gr-mockup-body">
        <div className="gr-mockup-sidebar">
          <div className="gr-mockup-nav-item active">
            <LayoutDashboard />
            Dashboard
          </div>
          <div className="gr-mockup-nav-item">
            <BookOpen />
            My Courses
          </div>
          <div className="gr-mockup-nav-item">
            <Brain />
            Study Space
          </div>
          <div className="gr-mockup-nav-item">
            <Users />
            Groups
          </div>
        </div>
        <div className="gr-mockup-content">
          <p className="gr-mockup-greeting">Good morning, Jordan Ellis</p>
          <div className="gr-mockup-hero">
            <div className="gr-mockup-orb">
              <svg viewBox="0 0 84 84">
                <defs>
                  <linearGradient id="gr-mockup-orb-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--cyan)" />
                    <stop offset="100%" stopColor="var(--violet)" />
                  </linearGradient>
                </defs>
                <circle className="track" cx="42" cy="42" r={r} />
                <circle className="fill" cx="42" cy="42" r={r} strokeDasharray={dash} />
              </svg>
              <div className="gr-mockup-orb-center">3.85</div>
            </div>
            <div className="gr-mockup-hero-copy">
              <div className="name">You're rank #2 out of 6 in your circle</div>
              <div className="line">Chemistry 101 is your strongest grade this term.</div>
            </div>
          </div>
          <div className="gr-mockup-cards">
            <div className="gr-mockup-card">
              <div className="gr-mockup-card-head" style={{ color: "var(--cyan-text)" }}>
                <Target />
                Focus Now
              </div>
              <p>
                <b>World History</b> — Midterm essay still open.
              </p>
              <div className="gr-mockup-fake-bar">
                <span style={{ width: "70%", background: "var(--cyan)" }} />
              </div>
            </div>
            <div className="gr-mockup-card">
              <div className="gr-mockup-card-head" style={{ color: "var(--violet-text)" }}>
                <Radar />
                Rivalry Radar
              </div>
              <p>
                You're <b>0.12</b> ahead of Alex M. Momentum building.
              </p>
              <div className="gr-mockup-fake-bar">
                <span style={{ width: "58%", background: "var(--violet)" }} />
              </div>
            </div>
            <div className="gr-mockup-card">
              <div className="gr-mockup-card-head" style={{ color: "var(--gold-text)" }}>
                <Sparkles />
                Grade Insight
              </div>
              <p>
                Average <b>88%+</b> on remaining work to reach A.
              </p>
              <div className="gr-mockup-fake-bar">
                <span style={{ width: "44%", background: "var(--gold)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onGetStarted, onLogin }) {
  return (
    <div className="gr-landing">
      <div className="gr-landing-shell">
        <header className="gr-landing-header">
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
        </header>

        <section className="gr-landing-hero">
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
        </section>

        <section className="gr-landing-pillars">
          <div className="gr-pillar-card-lg compete">
            <div className="gr-pillar-icon">
              <Swords />
            </div>
            <h2 className="gr-pillar-word">Compete</h2>
            <p className="gr-pillar-sub">
              Challenge friends to head-to-head GPA races and study-group leaderboards — always
              opt-in, never forced. Your grades stay private until you choose to share them.
            </p>
          </div>
          <div className="gr-pillar-card-lg improve">
            <div className="gr-pillar-icon">
              <TrendingUp />
            </div>
            <h2 className="gr-pillar-word">Improve</h2>
            <p className="gr-pillar-sub">
              See the exact score you need on your next test to hit your target grade. Every
              projection shows its math — no black boxes, no guessing.
            </p>
          </div>
          <div className="gr-pillar-card-lg celebrate">
            <div className="gr-pillar-icon">
              <PartyPopper />
            </div>
            <h2 className="gr-pillar-word">Celebrate</h2>
            <p className="gr-pillar-sub">
              Earn XP, level up, and unlock achievements every time you log a grade, finish a
              quiz, or hit a milestone. Progress deserves a moment.
            </p>
          </div>
        </section>

        <section className="gr-landing-mockup-section">
          <p className="gr-landing-eyebrow">A look inside</p>
          <h2>Your academic command center.</h2>
          <AppMockup />
        </section>

        <section className="gr-landing-closing">
          <h2>Ready to compete?</h2>
          <p>Set up your account in under a minute.</p>
          <button className="gr-landing-cta" onClick={onGetStarted}>
            Get Started
          </button>
        </section>
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
