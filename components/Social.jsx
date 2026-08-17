"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FriendSearch({ friends, incomingRequests, outgoingRequests, onSend }) {
  const { searchProfiles } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchProfiles(q);
      setResults(r);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchProfiles]);

  const knownIds = useMemo(
    () =>
      new Set([
        ...friends.map((f) => f.id),
        ...incomingRequests.map((r) => r.id),
        ...outgoingRequests.map((r) => r.id),
      ]),
    [friends, incomingRequests, outgoingRequests]
  );

  const candidates = results.filter((r) => !knownIds.has(r.id));

  return (
    <div className="gr-field" style={{ marginBottom: 12 }}>
      <label>Find a rival by name</label>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Full name" />
      {query.trim().length >= 2 && (
        <div style={{ marginTop: 8 }}>
          {searching && <div className="gr-card-sub" style={{ margin: 0 }}>Searching…</div>}
          {!searching && !candidates.length && (
            <div className="gr-card-sub" style={{ margin: 0 }}>No matches — check the spelling of their full name.</div>
          )}
          {candidates.map((c) => (
            <div className="gr-row-line" key={c.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="gr-avatar" style={{ width: 24, height: 24, fontSize: 10, background: "var(--surface-elevated)", color: "var(--text)" }}>
                  {initials(c.name)}
                </span>
                {c.name}
              </span>
              <button
                className="gr-btn small primary"
                onClick={() => {
                  onSend(c.id, c.name);
                  setQuery("");
                  setResults([]);
                }}
              >
                Send request
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ friends, profile, gpa, levelInfo }) {
  // Friends who haven't turned on "Share my GPA" show up unranked —
  // their gpa comes back null from the store, never coerced to 0.
  const rows = useMemo(() => {
    const list = [
      { id: "you", name: profile.name || "You", gpa, level: levelInfo.level, you: true },
      ...friends.map((f) => ({ ...f, you: false })),
    ];
    const ranked = list.filter((r) => r.gpa != null).sort((a, b) => b.gpa - a.gpa);
    const hidden = list.filter((r) => r.gpa == null);
    return [...ranked, ...hidden];
  }, [friends, profile.name, gpa, levelInfo.level]);

  const rankClass = (i) => (i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "");
  let rankCounter = 0;

  return (
    <div className="gr-card">
      <div className="gr-card-title">Leaderboard</div>
      <p className="gr-card-sub">Ranked by GPA across your circle — friends keeping theirs private show up unranked.</p>
      {rows.map((r) => {
        const isRanked = r.gpa != null;
        if (isRanked) rankCounter += 1;
        const i = rankCounter - 1;
        return (
          <div key={r.id} className={`gr-lb-row ${r.you ? "you" : ""}`}>
            <div className={`gr-lb-rank ${isRanked ? rankClass(i) : ""}`}>{isRanked ? i + 1 : "–"}</div>
            <div className="gr-lb-person">
              <div
                className="gr-avatar"
                style={{
                  width: 28,
                  height: 28,
                  fontSize: 11,
                  background: r.you ? undefined : "var(--surface-elevated)",
                  color: r.you ? undefined : "var(--text)",
                }}
              >
                {initials(r.name || "?")}
              </div>
              <div>
                <div className="who">
                  {r.name} {r.you && <span style={{ color: "var(--gold-text)" }}>· you</span>}
                </div>
                <div className="lvl">Lv. {r.level}</div>
              </div>
            </div>
            <div className="gr-lb-gpa">{isRanked ? r.gpa.toFixed(2) : "🔒 Private"}</div>
          </div>
        );
      })}
      {rows.length === 1 && (
        <div className="gr-empty" style={{ marginTop: 10 }}>
          Add a rival to start a leaderboard.
        </div>
      )}
    </div>
  );
}

function GroupFilesLink({ group, files, onOpenFiles }) {
  const groupFiles = files.filter((f) => f.groupId === group.id);

  return (
    <div className="gr-category">
      <div className="gr-category-head">
        <span>Shared files</span>
        <span>
          {groupFiles.length} file{groupFiles.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="gr-card-sub" style={{ margin: "0 0 10px" }}>
        Uploading and sharing files now happens on the Files page — pick this group as the destination.
      </p>
      <button className="gr-btn small primary" onClick={() => onOpenFiles(group.id)}>
        Open {group.name}'s files
      </button>
    </div>
  );
}

function GroupNotes({ group, onAddNote, onRemoveNote }) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAddNote(group.id, draft.trim());
    setDraft("");
  };

  return (
    <div className="gr-category">
      <div className="gr-category-head">
        <span>Notes</span>
        <span>{group.notes.length}</span>
      </div>
      <div className="gr-row" style={{ marginBottom: 10 }}>
        <div className="gr-field" style={{ flex: 1 }}>
          <label>New note</label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Meet at the library at 6pm"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button className="gr-btn small primary" disabled={!draft.trim()} onClick={submit}>
          Post
        </button>
      </div>
      {group.notes.length === 0 ? (
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>No notes yet</b>
          Share something with the group.
        </div>
      ) : (
        group.notes.map((n) => (
          <div key={n.id} className="gr-row-line">
            <span>
              <b>{n.authorName}</b> <span style={{ color: "var(--text-muted)" }}>{n.text}</span>
            </span>
            <button className="gr-btn small ghost" onClick={() => onRemoveNote(group.id, n.id)}>
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function GroupReminders({ group, onAddReminder, onToggleReminder, onRemoveReminder }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onAddReminder(group.id, text.trim(), due || null);
    setText("");
    setDue("");
  };

  const sorted = [...group.reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });

  const today = new Date().toDateString();

  return (
    <div className="gr-category" style={{ marginBottom: 4 }}>
      <div className="gr-category-head">
        <span>Reminders</span>
        <span>{group.reminders.filter((r) => !r.done).length} open</span>
      </div>
      <div className="gr-row" style={{ marginBottom: 10 }}>
        <div className="gr-field" style={{ flex: 1, minWidth: 160 }}>
          <label>Reminder</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Submit lab report draft"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="gr-field" style={{ width: 150 }}>
          <label>Due (optional)</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <button className="gr-btn small primary" disabled={!text.trim()} onClick={submit}>
          Add
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="gr-empty" style={{ padding: "16px 10px" }}>
          <b>Nothing due</b>
          Add a reminder to keep the group on track.
        </div>
      ) : (
        sorted.map((r) => {
          const overdue = r.due && !r.done && new Date(r.due) < new Date(today);
          return (
            <div key={r.id} className="gr-reminder-row">
              <label className="gr-reminder-check">
                <input type="checkbox" checked={r.done} onChange={() => onToggleReminder(group.id, r.id)} />
                <span className={r.done ? "done" : ""}>{r.text}</span>
              </label>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.due && (
                  <span className={`gr-tag ${overdue ? "overdue" : ""}`}>
                    {new Date(r.due).toLocaleDateString()}
                  </span>
                )}
                <button className="gr-btn small ghost" onClick={() => onRemoveReminder(group.id, r.id)}>
                  ✕
                </button>
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

function GroupCard({
  group,
  myId,
  friends,
  files,
  onRenameGroup,
  onTransferCaptain,
  onAddMember,
  onRemoveMember,
  onRemoveGroup,
  onOpenFiles,
  onAddNote,
  onRemoveNote,
  onAddReminder,
  onToggleReminder,
  onRemoveReminder,
}) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);

  const isCaptain = group.captainId === myId;
  const captain = group.members.find((m) => m.id === group.captainId);
  const captainName = captain ? captain.name : "Unknown";

  const memberIds = new Set(group.members.map((m) => m.id));
  const available = friends.filter((f) => !memberIds.has(f.id));

  const saveRename = () => {
    if (nameDraft.trim()) onRenameGroup(group.id, nameDraft.trim());
    setEditingName(false);
  };

  return (
    <div className="gr-class" style={{ marginBottom: 12, padding: 16 }}>
      <div className="gr-assignment" style={{ padding: 0, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div className="gr-row" style={{ marginBottom: 4 }}>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setEditingName(false);
                }}
                style={{ flex: 1, minWidth: 120 }}
              />
              <button className="gr-btn small primary" disabled={!nameDraft.trim()} onClick={saveRename}>
                Save
              </button>
              <button className="gr-btn small ghost" onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="name"
              onClick={() => setOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
              }}
            >
              {group.name}{" "}
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: 11 }}>
                · {group.members.length} member{group.members.length === 1 ? "" : "s"} · {open ? "hide" : "open"}
              </span>
            </button>
          )}
          <div style={{ marginTop: 6 }}>
            <span className="gr-captain-badge">👑 {captainName}</span>
            {isCaptain && !editingName && (
              <button
                className="gr-calc-toggle"
                style={{ marginLeft: 10 }}
                onClick={() => {
                  setNameDraft(group.name);
                  setEditingName(true);
                }}
              >
                Rename
              </button>
            )}
          </div>
        </div>
        {isCaptain && (
          <button className="gr-btn small ghost" onClick={() => onRemoveGroup(group.id)}>
            Delete
          </button>
        )}
      </div>

      {open && (
        <div>
          <div className="gr-category">
            <div className="gr-category-head">
              <span>Members</span>
            </div>
            {!isCaptain && (
              <div className="gr-card-sub" style={{ margin: "0 0 10px" }}>
                Only {captainName} can manage who's in this group.
              </div>
            )}
            <div className="gr-chip-list" style={{ marginBottom: 10 }}>
              {group.members.map((m) => (
                <span className="gr-person-chip" key={m.id}>
                  <span className="dot">{initials(m.name)}</span>
                  {m.name}
                  {group.captainId === m.id && (
                    <span title="Captain" style={{ marginLeft: 2 }}>
                      👑
                    </span>
                  )}
                  {isCaptain && group.captainId !== m.id && (
                    <button
                      className="gr-btn small ghost"
                      style={{ padding: "2px 6px", marginLeft: 2 }}
                      onClick={() => onTransferCaptain(group.id, m.id)}
                    >
                      Make captain
                    </button>
                  )}
                  {(isCaptain || m.id === myId) && group.captainId !== m.id && (
                    <button
                      className="gr-btn small ghost"
                      style={{ padding: "2px 6px", marginLeft: 2 }}
                      onClick={() => onRemoveMember(group.id, m.id)}
                      aria-label={m.id === myId ? "Leave group" : `Remove ${m.name} from ${group.name}`}
                    >
                      {m.id === myId ? "Leave" : "✕"}
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isCaptain && (
              <>
                <label style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>Add a rival</label>
                <div className="gr-chip-list" style={{ marginTop: 8 }}>
                  {available.length === 0 && (
                    <span className="gr-card-sub" style={{ margin: 0 }}>
                      {friends.length === 0
                        ? "Add friends first to invite them."
                        : "Everyone in your circle is already in this group."}
                    </span>
                  )}
                  {available.map((f) => (
                    <button
                      key={f.id}
                      className="gr-person-chip"
                      style={{ cursor: "pointer", borderStyle: "dashed" }}
                      onClick={() => onAddMember(group.id, f.id)}
                    >
                      <span className="dot">{initials(f.name)}</span>+ {f.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <GroupFilesLink group={group} files={files} onOpenFiles={onOpenFiles} />
          <GroupNotes group={group} onAddNote={onAddNote} onRemoveNote={onRemoveNote} />
          <GroupReminders
            group={group}
            onAddReminder={onAddReminder}
            onToggleReminder={onToggleReminder}
            onRemoveReminder={onRemoveReminder}
          />
        </div>
      )}
    </div>
  );
}

function NewGroupForm({ friends, onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (!open) {
    return (
      <button className="gr-btn primary" onClick={() => setOpen(true)}>
        + Create a study group
      </button>
    );
  }

  return (
    <div className="gr-card">
      <div className="gr-field" style={{ marginBottom: 12 }}>
        <label>Group name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calc BC Crew" />
      </div>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>Members</label>
      <div className="gr-chip-list" style={{ margin: "8px 0 16px" }}>
        {friends.length === 0 && <span className="gr-card-sub">Add friends first to invite them.</span>}
        {friends.map((f) => (
          <button
            key={f.id}
            className="gr-person-chip"
            style={{
              borderColor: selected.includes(f.id) ? "var(--cyan)" : undefined,
              cursor: "pointer",
            }}
            onClick={() => toggle(f.id)}
          >
            <span className="dot">{initials(f.name)}</span>
            {f.name}
          </button>
        ))}
      </div>
      <div className="gr-row">
        <button
          className="gr-btn primary"
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name.trim(), selected);
            setName("");
            setSelected([]);
            setOpen(false);
          }}
        >
          Create group
        </button>
        <button className="gr-btn ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Social({ onNavigate }) {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
    groups,
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
    files,
    profile,
    gpa,
    levelInfo,
    refreshFriends,
    refreshGroups,
    toggleShareGpa,
  } = useStore();
  const { session } = useAuth();
  const myId = session?.user?.id;

  // Friend requests and group content can change from someone else's
  // account — pick that up whenever this screen is opened.
  useEffect(() => {
    refreshFriends();
    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="gr-section-head">
        <div>
          <h2>Friends & Groups</h2>
          <p>Real connections — find someone by their full name and send a request to start racing GPAs.</p>
        </div>
      </div>

      <div className="gr-grid cols-2">
        <div>
          <div className="gr-card" style={{ marginBottom: 18 }}>
            <div className="gr-card-title">Your rivals</div>
            <p className="gr-card-sub">Compete for the highest GPA — on your terms.</p>
            <label className="gr-share-toggle">
              <input type="checkbox" checked={profile.shareGpa} onChange={toggleShareGpa} />
              <span>
                Share my GPA with friends
                <em>{profile.shareGpa ? "Friends can see your GPA." : "Your GPA stays private — nobody sees it."}</em>
              </span>
            </label>
            <FriendSearch
              friends={friends}
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              onSend={sendFriendRequest}
            />

            {incomingRequests.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                  Requests waiting on you
                </label>
                {incomingRequests.map((r) => (
                  <div key={r.friendshipId} className="gr-row-line">
                    <span>{r.name}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <button
                        className="gr-btn small primary"
                        onClick={() => acceptFriendRequest(r.friendshipId, r.name)}
                      >
                        Accept
                      </button>
                      <button className="gr-btn small ghost" onClick={() => removeFriendship(r.friendshipId)}>
                        Decline
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                  Requests you've sent
                </label>
                {outgoingRequests.map((r) => (
                  <div key={r.friendshipId} className="gr-row-line">
                    <span>{r.name} · pending</span>
                    <button className="gr-btn small ghost" onClick={() => removeFriendship(r.friendshipId)}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              {friends.map((f) => (
                <div key={f.id} className="gr-assignment">
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="gr-avatar" style={{ width: 26, height: 26, fontSize: 10, background: "var(--surface-elevated)", color: "var(--text)" }}>
                      {initials(f.name)}
                    </span>
                    <span className="name">{f.name}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="score">{f.gpa == null ? "🔒 Private" : f.gpa.toFixed(2)}</span>
                    <button className="gr-btn small ghost" onClick={() => removeFriendship(f.friendshipId)}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              {!friends.length && <div className="gr-empty">No rivals yet — search for one above.</div>}
            </div>
          </div>

          <div className="gr-card">
            <div className="gr-card-title">Study groups</div>
            <p className="gr-card-sub">Shared spaces for files, notes, and reminders.</p>
            <NewGroupForm friends={friends} onAdd={addGroup} />
            <div style={{ marginTop: 14 }}>
              {groups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  myId={myId}
                  friends={friends}
                  files={files}
                  onRenameGroup={renameGroup}
                  onTransferCaptain={transferCaptain}
                  onAddMember={addGroupMember}
                  onRemoveMember={removeGroupMember}
                  onRemoveGroup={removeGroup}
                  onOpenFiles={(groupId) => onNavigate("files", { groupId })}
                  onAddNote={addGroupNote}
                  onRemoveNote={removeGroupNote}
                  onAddReminder={addGroupReminder}
                  onToggleReminder={toggleGroupReminder}
                  onRemoveReminder={removeGroupReminder}
                />
              ))}
              {!groups.length && <div className="gr-empty">No groups yet — create one above.</div>}
            </div>
          </div>
        </div>

        <Leaderboard friends={friends} profile={profile} gpa={gpa} levelInfo={levelInfo} />
      </div>
    </div>
  );
}
