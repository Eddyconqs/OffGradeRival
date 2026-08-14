"use client";

import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { pickQuiz } from "../lib/quizBank";
import { formatBytes, fileExt, ingestFiles } from "../lib/files";

function FileDrop() {
  const { addFile } = useStore();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => ingestFiles(fileList, addFile);

  return (
    <div
      className="gr-dropzone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
      style={{ borderColor: dragOver ? "var(--gold)" : undefined }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
      />
      Drop a study guide or notes here, or click to browse · +15 XP per upload
    </div>
  );
}

function FileList() {
  const { files, removeFile } = useStore();
  const personal = files.filter((f) => !f.groupId);
  if (!personal.length) {
    return (
      <div className="gr-empty">
        <b>No personal files yet</b>
        Upload a study guide, notes, or a practice test. Files shared inside a study group live on
        that group's page instead.
      </div>
    );
  }
  return (
    <div>
      {personal.map((f) => (
        <div key={f.id} className="gr-file-row">
          <div className="gr-file-meta">
            <div className="gr-file-icon">{fileExt(f.name)}</div>
            <div>
              <div className="gr-file-name">{f.name}</div>
              <div className="gr-file-sub">
                {formatBytes(f.size)} · {new Date(f.at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {f.dataUrl && (
              <a className="gr-btn small ghost" href={f.dataUrl} download={f.name}>
                Download
              </a>
            )}
            <button className="gr-btn small danger" onClick={() => removeFile(f.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
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

export default function StudyHub() {
  return (
    <div>
      <div className="gr-section-head">
        <div>
          <h2>Study Hub</h2>
          <p>Trade files with your groups and bank XP with quick quizzes.</p>
        </div>
      </div>

      <div className="gr-grid cols-2">
        <div className="gr-card">
          <div className="gr-card-title">Shared files</div>
          <p className="gr-card-sub">Study guides, notes, and practice sets. Stored on this device.</p>
          <FileDrop />
          <div style={{ marginTop: 16 }}>
            <FileList />
          </div>
        </div>

        <Quiz />
      </div>
    </div>
  );
}
