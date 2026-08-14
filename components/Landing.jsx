"use client";

import ScrollStory from "./ScrollStory";

export default function Landing({ onGetStarted, onLogin }) {
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
          <div className="gr-landing-scrollcue" aria-hidden="true">
            <span />
          </div>
        </section>
      </div>

      <ScrollStory />

      <div className="gr-landing-shell">
        <section className="gr-landing-unify">
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
