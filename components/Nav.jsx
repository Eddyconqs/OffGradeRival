"use client";

import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Brain,
  Users,
  Rss,
  FolderOpen,
  Sun,
  Moon,
  Plus,
  LogOut,
} from "lucide-react";
import { useStore } from "../lib/store";
import { signOut } from "../lib/auth";

// Each section gets its own tone instead of defaulting everything to cyan —
// reused for the sidebar's active indicator, that section's primary buttons,
// and card/panel headers on that page. See TAB_TONE_LABEL for the map by id.
export const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, tone: "cyan" },
  { id: "classes", label: "My Courses", icon: BookOpen, tone: "violet" },
  { id: "study", label: "Study Space", icon: Brain, tone: "gold" },
  { id: "files", label: "Files", icon: FolderOpen, tone: "mint" },
  { id: "feed", label: "Feed", icon: Rss, tone: "coral" },
  { id: "social", label: "Groups", icon: Users, tone: "violet" },
];

export const TAB_TONE = Object.fromEntries(TABS.map((t) => [t.id, t.tone]));

export function Sidebar({ active, onChange }) {
  const { theme, toggleTheme, profile, levelInfo } = useStore();

  return (
    <aside className="gr-sidebar">
      <div className="gr-sidebar-logo">
        <div className="gr-wordmark">
          Grade<span className="accent">Arena</span>
          <span className="dot" />
        </div>
        <p className="gr-tagline">Compete. Improve. Celebrate.</p>
      </div>

      <nav className="gr-sidebar-nav">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`gr-sidebar-link tone-${t.tone} ${active === t.id ? "active" : ""}`}
              onClick={() => onChange(t.id)}
              aria-current={active === t.id ? "page" : undefined}
            >
              <Icon />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="gr-sidebar-foot">
        <button className="gr-theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <div className="gr-profile-chip" style={{ width: "100%" }}>
          <div className="gr-avatar">
            {(profile.name || "You")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <div className="name">{profile.name || "You"}</div>
            <div className="lvl">Lv. {levelInfo.level}</div>
          </div>
        </div>
        <button className="gr-theme-toggle" onClick={() => signOut()}>
          <LogOut />
          Log out
        </button>
      </div>
    </aside>
  );
}

export function BottomNav({ active, onChange }) {
  return (
    <nav className="gr-bottom-nav" aria-label="Primary">
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`gr-bottom-nav-item tone-${t.tone} ${active === t.id ? "active" : ""}`}
            onClick={() => onChange(t.id)}
            aria-current={active === t.id ? "page" : undefined}
          >
            <Icon />
            {t.label === "My Courses" ? "Courses" : t.label === "Study Space" ? "Focus" : t.label}
          </button>
        );
      })}
    </nav>
  );
}

export function Fab({ onClick }) {
  return (
    <button className="gr-fab" onClick={onClick} aria-label="Add a grade">
      <Plus />
    </button>
  );
}
