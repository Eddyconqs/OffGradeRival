"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, computeClassPct, pctToLetterPoints, uid } from "../lib/store";

const PALETTE = ["#e8b93f", "#9d8cff", "#4fd1a5", "#e15a45", "#6fb7e8", "#f0a8c9"];

function NewClassForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [credits, setCredits] = useState(3);

  if (!open) {
    return (
      <button className="gr-btn primary" onClick={() => setOpen(true)}>
        + Add a class
      </button>
    );
  }

  return (
    <div className="gr-card" style={{ marginBottom: 16 }}>
      <div className="gr-row">
        <div className="gr-field" style={{ flex: 2 }}>
          <label>Class name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="AP Chemistry" />
        </div>
        <div className="gr-field" style={{ width: 110 }}>
          <label>Credits</label>
          <input type="number" min="1" max="6" value={credits} onChange={(e) => setCredits(e.target.value)} />
        </div>
        <button
          className="gr-btn primary"
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name.trim(), PALETTE[Math.floor(Math.random() * PALETTE.length)], credits);
            setName("");
            setOpen(false);
          }}
        >
          Save class
        </button>
        <button className="gr-btn ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddAssignmentRow({ classId, categories, onAdd }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [max, setMax] = useState("100");

  return (
    <div className="gr-row" style={{ marginTop: 10 }}>
      <div className="gr-field" style={{ minWidth: 130 }}>
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="gr-field" style={{ flex: 1, minWidth: 140 }}>
        <label>Assignment</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit 4 Quiz" />
      </div>
      <div className="gr-field" style={{ width: 80 }}>
        <label>Score</label>
        <input type="number" value={score} onChange={(e) => setScore(e.target.value)} />
      </div>
      <div className="gr-field" style={{ width: 80 }}>
        <label>Out of</label>
        <input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <button
        className="gr-btn small primary"
        disabled={!name.trim() || score === "" || !max || !categoryId}
        onClick={() => {
          onAdd(classId, categoryId, name.trim(), score, max);
          setName("");
          setScore("");
        }}
      >
        Add
      </button>
    </div>
  );
}

function WhatIf({ klass }) {
  const [on, setOn] = useState(false);
  const [categoryId, setCategoryId] = useState(klass.categories[0]?.id || "");
  const [score, setScore] = useState(85);
  const [max, setMax] = useState(100);

  const draft = on ? [{ categoryId, score: Number(score), max: Number(max) }] : [];
  const currentPct = computeClassPct(klass, []);
  const projectedPct = computeClassPct(klass, draft);

  const delta =
    currentPct != null && projectedPct != null ? projectedPct - currentPct : null;

  return (
    <div style={{ marginTop: 14 }}>
      <button className="gr-btn small ghost" onClick={() => setOn((v) => !v)}>
        {on ? "Exit what-if mode" : "What if…"}
      </button>
      {on && (
        <div className="gr-whatif-banner" style={{ marginTop: 10, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div className="gr-row" style={{ alignItems: "flex-end" }}>
            <div className="gr-field" style={{ minWidth: 120 }}>
              <label style={{ color: "var(--violet)" }}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {klass.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="gr-field" style={{ width: 80 }}>
              <label style={{ color: "var(--violet)" }}>Score</label>
              <input type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="gr-field" style={{ width: 80 }}>
              <label style={{ color: "var(--violet)" }}>Out of</label>
              <input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
            {projectedPct == null
              ? "Add weighted categories to simulate."
              : `Projected grade: ${projectedPct.toFixed(1)}% (${pctToLetterPoints(projectedPct).letter})` +
                (delta != null
                  ? ` — ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts vs. current`
                  : "")}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassCard({ klass }) {
  const { removeClass, addAssignment, removeAssignment, addCategory } = useStore();
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catWeight, setCatWeight] = useState(10);

  const pct = computeClassPct(klass, []);
  const row = pct != null ? pctToLetterPoints(pct) : null;
  const totalWeight = klass.categories.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="gr-class">
      <div className="gr-class-head">
        <div className="gr-class-name">
          <span className="gr-swatch" style={{ background: klass.color }} />
          <h3>{klass.name}</h3>
          <span className="gr-tag">{klass.credits} cr</span>
          {totalWeight !== 100 && (
            <span className="gr-tag" style={{ color: "var(--rival)", borderColor: "var(--rival)" }}>
              weights sum to {totalWeight}%
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="gr-class-grade" style={{ color: klass.color }}>
            {pct != null ? `${pct.toFixed(1)}%` : "—"}
          </div>
          <button className="gr-btn small danger" onClick={() => removeClass(klass.id)}>
            Remove
          </button>
        </div>
      </div>

      {pct != null && (
        <div className="gr-pct-track">
          <div className="gr-pct-fill" style={{ width: `${Math.min(100, pct)}%`, background: klass.color }} />
        </div>
      )}
      {row && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          Letter grade {row.letter} · {row.points.toFixed(1)} GPA points
        </div>
      )}

      {klass.categories.map((cat) => {
        const items = klass.assignments.filter((a) => a.categoryId === cat.id);
        return (
          <div key={cat.id} className="gr-category">
            <div className="gr-category-head">
              <span>
                {cat.name} · {cat.weight}% weight
              </span>
              <span>{items.length} logged</span>
            </div>
            {items.map((a) => (
              <div key={a.id} className="gr-assignment">
                <span className="name">{a.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="score">
                    {a.score}/{a.max}
                  </span>
                  <button
                    className="gr-btn small ghost"
                    onClick={() => removeAssignment(klass.id, a.id)}
                  >
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <AddAssignmentRow classId={klass.id} categories={klass.categories} onAdd={addAssignment} />

      <div style={{ marginTop: 10 }}>
        {showAddCat ? (
          <div className="gr-row" style={{ marginTop: 6 }}>
            <div className="gr-field" style={{ flex: 1 }}>
              <label>New category</label>
              <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Labs" />
            </div>
            <div className="gr-field" style={{ width: 90 }}>
              <label>Weight %</label>
              <input type="number" value={catWeight} onChange={(e) => setCatWeight(e.target.value)} />
            </div>
            <button
              className="gr-btn small primary"
              disabled={!catName.trim()}
              onClick={() => {
                addCategory(klass.id, catName.trim(), catWeight);
                setCatName("");
                setShowAddCat(false);
              }}
            >
              Add category
            </button>
            <button className="gr-btn small ghost" onClick={() => setShowAddCat(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="gr-btn small ghost" onClick={() => setShowAddCat(true)}>
            + New weighted category
          </button>
        )}
      </div>

      <WhatIf klass={klass} />
    </div>
  );
}

export default function Classes() {
  const { classes, addClass, gpa, refreshClasses } = useStore();

  // Picks up changes made from another device on this same account.
  useEffect(() => {
    refreshClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="gr-section-head">
        <div>
          <h2>Classes & Grades</h2>
          <p>Weight your categories, log real scores, and project what comes next.</p>
        </div>
        <div className="gr-stat" style={{ minWidth: 130 }}>
          <div className="n">{gpa ? gpa.toFixed(2) : "—"}</div>
          <div className="k">Overall GPA</div>
        </div>
      </div>

      <NewClassForm onAdd={addClass} />

      <div style={{ marginTop: 16 }}>
        {classes.length ? (
          classes.map((k) => <ClassCard key={k.id} klass={k} />)
        ) : (
          <div className="gr-empty">
            <b>No classes yet</b>
            Add your first class to start tracking grades and projections.
          </div>
        )}
      </div>
    </div>
  );
}
