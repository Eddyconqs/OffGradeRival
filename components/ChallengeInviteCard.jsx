"use client";

import { Swords, ArrowUpRight } from "lucide-react";

/* A real app-styled card for the "challenge a friend on a specific course
   grade" flow — not wired to the backend yet (that's real-feature work for
   later), but built with the app's actual design system (gr-card,
   gr-rivalry-pair, gr-btn) so it can be screenshotted for the landing
   page's scroll story with full visual authenticity, and reused as-is
   once the real challenge system ships. Fake data throughout. */

export default function ChallengeInviteCard({ state = "invite" }) {
  return (
    <div className="gr-card" style={{ maxWidth: 420, position: "relative" }}>
      <span className="gr-pillar-tag compete">compete</span>
      <div className="gr-card-title">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Swords size={16} />
          Challenge invite
        </span>
      </div>
      <p className="gr-card-sub">Race a friend on a specific course grade.</p>

      {state === "invite" ? (
        <div className="gr-row-line">
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="gr-avatar" style={{ background: "var(--surface-elevated)", color: "var(--text)" }}>
              AM
            </span>
            <span>
              <b>Alex M.</b> wants to compete on <b>Chemistry 101</b>
            </span>
          </span>
          <span style={{ display: "flex", gap: 6, flex: "none" }}>
            <button className="gr-btn small primary">Accept</button>
            <button className="gr-btn small ghost">Decline</button>
          </span>
        </div>
      ) : (
        <>
          <div className="gr-rivalry-pair" style={{ margin: "6px 0 14px" }}>
            <div className="gr-rivalry-side">
              <div className="who">You</div>
              <div className="gpa" style={{ color: "var(--cyan-text)" }}>
                3.78
              </div>
            </div>
            <ArrowUpRight style={{ color: "var(--mint-text)", flex: "none" }} />
            <div className="gr-rivalry-side">
              <div className="who">Alex M.</div>
              <div className="gpa">3.66</div>
            </div>
          </div>
          <div className="gr-momentum-track">
            <div className="gr-momentum-fill" style={{ left: "38%", width: "24%" }} />
          </div>
          <p style={{ margin: "10px 0 0" }}>You're 0.12 ahead in Chemistry 101 — momentum building.</p>
        </>
      )}
    </div>
  );
}
