"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { searchGifs, trendingGifs, giphyConfigured } from "../lib/giphy";

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function GifPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!giphyConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const r = query.trim() ? await searchGifs(query.trim()) : await trendingGifs();
        setResults(r);
      } catch {
        setError("Couldn't load GIFs — try again.");
      } finally {
        setLoading(false);
      }
    }, query.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="gr-gif-picker">
      <div className="gr-row" style={{ marginBottom: 10 }}>
        <div className="gr-field" style={{ flex: 1 }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Giphy for a GIF…"
          />
        </div>
        <button className="gr-btn small ghost" onClick={onClose}>
          <X size={14} /> Close
        </button>
      </div>

      {!giphyConfigured() && (
        <div className="gr-card-sub" style={{ margin: 0 }}>
          GIF search isn't set up yet — add a Giphy API key (
          <code>NEXT_PUBLIC_GIPHY_API_KEY</code>) to your environment to enable it.
        </div>
      )}
      {giphyConfigured() && loading && (
        <div className="gr-card-sub" style={{ margin: 0 }}>Loading…</div>
      )}
      {giphyConfigured() && error && (
        <div className="gr-card-sub" style={{ margin: 0, color: "var(--coral-text)" }}>{error}</div>
      )}
      {giphyConfigured() && !loading && !error && results.length === 0 && (
        <div className="gr-card-sub" style={{ margin: 0 }}>No GIFs found — try a different search.</div>
      )}
      {giphyConfigured() && !loading && !error && results.length > 0 && (
        <div className="gr-gif-grid">
          {results.map((g) => (
            <button
              key={g.id}
              className="gr-gif-thumb"
              onClick={() => onPick(g.gifUrl)}
              aria-label={g.description}
              title={g.description}
            >
              <img src={g.previewUrl} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ onPost }) {
  const [text, setText] = useState("");
  const [gif, setGif] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim() && !gif) return;
    setBusy(true);
    await onPost(text.trim(), gif);
    setText("");
    setGif(null);
    setBusy(false);
  };

  return (
    <div className="gr-card" style={{ marginBottom: 18 }}>
      <div className="gr-card-title">Share something</div>
      <p className="gr-card-sub">Only your accepted friends will see this in their feed.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Just crushed a Calc test…"
        rows={3}
        className="gr-feed-textarea"
      />
      {gif && !pickerOpen && (
        <div className="gr-feed-gif-preview">
          <img src={gif} alt="Selected GIF" />
          <button className="gr-btn small ghost" onClick={() => setGif(null)}>
            <X size={14} /> Remove
          </button>
        </div>
      )}
      {pickerOpen && (
        <GifPicker
          onPick={(url) => {
            setGif(url);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div className="gr-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <button className="gr-btn small ghost" onClick={() => setPickerOpen((v) => !v)}>
          <ImageIcon size={14} /> {gif ? "Change GIF" : "Add GIF"}
        </button>
        <button className="gr-btn primary" disabled={busy || (!text.trim() && !gif)} onClick={submit}>
          Post
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, myId, onRemove }) {
  return (
    <div className="gr-post">
      <div className="gr-post-head">
        <span className="gr-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
          {initials(post.authorName)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="gr-post-author">{post.authorName}</div>
          <div className="gr-post-time">{timeAgo(post.at)}</div>
        </div>
        {post.authorId === myId && (
          <button className="gr-btn small ghost" onClick={() => onRemove(post.id)} aria-label="Delete post">
            ✕
          </button>
        )}
      </div>
      {post.text && <p className="gr-post-text">{post.text}</p>}
      {post.gifDataUrl && (
        <div className="gr-post-gif">
          <img src={post.gifDataUrl} alt="" />
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const { posts, addPost, removePost, refreshPosts } = useStore();
  const { session } = useAuth();
  const myId = session?.user?.id;

  // Friends' posts can change from someone else's account — pick that up
  // whenever this screen is opened.
  useEffect(() => {
    refreshPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="gr-section-head">
        <div>
          <h2>Feed</h2>
          <p>Updates from your circle — text, GIFs, and whatever's worth sharing.</p>
        </div>
      </div>

      <Composer onPost={addPost} />

      {posts.length === 0 ? (
        <div className="gr-empty">
          <b>No posts yet</b>
          Be the first to share something — or add some rivals from the Groups tab.
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} myId={myId} onRemove={removePost} />)
      )}
    </div>
  );
}
