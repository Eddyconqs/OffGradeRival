"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useStore } from "../lib/store";
import { formatBytes, fileExt, ingestFiles } from "../lib/files";

const AI_NOTES_SUPPORTED = /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/)/;

function FileUpload({ destination, classId, onDestinationChange, onClassChange, groups, classes, onFiles, onUploaded }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    ingestFiles(fileList, onFiles, {
      groupId: destination === "personal" ? null : destination,
      classId: classId || null,
    });
    onUploaded(destination);
  };

  return (
    <div className="gr-card panel">
      <div className="gr-panel-head">
        <UploadCloud /> Upload a File
      </div>
      <p className="gr-card-sub">Keep it to yourself, or share it straight to a study group — pick a destination below.</p>
      <div className="gr-row" style={{ marginBottom: 10 }}>
        <div className="gr-field" style={{ flex: 1 }}>
          <label>Share with</label>
          <select value={destination} onChange={(e) => onDestinationChange(e.target.value)}>
            <option value="personal">Just me</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="gr-field" style={{ flex: 1 }}>
          <label>Course (optional)</label>
          <select value={classId} onChange={(e) => onClassChange(e.target.value)}>
            <option value="">No course</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
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
        style={{ borderColor: dragOver ? "var(--accent)" : undefined }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        />
        {destination === "personal"
          ? "Drop a file here to keep it personal, or click to browse"
          : "Drop a file here to share it with the group, or click to browse"}
        {" · +15 XP per upload"}
      </div>
      <span className="gr-panel-bolt bl" />
      <span className="gr-panel-bolt br" />
    </div>
  );
}

function FileRow({ file, klass, onRemove, onGenerateNotes }) {
  const [generating, setGenerating] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const supported = file.type && AI_NOTES_SUPPORTED.test(file.type) && file.dataUrl;

  const generate = async () => {
    setGenerating(true);
    await onGenerateNotes(file.id);
    setGenerating(false);
    setShowNotes(true);
  };

  return (
    <div className="gr-file-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="gr-file-meta">
          <div className="gr-file-icon">{fileExt(file.name)}</div>
          <div>
            <div className="gr-file-name">{file.name}</div>
            <div className="gr-file-sub">
              {formatBytes(file.size)} · {new Date(file.at).toLocaleDateString()}
              {klass && (
                <span className="gr-tag" style={{ marginLeft: 8 }}>
                  <span className="gr-swatch" style={{ background: klass.color, marginRight: 4 }} />
                  {klass.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {file.aiNotes && (
            <button className="gr-btn small ghost" onClick={() => setShowNotes((v) => !v)}>
              {showNotes ? "Hide notes" : "View notes"}
            </button>
          )}
          {supported && (
            <button className="gr-btn small ghost" disabled={generating} onClick={generate}>
              {generating ? "Generating…" : file.aiNotes ? "Regenerate notes" : "Generate notes"}
            </button>
          )}
          {file.dataUrl && (
            <a className="gr-btn small ghost" href={file.dataUrl} download={file.name}>
              Download
            </a>
          )}
          <button className="gr-btn small danger" onClick={() => onRemove(file.id)}>
            Remove
          </button>
        </div>
      </div>
      {showNotes && file.aiNotes && <div className="gr-ai-notes">{file.aiNotes}</div>}
    </div>
  );
}

function FileList({ files, classes, removeFile, generateFileNotes, emptyTitle, emptyBody }) {
  if (!files.length) {
    return (
      <div className="gr-empty">
        <b>{emptyTitle}</b>
        {emptyBody}
      </div>
    );
  }
  return (
    <div>
      {files.map((f) => (
        <FileRow
          key={f.id}
          file={f}
          klass={classes.find((c) => c.id === f.classId)}
          onRemove={removeFile}
          onGenerateNotes={generateFileNotes}
        />
      ))}
    </div>
  );
}

export default function Files({ initialGroupId }) {
  const { files, classes, groups, removeFile, generateFileNotes, addFile } = useStore();
  const [destination, setDestination] = useState(initialGroupId || "personal");
  const [classId, setClassId] = useState("");
  const [tab, setTab] = useState(initialGroupId || "personal");

  const personalFiles = files.filter((f) => !f.groupId);
  const groupFiles = (gid) => files.filter((f) => f.groupId === gid);

  const tabs = [
    { id: "personal", label: "Personal", count: personalFiles.length },
    ...groups.map((g) => ({ id: g.id, label: g.name, count: groupFiles(g.id).length })),
  ];

  const activeFiles = tab === "personal" ? personalFiles : groupFiles(tab);
  const activeTab = tabs.find((t) => t.id === tab);

  return (
    <div>
      <div className="gr-section-head">
        <div>
          <span className="gr-eyebrow">The Equipment Room</span>
          <h2>Files</h2>
          <p>Upload once — keep it personal or share it straight to a study group. Everything lives here.</p>
        </div>
      </div>

      <FileUpload
        destination={destination}
        classId={classId}
        onDestinationChange={setDestination}
        onClassChange={setClassId}
        groups={groups}
        classes={classes}
        onFiles={addFile}
        onUploaded={setTab}
      />

      {groups.length > 0 && (
        <div className="gr-row" style={{ margin: "20px 0 14px", flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`gr-btn small ${tab === t.id ? "primary" : "ghost"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      )}

      <FileList
        files={activeFiles}
        classes={classes}
        removeFile={removeFile}
        generateFileNotes={generateFileNotes}
        emptyTitle={tab === "personal" ? "No personal files yet" : `No files shared with ${activeTab?.label} yet`}
        emptyBody={
          tab === "personal"
            ? "Upload a study guide, notes, or a practice test above."
            : "Upload something above and pick this group as the destination."
        }
      />
    </div>
  );
}
