import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Server-only — GEMINI_API_KEY is never exposed to the client, unlike the
// Giphy key. Gemini's free tier (Flash models) needs no billing to work,
// which is why this app uses it instead of a paid API.
const apiKey = process.env.GEMINI_API_KEY;
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

// This route calls a paid/quota'd third-party API using our own server-side
// key — without this check anyone on the internet, logged in or not, could
// hit it directly and burn that quota. Verifies the caller's Supabase JWT
// rather than trusting whatever the client claims.
async function requireUser(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(request) {
  if (!client) {
    return Response.json(
      {
        error:
          "AI notes aren't set up yet — add GEMINI_API_KEY to your environment and restart the server.",
      },
      { status: 501 }
    );
  }

  const user = await requireUser(request);
  if (!user) {
    return Response.json({ error: "You must be signed in to generate notes." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { dataUrl, fileName } = body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return Response.json({ error: "No file content to read." }, { status: 400 });
  }

  const instruction = `Generate detailed study notes from the file "${fileName || "this file"}".`;
  let parts;
  if (parsed.mediaType === "application/pdf" || SUPPORTED_IMAGE_TYPES.has(parsed.mediaType)) {
    parts = [{ text: instruction }, { inlineData: { mimeType: parsed.mediaType, data: parsed.base64 } }];
  } else if (parsed.mediaType.startsWith("text/")) {
    let text;
    try {
      text = Buffer.from(parsed.base64, "base64").toString("utf-8");
    } catch {
      return Response.json({ error: "Couldn't read that file as text." }, { status: 400 });
    }
    parts = [{ text: `${instruction}\n\n--- File contents ---\n${text}` }];
  } else {
    return Response.json(
      { error: "AI notes support PDFs, images, and text files — not this file type." },
      { status: 400 }
    );
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: parts,
      config: {
        systemInstruction:
          "You are a meticulous study-notes assistant. Read the provided material carefully and produce thorough, well-organized study notes a student could use to review for a test. Cover every important concept, definition, formula, date, and example present in the source. Structure the notes with Markdown headings, bullet points, and bold key terms. Do not add information that isn't in the source material, and do not pad with filler.",
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingBudget: 4096 },
      },
    });

    const notes = (response.text || "").trim();
    if (!notes) {
      return Response.json({ error: "No notes were generated — try again." }, { status: 502 });
    }

    return Response.json({ notes });
  } catch (err) {
    console.error("generate-notes error:", err);
    return Response.json({ error: "Couldn't generate notes — try again." }, { status: 502 });
  }
}
