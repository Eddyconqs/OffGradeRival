"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Star, Shield, Sparkles, Pencil } from "lucide-react";
import { useStore } from "../lib/store";

const YEAR_OPTIONS = [
  { value: "1st", label: "1st year" },
  { value: "2nd", label: "2nd year" },
  { value: "3rd", label: "3rd year" },
  { value: "4th", label: "4th year" },
];

function yearBadge(year) {
  if (year === "1st") return { label: "Rookie", icon: Shield };
  if (year === "2nd" || year === "3rd") return { label: "Rising Star", icon: Sparkles };
  if (year === "4th") return { label: "Veteran", icon: Shield };
  return null;
}

// Grade tiers only ever reveal the letter, never the underlying % or GPA
// points — some people don't want that shared, even on their own card.
function gradeTier(letter) {
  if (!letter) return null;
  if (letter.startsWith("A")) return "allstar";
  if (letter.startsWith("B")) return "star";
  return null;
}

function initials(name) {
  return (name || "You")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfileCard({ onClose }) {
  const { profile, classes, perClass, levelInfo, updateClassYear } = useStore();
  const reduceMotion = useReducedMotion();
  const [editingYear, setEditingYear] = useState(false);

  const badge = yearBadge(profile.classYear);
  const rows = classes.map((k) => {
    const pc = perClass.find((p) => p.id === k.id);
    return { id: k.id, name: k.name, color: k.color, term: k.term, letter: pc?.row?.letter || null };
  });

  const allStarCount = rows.filter((r) => gradeTier(r.letter) === "allstar").length;
  const starCount = rows.filter((r) => gradeTier(r.letter) === "star").length;

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <div className="gr-profilecard-backdrop" onClick={onClose}>
      <motion.div
        className="gr-profilecard"
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? { opacity: 0 } : { rotateY: -110, opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 170, damping: 22 }}
      >
        <button className="gr-profilecard-close" onClick={onClose} aria-label="Close profile card">
          <X size={16} />
        </button>

        <div className="gr-profilecard-header">
          <div className="gr-avatar" style={{ width: 56, height: 56, fontSize: 19, flex: "none" }}>
            {initials(profile.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="gr-profilecard-name">{profile.name || "You"}</div>
            <div className="gr-profilecard-sub">
              Lv. {levelInfo.level}
              {memberSince ? ` · Member since ${memberSince}` : ""}
            </div>
          </div>
        </div>

        <div className="gr-profilecard-badgerow">
          {badge && !editingYear ? (
            <button className="gr-profilecard-yearbadge" onClick={() => setEditingYear(true)}>
              <badge.icon size={13} /> {badge.label}
              <Pencil size={10} className="gr-profilecard-edit-hint" />
            </button>
          ) : (
            <div className="gr-profilecard-yearpick">
              <label>What year are you?</label>
              <select
                value={profile.classYear || ""}
                onChange={(e) => {
                  updateClassYear(e.target.value);
                  setEditingYear(false);
                }}
                autoFocus={editingYear}
              >
                <option value="" disabled>
                  Pick one…
                </option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="gr-profilecard-tablewrap">
          <table className="gr-profilecard-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Class</th>
                <th>Grade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="gr-profilecard-empty">
                    No classes tracked yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const tier = gradeTier(r.letter);
                  return (
                    <tr key={r.id}>
                      <td className="gr-profilecard-term">{r.term || "—"}</td>
                      <td className="gr-profilecard-classname">
                        <span className="gr-swatch" style={{ background: r.color, marginRight: 6 }} />
                        {r.name}
                      </td>
                      <td className="gr-profilecard-grade">{r.letter || "—"}</td>
                      <td className="gr-profilecard-tier">
                        {tier === "allstar" && <Star size={12} className="allstar" fill="currentColor" />}
                        {tier === "star" && <Star size={12} className="star" />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="gr-profilecard-footer">
          <span>
            {allStarCount} All-Star · {starCount} Star
          </span>
          <span>{profile.streak || 0} day streak</span>
        </div>

        <div className="gr-profilecard-brand">GRADE ARENA</div>

        <span className="gr-panel-bolt bl" />
        <span className="gr-panel-bolt br" />
      </motion.div>
    </div>
  );
}
