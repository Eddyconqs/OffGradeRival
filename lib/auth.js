"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

/* ============================================================
   GradeRival accounts are "full name + password" only — no
   email field shown anywhere. Supabase Auth's email/password
   flow still needs *something* email-shaped under the hood, so
   we derive a deterministic, invisible one from the name:
     "Alex Rivera"  ->  "alex-rivera@graderival.local"
   That makes the full name function as the account's real
   identifier, so it has to be unique system-wide — enforced by
   Supabase's own "already registered" check at signup.
   ============================================================ */

function normalizeName(fullName) {
  return fullName.trim().replace(/\s+/g, " ");
}

function nameToEmail(fullName) {
  const slug = normalizeName(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  // Supabase's email validator does a DNS lookup on the domain and rejects
  // anything that doesn't resolve — made-up domains like "*.local" or an
  // invented subdomain fail outright. graderival.vercel.app is the app's
  // real, already-deployed domain (see README), so it resolves, but Vercel
  // doesn't run a mail server for it, so nothing is ever actually
  // delivered there even if a Supabase email flow ever fires.
  return `${slug}@graderival.vercel.app`;
}

export class AuthConfigError extends Error {
  constructor() {
    super(
      "GradeRival isn't connected to a backend yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server."
    );
    this.name = "AuthConfigError";
  }
}

export function validateSignup(fullName, password, confirmPassword) {
  const name = normalizeName(fullName);
  if (name.replace(/[^a-zA-Z0-9]/g, "").length < 2) {
    return "Enter your full name.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }
  return null;
}

export async function signUp(fullName, password) {
  if (!isSupabaseConfigured) throw new AuthConfigError();
  const name = normalizeName(fullName);
  const { data, error } = await supabase.auth.signUp({
    email: nameToEmail(name),
    password,
    options: { data: { full_name: name } },
  });
  if (error) {
    if (/already registered|already exists|already been registered/i.test(error.message)) {
      throw new Error("That name is already taken. Try adding a middle initial or last name.");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function signIn(fullName, password) {
  if (!isSupabaseConfigured) throw new AuthConfigError();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: nameToEmail(fullName),
    password,
  });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error("That name and password don't match an account.");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

// { loading, session } — session is null when signed out.
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, session: null });
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, session });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
