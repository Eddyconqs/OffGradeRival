"use client";

import { Trophy, Star, Flame, ThumbsUp, PartyPopper, Share2 } from "lucide-react";

/* A real app-styled preview of a friends-only activity feed with
   reactions — not wired to the backend yet (that's real-feature work for
   later), but built with the app's actual design system (gr-card,
   gr-row-line) so it can be screenshotted for the landing page's scroll
   story with full visual authenticity, and reused as-is once the real
   feed ships. Fake data throughout. */

const POSTS = [
  {
    key: "rivalry",
    icon: Trophy,
    title: "Won the Chemistry 101 Rivalry",
    sub: "+50 XP",
    reactions: [
      { icon: Flame, count: 8 },
      { icon: ThumbsUp, count: 12 },
    ],
  },
  {
    key: "honor-roll",
    icon: Star,
    title: "Reached Honor Roll — 3.90 GPA",
    sub: "+100 XP",
    reactions: [
      { icon: PartyPopper, count: 15 },
      { icon: ThumbsUp, count: 6 },
    ],
  },
];

export default function FeedPreview({ composing = false }) {
  return (
    <div className="gr-card" style={{ maxWidth: 420, position: "relative" }}>
      <span className="gr-pillar-tag celebrate">celebrate</span>
      <div className="gr-card-title">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Share2 size={16} />
          Feed
        </span>
      </div>
      <p className="gr-card-sub">Wins your friends can see and react to.</p>

      {composing && (
        <div className="gr-row-line" style={{ marginBottom: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Star size={18} style={{ color: "var(--gold-text)" }} />
            <span>Reached Honor Roll — 3.90 GPA</span>
          </span>
          <button className="gr-btn small primary">Share to feed</button>
        </div>
      )}

      {POSTS.map((p) => {
        const Icon = p.icon;
        return (
          <div key={p.key} className="gr-feed-item">
            <Icon size={22} className="gr-feed-icon" />
            <div className="gr-feed-body">
              <div className="gr-feed-title">{p.title}</div>
              <div className="gr-feed-sub">{p.sub}</div>
            </div>
            <div className="gr-feed-reactions">
              {p.reactions.map((r, i) => {
                const RIcon = r.icon;
                return (
                  <span key={i}>
                    <RIcon size={13} /> {r.count}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
