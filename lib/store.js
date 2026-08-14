"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

/* ============================================================
   GradeRival's data now lives in Supabase, scoped to the signed-in
   account (see supabase/migration.sql for schema + RLS). Only the
   theme preference stays in localStorage — it's a per-device UI
   choice, not app data. Screens refetch after mutations rather than
   patching local state by hand or using live subscriptions — see the
   plan notes for why (keeps this pass scoped; true realtime is a
   clean follow-up).
   ============================================================ */

const THEME_KEY = "gr_theme_v1";

function readLS(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — fail silently */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- GPA math ----------
   Ontario Tech 4.3 scale. */

export const MAX_GPA = 4.3;
export const PROBATION_THRESHOLD = 2.0;
export const PASSING_PCT = 50;

export const GRADE_SCALE = [
  { min: 90, letter: "A+", points: 4.3 },
  { min: 85, letter: "A", points: 4.0 },
  { min: 80, letter: "A-", points: 3.7 },
  { min: 77, letter: "B+", points: 3.3 },
  { min: 73, letter: "B", points: 3.0 },
  { min: 70, letter: "B-", points: 2.7 },
  { min: 67, letter: "C+", points: 2.3 },
  { min: 60, letter: "C", points: 2.0 },
  { min: 50, letter: "D", points: 1.0 },
  { min: -Infinity, letter: "F", points: 0.0 },
];

export function pctToLetterPoints(pct) {
  const row = GRADE_SCALE.find((r) => pct >= r.min) || GRADE_SCALE.at(-1);
  return row;
}

// Computes a class's live percentage from its categories/assignments.
// extraDraft: optional array of { categoryId, score, max } simulated
// assignments layered on top for "what-if" mode, without mutating state.
export function computeClassPct(klass, extraDraft = []) {
  const byCat = new Map();
  for (const c of klass.categories) byCat.set(c.id, []);
  for (const a of klass.assignments) {
    if (byCat.has(a.categoryId)) byCat.get(a.categoryId).push(a);
  }
  for (const d of extraDraft) {
    if (byCat.has(d.categoryId)) byCat.get(d.categoryId).push(d);
  }

  let weightedSum = 0;
  let weightUsed = 0;
  for (const cat of klass.categories) {
    const items = byCat.get(cat.id) || [];
    if (!items.length) continue;
    const totalScore = items.reduce((s, i) => s + Number(i.score), 0);
    const totalMax = items.reduce((s, i) => s + Number(i.max), 0);
    if (totalMax <= 0) continue;
    const catPct = (totalScore / totalMax) * 100;
    weightedSum += catPct * cat.weight;
    weightUsed += cat.weight;
  }

  if (weightUsed === 0) return null; // no graded work yet
  return weightedSum / weightUsed;
}

export function computeGpa(classes, draftByClass = {}) {
  let pointSum = 0;
  let creditSum = 0;
  const perClass = classes.map((k) => {
    const pct = computeClassPct(k, draftByClass[k.id] || []);
    const row = pct == null ? null : pctToLetterPoints(pct);
    if (row) {
      pointSum += row.points * (k.credits || 3);
      creditSum += k.credits || 3;
    }
    return { id: k.id, pct, row };
  });
  const gpa = creditSum > 0 ? pointSum / creditSum : 0;
  return { gpa, perClass };
}

/* ---------- Leveling ---------- */

export function levelFromXp(xp) {
  // Each level needs progressively a bit more: 150 * level
  let level = 1;
  let remaining = xp;
  let need = 150;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = 150 + (level - 1) * 25;
  }
  return { level, into: remaining, need };
}

export const XP_RULES = {
  addAssignment: 5,
  uploadFile: 15,
  quizCorrect: 8,
  quizComplete: 12,
  addFriend: 5,
  createGroup: 10,
};

/* ---------- Seed data (first class added for a fresh account) ---------- */

const SEED_CLASSES = [
  {
    name: "AP Calculus BC",
    color: "#3be7ff",
    credits: 4,
    categories: [
      { name: "Tests", weight: 50 },
      { name: "Quizzes", weight: 30 },
      { name: "Homework", weight: 20 },
    ],
    assignments: [
      { category: 0, name: "Unit 3 Test", score: 87, max: 100 },
      { category: 1, name: "Related Rates Quiz", score: 18, max: 20 },
      { category: 2, name: "Problem Set 6", score: 19, max: 20 },
    ],
  },
  {
    name: "AP Literature",
    color: "#8b5cff",
    credits: 3,
    categories: [
      { name: "Essays", weight: 60 },
      { name: "Quizzes", weight: 25 },
      { name: "Participation", weight: 15 },
    ],
    assignments: [
      { category: 0, name: "Gatsby Close Read", score: 91, max: 100 },
      { category: 1, name: "Ch. 1-4 Reading Check", score: 9, max: 10 },
    ],
  },
];

async function seedClassesForNewAccount(userId) {
  for (const seed of SEED_CLASSES) {
    const { data: klass, error: ce } = await supabase
      .from("classes")
      .insert({ user_id: userId, name: seed.name, color: seed.color, credits: seed.credits })
      .select()
      .single();
    if (ce || !klass) continue;

    const { data: cats, error: cate } = await supabase
      .from("categories")
      .insert(seed.categories.map((c) => ({ class_id: klass.id, name: c.name, weight: c.weight })))
      .select();
    if (cate || !cats) continue;

    await supabase
      .from("assignments")
      .insert(
        seed.assignments.map((a) => ({
          category_id: cats[a.category].id,
          name: a.name,
          score: a.score,
          max: a.max,
        }))
      );
  }
}

/* ---------- Fetch helpers ---------- */

async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

async function fetchProfilesByIds(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select("id, full_name, xp, gpa").in("id", ids);
  if (error) throw error;
  return data;
}

async function fetchClasses(userId) {
  const { data: classRows, error: ce } = await supabase
    .from("classes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (ce) throw ce;
  if (!classRows.length) return [];

  const classIds = classRows.map((c) => c.id);
  const { data: catRows, error: cate } = await supabase.from("categories").select("*").in("class_id", classIds);
  if (cate) throw cate;

  const catIds = catRows.map((c) => c.id);
  let asgRows = [];
  if (catIds.length) {
    const { data, error: ae } = await supabase.from("assignments").select("*").in("category_id", catIds);
    if (ae) throw ae;
    asgRows = data;
  }

  return classRows.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    credits: c.credits,
    categories: catRows
      .filter((cat) => cat.class_id === c.id)
      .map((cat) => ({ id: cat.id, name: cat.name, weight: Number(cat.weight) })),
    assignments: asgRows
      .filter((a) => catRows.find((cat) => cat.id === a.category_id)?.class_id === c.id)
      .map((a) => ({
        id: a.id,
        categoryId: a.category_id,
        name: a.name,
        score: Number(a.score),
        max: Number(a.max),
      })),
  }));
}

async function loadFriendsAndRequests(userId) {
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  const accepted = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === userId);

  const otherIds = [
    ...new Set([
      ...accepted.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
      ...incoming.map((r) => r.requester_id),
      ...outgoing.map((r) => r.addressee_id),
    ]),
  ];
  const profiles = await fetchProfilesByIds(otherIds);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const friends = accepted.map((r) => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const p = byId.get(otherId);
    return {
      id: otherId,
      friendshipId: r.id,
      name: p?.full_name || "Unknown",
      gpa: Number(p?.gpa || 0),
      level: levelFromXp(p?.xp || 0).level,
    };
  });
  const incomingRequests = incoming.map((r) => ({
    friendshipId: r.id,
    id: r.requester_id,
    name: byId.get(r.requester_id)?.full_name || "Unknown",
  }));
  const outgoingRequests = outgoing.map((r) => ({
    friendshipId: r.id,
    id: r.addressee_id,
    name: byId.get(r.addressee_id)?.full_name || "Unknown",
  }));

  return { friends, incomingRequests, outgoingRequests };
}

async function fetchGroups(userId) {
  const { data: memberRows, error: me } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (me) throw me;
  const groupIds = [...new Set(memberRows.map((r) => r.group_id))];
  if (!groupIds.length) return [];

  const { data: groupRows, error: ge } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: true });
  if (ge) throw ge;

  const { data: allMembers, error: ame } = await supabase
    .from("group_members")
    .select("group_id, user_id")
    .in("group_id", groupIds);
  if (ame) throw ame;

  const { data: notesRows, error: ne } = await supabase
    .from("group_notes")
    .select("*")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });
  if (ne) throw ne;

  const { data: remRows, error: re } = await supabase.from("group_reminders").select("*").in("group_id", groupIds);
  if (re) throw re;

  const profiles = await fetchProfilesByIds([...new Set(allMembers.map((m) => m.user_id))]);
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  return groupRows.map((g) => ({
    id: g.id,
    name: g.name,
    captainId: g.captain_id,
    members: allMembers
      .filter((m) => m.group_id === g.id)
      .map((m) => ({ id: m.user_id, name: nameById.get(m.user_id) || "Unknown" })),
    notes: notesRows
      .filter((n) => n.group_id === g.id)
      .map((n) => ({
        id: n.id,
        text: n.text,
        authorId: n.author_id,
        authorName: nameById.get(n.author_id) || "Unknown",
        at: new Date(n.created_at).getTime(),
      })),
    reminders: remRows
      .filter((r) => r.group_id === g.id)
      .map((r) => ({ id: r.id, text: r.text, due: r.due, done: r.done, authorId: r.author_id })),
  }));
}

async function fetchFiles(userId, groupIds) {
  const { data: personal, error: pe } = await supabase
    .from("files")
    .select("*")
    .is("group_id", null)
    .eq("owner_id", userId);
  if (pe) throw pe;

  let group = [];
  if (groupIds.length) {
    const { data, error: ge } = await supabase.from("files").select("*").in("group_id", groupIds);
    if (ge) throw ge;
    group = data;
  }

  return [...personal, ...group]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      dataUrl: f.data_url,
      note: f.note,
      groupId: f.group_id,
      at: new Date(f.created_at).getTime(),
    }));
}

async function fetchActivity(userId) {
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data.map((a) => ({ id: a.id, amount: a.amount, reason: a.reason, at: new Date(a.created_at).getTime() }));
}

/* ---------- Context ---------- */

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState({ name: "", xp: 0 });
  const [classes, setClasses] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [files, setFiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState("dark");

  // Theme is local-only, independent of auth state.
  useEffect(() => {
    const th = readLS(THEME_KEY, "dark");
    setTheme(th);
    document.documentElement.dataset.theme = th;
  }, []);

  const pushToast = useCallback((msg) => {
    setToast({ msg, id: uid() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshFriends = useCallback(async () => {
    if (!userId) return;
    const { friends: f, incomingRequests: inc, outgoingRequests: out } = await loadFriendsAndRequests(userId);
    setFriends(f);
    setIncomingRequests(inc);
    setOutgoingRequests(out);
  }, [userId]);

  const refreshClasses = useCallback(async () => {
    if (!userId) return;
    setClasses(await fetchClasses(userId));
  }, [userId]);

  const refreshGroups = useCallback(async () => {
    if (!userId) return;
    const g = await fetchGroups(userId);
    setGroups(g);
    setFiles(await fetchFiles(userId, g.map((x) => x.id)));
    return g;
  }, [userId]);

  const refreshActivity = useCallback(async () => {
    if (!userId) return;
    setActivity(await fetchActivity(userId));
  }, [userId]);

  // Initial load / reload whenever the signed-in account changes.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setMounted(false);
      setProfile({ name: "", xp: 0 });
      setClasses([]);
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setGroups([]);
      setFiles([]);
      setActivity([]);
      return;
    }
    (async () => {
      try {
        let p = await fetchProfile(userId);
        let c = await fetchClasses(userId);
        if (c.length === 0) {
          await seedClassesForNewAccount(userId);
          c = await fetchClasses(userId);
        }
        const { friends: f, incomingRequests: inc, outgoingRequests: out } = await loadFriendsAndRequests(userId);
        const g = await fetchGroups(userId);
        const fl = await fetchFiles(userId, g.map((x) => x.id));
        const act = await fetchActivity(userId);
        if (cancelled) return;
        setProfile({ name: p.full_name, xp: p.xp });
        setClasses(c);
        setFriends(f);
        setIncomingRequests(inc);
        setOutgoingRequests(out);
        setGroups(g);
        setFiles(fl);
        setActivity(act);
        setMounted(true);
      } catch (e) {
        if (!cancelled) pushToast("Couldn't load your data — check your connection and reload.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pushToast]);

  const { gpa, perClass } = useMemo(() => computeGpa(classes), [classes]);
  const levelInfo = useMemo(() => levelFromXp(profile.xp || 0), [profile.xp]);

  // Keep the shared, friend-visible gpa column in sync with the locally
  // computed one whenever classes change.
  useEffect(() => {
    if (!userId || !mounted) return;
    supabase.from("profiles").update({ gpa }).eq("id", userId).then(() => {});
  }, [userId, mounted, gpa]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      writeLS(THEME_KEY, next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, []);

  const grantXp = useCallback(
    async (amount, reason) => {
      if (!userId) return;
      try {
        const { data: newXp, error } = await supabase.rpc("grant_xp", { amount, reason });
        if (error) throw error;
        setProfile((p) => ({ ...p, xp: newXp }));
        pushToast(`+${amount} XP · ${reason}`);
        refreshActivity();
      } catch {
        pushToast("Couldn't save that — check your connection.");
      }
    },
    [userId, pushToast, refreshActivity]
  );

  /* ---------- Classes / categories / assignments ---------- */

  const addClass = useCallback(
    async (name, color, credits) => {
      if (!userId) return;
      try {
        await supabase
          .from("classes")
          .insert({ user_id: userId, name, color, credits: Number(credits) || 3 })
          .select()
          .single()
          .then(async ({ data: klass, error }) => {
            if (error) throw error;
            await supabase.from("categories").insert([
              { class_id: klass.id, name: "Tests", weight: 40 },
              { class_id: klass.id, name: "Quizzes", weight: 30 },
              { class_id: klass.id, name: "Homework", weight: 30 },
            ]);
          });
        await refreshClasses();
      } catch {
        pushToast("Couldn't add that class — try again.");
      }
    },
    [userId, refreshClasses, pushToast]
  );

  const removeClass = useCallback(
    async (classId) => {
      try {
        await supabase.from("classes").delete().eq("id", classId);
        await refreshClasses();
      } catch {
        pushToast("Couldn't remove that class — try again.");
      }
    },
    [refreshClasses, pushToast]
  );

  const addCategory = useCallback(
    async (classId, name, weight) => {
      try {
        await supabase.from("categories").insert({ class_id: classId, name, weight: Number(weight) || 0 });
        await refreshClasses();
      } catch {
        pushToast("Couldn't add that category — try again.");
      }
    },
    [refreshClasses, pushToast]
  );

  const addAssignment = useCallback(
    async (classId, categoryId, name, score, max) => {
      try {
        await supabase
          .from("assignments")
          .insert({ category_id: categoryId, name, score: Number(score), max: Number(max) });
        await refreshClasses();
        grantXp(XP_RULES.addAssignment, `Logged "${name}"`);
      } catch {
        pushToast("Couldn't log that assignment — try again.");
      }
    },
    [refreshClasses, grantXp, pushToast]
  );

  const removeAssignment = useCallback(
    async (_classId, assignmentId) => {
      try {
        await supabase.from("assignments").delete().eq("id", assignmentId);
        await refreshClasses();
      } catch {
        pushToast("Couldn't remove that — try again.");
      }
    },
    [refreshClasses, pushToast]
  );

  /* ---------- Friends ---------- */

  const searchProfiles = useCallback(
    async (query) => {
      const q = query.trim();
      if (q.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${q}%`)
        .neq("id", userId)
        .limit(8);
      if (error) return [];
      return data.map((p) => ({ id: p.id, name: p.full_name }));
    },
    [userId]
  );

  const sendFriendRequest = useCallback(
    async (targetId, targetName) => {
      if (!userId) return;
      try {
        // If they already requested you, accept instead of duplicating.
        const { data: reverse } = await supabase
          .from("friendships")
          .select("id, status")
          .eq("requester_id", targetId)
          .eq("addressee_id", userId)
          .maybeSingle();
        if (reverse) {
          if (reverse.status === "pending") {
            await supabase.from("friendships").update({ status: "accepted" }).eq("id", reverse.id);
            pushToast(`You and ${targetName} are now rivals`);
          }
        } else {
          await supabase.from("friendships").insert({ requester_id: userId, addressee_id: targetId });
          pushToast(`Request sent to ${targetName}`);
        }
        await refreshFriends();
      } catch {
        pushToast("Couldn't send that request — try again.");
      }
    },
    [userId, refreshFriends, pushToast]
  );

  const acceptFriendRequest = useCallback(
    async (friendshipId, name) => {
      try {
        await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
        await refreshFriends();
        grantXp(XP_RULES.addFriend, `Connected with ${name}`);
      } catch {
        pushToast("Couldn't accept that request — try again.");
      }
    },
    [refreshFriends, grantXp, pushToast]
  );

  const removeFriendship = useCallback(
    async (friendshipId) => {
      try {
        await supabase.from("friendships").delete().eq("id", friendshipId);
        await refreshFriends();
      } catch {
        pushToast("Couldn't do that — try again.");
      }
    },
    [refreshFriends, pushToast]
  );

  /* ---------- Groups ---------- */

  const addGroup = useCallback(
    async (name, memberIds = []) => {
      if (!userId) return;
      try {
        const { data, error } = await supabase.rpc("create_group", { group_name: name });
        if (error) throw error;
        const newGroup = Array.isArray(data) ? data[0] : data;
        if (memberIds.length && newGroup) {
          await supabase
            .from("group_members")
            .insert(memberIds.map((id) => ({ group_id: newGroup.id, user_id: id })));
        }
        await refreshGroups();
        grantXp(XP_RULES.createGroup, `Started group "${name}"`);
      } catch {
        pushToast("Couldn't create that group — try again.");
      }
    },
    [userId, refreshGroups, grantXp, pushToast]
  );

  const removeGroup = useCallback(
    async (groupId) => {
      try {
        await supabase.from("groups").delete().eq("id", groupId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't delete that group — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  const renameGroup = useCallback(
    async (groupId, name) => {
      try {
        await supabase.from("groups").update({ name }).eq("id", groupId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't rename that group — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  const transferCaptain = useCallback(
    async (groupId, newCaptainId) => {
      try {
        const { error } = await supabase.rpc("transfer_captain", { gid: groupId, new_captain_id: newCaptainId });
        if (error) throw error;
        await refreshGroups();
      } catch {
        pushToast("Couldn't hand off captain — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  const addGroupMember = useCallback(
    async (groupId, friendId) => {
      try {
        const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: friendId });
        if (error) throw error;
        await refreshGroups();
      } catch {
        pushToast("Couldn't add them — they need to be an accepted friend first.");
      }
    },
    [refreshGroups, pushToast]
  );

  const removeGroupMember = useCallback(
    async (groupId, memberId) => {
      try {
        await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't remove them — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  const addGroupNote = useCallback(
    async (groupId, text) => {
      if (!userId) return;
      try {
        await supabase.from("group_notes").insert({ group_id: groupId, author_id: userId, text });
        await refreshGroups();
      } catch {
        pushToast("Couldn't post that note — try again.");
      }
    },
    [userId, refreshGroups, pushToast]
  );

  const removeGroupNote = useCallback(
    async (_groupId, noteId) => {
      try {
        await supabase.from("group_notes").delete().eq("id", noteId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't remove that note — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  const addGroupReminder = useCallback(
    async (groupId, text, due) => {
      if (!userId) return;
      try {
        await supabase.from("group_reminders").insert({ group_id: groupId, author_id: userId, text, due: due || null });
        await refreshGroups();
      } catch {
        pushToast("Couldn't add that reminder — try again.");
      }
    },
    [userId, refreshGroups, pushToast]
  );

  const toggleGroupReminder = useCallback(
    async (_groupId, reminderId) => {
      try {
        const group = groups.find((g) => g.reminders.some((r) => r.id === reminderId));
        const reminder = group?.reminders.find((r) => r.id === reminderId);
        if (!reminder) return;
        await supabase.from("group_reminders").update({ done: !reminder.done }).eq("id", reminderId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't update that reminder — try again.");
      }
    },
    [groups, refreshGroups, pushToast]
  );

  const removeGroupReminder = useCallback(
    async (_groupId, reminderId) => {
      try {
        await supabase.from("group_reminders").delete().eq("id", reminderId);
        await refreshGroups();
      } catch {
        pushToast("Couldn't remove that reminder — try again.");
      }
    },
    [refreshGroups, pushToast]
  );

  /* ---------- Files ---------- */

  const addFile = useCallback(
    async (fileMeta) => {
      if (!userId) return;
      try {
        await supabase.from("files").insert({
          owner_id: userId,
          group_id: fileMeta.groupId || null,
          name: fileMeta.name,
          size: fileMeta.size,
          type: fileMeta.type,
          data_url: fileMeta.dataUrl || null,
          note: fileMeta.note || null,
        });
        setFiles(await fetchFiles(userId, groups.map((g) => g.id)));
        grantXp(XP_RULES.uploadFile, `Shared "${fileMeta.name}"`);
      } catch {
        pushToast("Couldn't upload that file — try again.");
      }
    },
    [userId, groups, grantXp, pushToast]
  );

  const removeFile = useCallback(
    async (id) => {
      try {
        await supabase.from("files").delete().eq("id", id);
        if (userId) setFiles(await fetchFiles(userId, groups.map((g) => g.id)));
      } catch {
        pushToast("Couldn't remove that file — try again.");
      }
    },
    [userId, groups, pushToast]
  );

  const completeQuiz = useCallback(
    (correctCount, total) => {
      const xp = XP_RULES.quizComplete + correctCount * XP_RULES.quizCorrect;
      grantXp(xp, `Quiz: ${correctCount}/${total} correct`);
    },
    [grantXp]
  );

  const value = {
    mounted,
    profile,
    classes,
    friends,
    incomingRequests,
    outgoingRequests,
    groups,
    files,
    activity,
    toast,
    theme,
    // Data changed by other people (friend requests, shared group content)
    // only shows up on refetch, not live — screens call these on mount so
    // navigating back to a tab picks up anything that happened elsewhere.
    refreshFriends,
    refreshClasses,
    refreshGroups,
    refreshActivity,
    toggleTheme,
    gpa,
    perClass,
    levelInfo,
    grantXp,
    addClass,
    removeClass,
    addCategory,
    addAssignment,
    removeAssignment,
    searchProfiles,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
    addGroup,
    removeGroup,
    renameGroup,
    transferCaptain,
    addGroupMember,
    removeGroupMember,
    addGroupNote,
    removeGroupNote,
    addGroupReminder,
    toggleGroupReminder,
    removeGroupReminder,
    addFile,
    removeFile,
    completeQuiz,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { uid };
