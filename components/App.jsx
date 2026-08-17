"use client";

import { useState } from "react";
import { StoreProvider, useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { Sidebar, BottomNav, Fab } from "./Nav";
import { Sun, Moon, LogOut } from "lucide-react";
import { signOut } from "../lib/auth";
import Auth from "./Auth";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Classes from "./Classes";
import Social from "./Social";
import StudyHub from "./StudyHub";
import Feed from "./Feed";
import Files from "./Files";

function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <div className="gr-toast">{toast.msg}</div>;
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MobileTopbar() {
  const { profile, levelInfo, theme, toggleTheme } = useStore();
  return (
    <div className="gr-topbar">
      <div className="gr-wordmark">
        Grade<span className="accent">Arena</span>
        <span className="dot" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="gr-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
        <div className="gr-profile-chip">
          <div className="gr-avatar">{initials(profile.name || "You")}</div>
          <div>
            <div className="name">{profile.name}</div>
            <div className="lvl">Lv. {levelInfo.level}</div>
          </div>
        </div>
        <button className="gr-theme-toggle" onClick={() => signOut()} aria-label="Log out">
          <LogOut />
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const { loading: authLoading, session } = useAuth();
  const { mounted } = useStore();
  const [tab, setTab] = useState("dashboard");
  const [showAuth, setShowAuth] = useState(false);
  const [filesGroupId, setFilesGroupId] = useState(null);

  const navigate = (nextTab, opts) => {
    if (nextTab === "files") setFilesGroupId(opts?.groupId ?? null);
    setTab(nextTab);
  };

  if (authLoading) {
    return <div className="gr-boot">Loading Grade Arena…</div>;
  }

  if (!session) {
    if (!showAuth) {
      return <Landing onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
    }
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  if (!mounted) {
    return <div className="gr-boot">Loading your data…</div>;
  }

  return (
    <div className="gr-app">
      <Sidebar active={tab} onChange={navigate} />
      <div className="gr-main">
        <MobileTopbar />
        <div className="gr-shell">
          {tab === "dashboard" && <Dashboard onNavigate={navigate} />}
          {tab === "classes" && <Classes />}
          {tab === "social" && <Social onNavigate={navigate} />}
          {tab === "study" && <StudyHub />}
          {tab === "files" && <Files initialGroupId={filesGroupId} />}
          {tab === "feed" && <Feed />}
        </div>
      </div>

      <BottomNav active={tab} onChange={navigate} />
      <Fab onClick={() => navigate("classes")} />

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
