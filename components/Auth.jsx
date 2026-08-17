"use client";

import { useState } from "react";
import { signUp, signIn, validateSignup } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabaseClient";

function Shell({ children, onBack }) {
  return (
    <div className="gr-onboard-wrap">
      <div className="gr-onboard-card">
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          {onBack ? (
            <button
              className="gr-wordmark"
              onClick={onBack}
              style={{ justifyContent: "center", background: "none", border: "none", cursor: "pointer", margin: "0 auto" }}
            >
              Grade<span className="accent">Arena</span>
              <span className="dot" />
            </button>
          ) : (
            <div className="gr-wordmark" style={{ justifyContent: "center" }}>
              Grade<span className="accent">Arena</span>
              <span className="dot" />
            </div>
          )}
          <p className="gr-tagline">Compete. Improve. Celebrate.</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <Shell>
      <div className="gr-card">
        <div className="gr-card-title">Backend not connected</div>
        <p className="gr-card-sub" style={{ marginBottom: 0 }}>
          Real accounts need a Supabase project. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the dev
          server.
        </p>
      </div>
    </Shell>
  );
}

export default function Auth({ onBack }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) return <NotConfigured />;

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async () => {
    setError("");
    if (mode === "signup") {
      const v = validateSignup(fullName, password, confirmPassword);
      if (v) {
        setError(v);
        return;
      }
    } else if (!fullName.trim() || !password) {
      setError("Enter your full name and password.");
      return;
    }

    setBusy(true);
    try {
      const result = mode === "signup" ? await signUp(fullName, password) : await signIn(fullName, password);
      if (!result.session) {
        // Account created, but Supabase didn't hand back a session — almost
        // always means "Confirm email" is still on for this project, and it
        // can't confirm our synthetic @graderival.vercel.app address.
        setError(
          "Account created, but sign-in didn't complete. In your Supabase project, go to Authentication → Providers → Email and turn off \"Confirm email\", then try logging in."
        );
      }
      // Otherwise useAuth's onAuthStateChange listener picks up the new
      // session and swaps this screen out automatically.
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell onBack={onBack}>
      <div className="gr-card">
        <div className="gr-auth-tabs">
          <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
            Create account
          </button>
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
            Log in
          </button>
        </div>

        <div className="gr-card-title" style={{ marginTop: 16 }}>
          {mode === "signup" ? "Set up your account" : "Welcome back"}
        </div>
        <p className="gr-card-sub">
          {mode === "signup"
            ? "Just your name and a password — no email required."
            : "Enter the name and password you signed up with."}
        </p>

        <div className="gr-field" style={{ marginBottom: 14 }}>
          <label>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Alex Rivera"
            autoComplete="name"
          />
        </div>
        <div className="gr-field" style={{ marginBottom: mode === "signup" ? 14 : 20 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
          />
        </div>
        {mode === "signup" && (
          <div className="gr-field" style={{ marginBottom: 20 }}>
            <label>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
            />
          </div>
        )}

        {error && <div className="gr-auth-error">{error}</div>}

        <button
          className="gr-btn primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </div>
    </Shell>
  );
}
