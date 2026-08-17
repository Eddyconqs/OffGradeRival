"use client";

import { useEffect, useRef, useState } from "react";
import { useStore, XP_RULES } from "../lib/store";
import { pickQuiz } from "../lib/quizBank";
import SevenSeg from "./SevenSeg";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function StudyScoreboard() {
  const { profile, activity, claimStreakBonus } = useStore();
  const today = todayStr();
  const xpToday = activity
    .filter((a) => new Date(a.at).toISOString().slice(0, 10) === today)
    .reduce((s, a) => s + a.amount, 0);
  const quizzesTaken = activity.filter((a) => a.reason.startsWith("Quiz:")).length;
  const claimedToday = profile.streakLastClaim === today;

  return (
    <div className="gr-arena" style={{ marginBottom: 20 }}>
      <span className="gr-arena-bolt tl" />
      <span className="gr-arena-bolt tr" />
      <span className="gr-arena-bolt bl" />
      <span className="gr-arena-bolt br" />
      <div className="gr-board">
        <div className="gr-board-head tone-mint">Study Scoreboard</div>
        <div className="gr-board-grid">
          <div className="gr-led-stat">
            <div className="n">
              <SevenSeg value={String(xpToday)} color="var(--led-green)" size={1.6} />
            </div>
            <div className="k">XP today</div>
          </div>
          <div className="gr-led-stat">
            <div className="n">
              <SevenSeg value={String(profile.streak || 0)} color="var(--led-amber)" size={1.6} />
            </div>
            <div className="k">Day streak</div>
          </div>
          <div className="gr-led-stat">
            <div className="n">
              <SevenSeg value={String(quizzesTaken)} color="var(--led-red)" size={1.6} />
            </div>
            <div className="k">Quizzes taken</div>
          </div>
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button className="gr-btn primary" disabled={claimedToday} onClick={claimStreakBonus}>
            {claimedToday ? "Streak claimed today ✓" : "Claim today's streak bonus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusTimer() {
  const { grantXp } = useStore();
  const PRESETS = [15, 25, 50];
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          grantXp(XP_RULES.focusSession, `Finished a ${minutes}-minute focus session`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const pick = (m) => {
    setRunning(false);
    setMinutes(m);
    setSecondsLeft(m * 60);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(minutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const finished = secondsLeft === 0;

  return (
    <div className="gr-card">
      <div className="gr-card-title">Focus timer</div>
      <p className="gr-card-sub">Run a distraction-free block, earn XP when it completes.</p>
      <div style={{ textAlign: "center", margin: "6px 0 14px" }}>
        <SevenSeg value={`${mm}:${ss}`} color={finished ? "var(--led-green)" : "var(--led-red)"} size={2} />
      </div>
      <div className="gr-row" style={{ justifyContent: "center", marginBottom: 12 }}>
        {PRESETS.map((m) => (
          <button
            key={m}
            className={`gr-btn small ${m === minutes ? "primary" : "ghost"}`}
            disabled={running}
            onClick={() => pick(m)}
          >
            {m}m
          </button>
        ))}
      </div>
      <div className="gr-row" style={{ justifyContent: "center" }}>
        <button className="gr-btn primary" disabled={finished} onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="gr-btn ghost" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}

function Quiz() {
  const { completeQuiz } = useStore();
  const [questions, setQuestions] = useState(() => pickQuiz(5));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const current = questions[i];

  const choose = (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === current.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (i + 1 >= questions.length) {
      const finalCorrect = correct;
      setDone(true);
      completeQuiz(finalCorrect, questions.length);
    } else {
      setI((v) => v + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setQuestions(pickQuiz(5));
    setI(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="gr-card">
        <div className="gr-card-title">Quiz complete</div>
        <p className="gr-card-sub">
          {correct} / {questions.length} correct — XP has been added to your level bar.
        </p>
        <button className="gr-btn primary" onClick={restart}>
          Take another quiz
        </button>
      </div>
    );
  }

  return (
    <div className="gr-card">
      <div className="gr-card-title">Quick quiz</div>
      <div className="gr-quiz-progress">
        Question {i + 1} of {questions.length} · {correct} correct so far
      </div>
      <div className="gr-quiz-q">{current.q}</div>
      {current.options.map((opt, idx) => {
        let cls = "gr-quiz-opt";
        if (picked !== null) {
          if (idx === current.answer) cls += " correct";
          else if (idx === picked) cls += " wrong";
        }
        return (
          <button key={idx} className={cls} onClick={() => choose(idx)}>
            {opt}
          </button>
        );
      })}
      <button className="gr-btn primary" style={{ marginTop: 8 }} disabled={picked === null} onClick={next}>
        {i + 1 >= questions.length ? "Finish quiz" : "Next question"}
      </button>
    </div>
  );
}

function DeckForm({ classes, onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");

  if (!open) {
    return (
      <button className="gr-btn primary" onClick={() => setOpen(true)}>
        + New deck
      </button>
    );
  }

  return (
    <div className="gr-row" style={{ marginBottom: 14 }}>
      <div className="gr-field" style={{ flex: 1 }}>
        <label>Deck name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit 3 vocab" />
      </div>
      <div className="gr-field" style={{ width: 180 }}>
        <label>Class (optional)</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">No class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        className="gr-btn primary"
        disabled={!name.trim()}
        onClick={() => {
          onAdd(name.trim(), classId || null);
          setName("");
          setClassId("");
          setOpen(false);
        }}
      >
        Create
      </button>
      <button className="gr-btn ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

function CardForm({ deckId, onAdd }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const submit = () => {
    if (!front.trim() || !back.trim()) return;
    onAdd(deckId, front.trim(), back.trim());
    setFront("");
    setBack("");
  };

  return (
    <div className="gr-row" style={{ marginBottom: 14 }}>
      <div className="gr-field" style={{ flex: 1 }}>
        <label>Front</label>
        <input
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Term or question"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      <div className="gr-field" style={{ flex: 1 }}>
        <label>Back</label>
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Definition or answer"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      <button className="gr-btn primary" disabled={!front.trim() || !back.trim()} onClick={submit}>
        Add card
      </button>
    </div>
  );
}

function ReviewSession({ deck, onExit, onFinish }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  const card = deck.cards[i];

  const mark = (gotIt) => {
    const nextKnown = known + (gotIt ? 1 : 0);
    if (i + 1 >= deck.cards.length) {
      onFinish(nextKnown, deck.cards.length);
    } else {
      setKnown(nextKnown);
      setI((v) => v + 1);
      setFlipped(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <p className="gr-card-sub" style={{ marginBottom: 8 }}>
        Card {i + 1} of {deck.cards.length}
      </p>
      <div className="gr-flashcard" onClick={() => setFlipped((f) => !f)}>
        {flipped ? card.back : card.front}
      </div>
      <p className="gr-card-sub" style={{ textAlign: "center" }}>
        {flipped ? "Tap the card to see the question again" : "Tap the card to reveal the answer"}
      </p>
      {flipped && (
        <div className="gr-row" style={{ justifyContent: "center" }}>
          <button className="gr-btn small ghost" onClick={() => mark(false)}>
            Still learning
          </button>
          <button className="gr-btn small primary" onClick={() => mark(true)}>
            Got it
          </button>
        </div>
      )}
      <button className="gr-btn small ghost" style={{ marginTop: 10 }} onClick={onExit}>
        Exit review
      </button>
    </div>
  );
}

function DeckCard({ deck, classes, onRemoveDeck, onAddCard, onRemoveCard, onFinishReview }) {
  const [open, setOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const klass = classes.find((c) => c.id === deck.classId);

  return (
    <div className="gr-class" style={{ marginBottom: 12 }}>
      <div className="gr-class-head">
        <div className="gr-class-name">
          <h3>{deck.name}</h3>
          {klass && (
            <span className="gr-tag">
              <span className="gr-swatch" style={{ background: klass.color, marginRight: 4 }} />
              {klass.name}
            </span>
          )}
          <span className="gr-tag">
            {deck.cards.length} card{deck.cards.length === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="gr-btn small primary"
            disabled={!deck.cards.length}
            onClick={() => {
              setReviewing(true);
              setOpen(false);
            }}
          >
            Study
          </button>
          <button className="gr-btn small ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Manage"}
          </button>
          <button className="gr-btn small danger" onClick={() => onRemoveDeck(deck.id)}>
            Delete
          </button>
        </div>
      </div>

      {reviewing && deck.cards.length > 0 && (
        <ReviewSession
          deck={deck}
          onExit={() => setReviewing(false)}
          onFinish={(known, total) => {
            onFinishReview(known, total);
            setReviewing(false);
          }}
        />
      )}

      {open && !reviewing && (
        <div style={{ marginTop: 10 }}>
          <CardForm deckId={deck.id} onAdd={onAddCard} />
          {deck.cards.length === 0 ? (
            <div className="gr-empty" style={{ padding: "16px 10px" }}>
              <b>No cards yet</b>
              Add a front/back pair above to start building this deck.
            </div>
          ) : (
            deck.cards.map((c) => (
              <div key={c.id} className="gr-row-line">
                <span>
                  <b>{c.front}</b> — {c.back}
                </span>
                <button className="gr-btn small ghost" onClick={() => onRemoveCard(c.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FlashcardsSection() {
  const {
    classes,
    flashcardDecks,
    refreshFlashcardDecks,
    addDeck,
    removeDeck,
    addFlashcard,
    removeFlashcard,
    completeFlashcardReview,
  } = useStore();

  // Deck content can change from another device — pick that up whenever
  // this screen is opened, same as Social/Dashboard do for their data.
  useEffect(() => {
    refreshFlashcardDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gr-card">
      <div className="gr-card-title">Flashcard decks</div>
      <p className="gr-card-sub">Build your own decks for active recall — optionally tied to a class.</p>
      <DeckForm classes={classes} onAdd={addDeck} />
      <div style={{ marginTop: 16 }}>
        {flashcardDecks.length === 0 ? (
          <div className="gr-empty">
            <b>No decks yet</b>
            Create one above and add a few cards to start reviewing.
          </div>
        ) : (
          flashcardDecks.map((d) => (
            <DeckCard
              key={d.id}
              deck={d}
              classes={classes}
              onRemoveDeck={removeDeck}
              onAddCard={addFlashcard}
              onRemoveCard={removeFlashcard}
              onFinishReview={completeFlashcardReview}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function StudyHub() {
  return (
    <div>
      <div className="gr-section-head">
        <div>
          <h2>Study Hub</h2>
          <p>Drill flashcards, run a focus block, and bank XP with quick quizzes. Looking for your files? Head to the Files page.</p>
        </div>
      </div>

      <StudyScoreboard />

      <div className="gr-grid cols-2" style={{ marginBottom: 20 }}>
        <Quiz />
        <FocusTimer />
      </div>

      <FlashcardsSection />
    </div>
  );
}
