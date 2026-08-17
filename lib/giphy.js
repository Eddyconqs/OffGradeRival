const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

export function giphyConfigured() {
  return Boolean(GIPHY_API_KEY);
}

function mapResults(data) {
  return (data || []).map((g) => ({
    id: g.id,
    previewUrl: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url,
    gifUrl: g.images?.original?.url,
    description: g.title || "GIF",
  })).filter((r) => r.previewUrl && r.gifUrl);
}

// rating=g keeps results school-appropriate — Grade Arena's userbase skews
// toward students.
export async function searchGifs(query, limit = 24) {
  if (!GIPHY_API_KEY) throw new Error("giphy-not-configured");
  const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("giphy-search-failed");
  const data = await res.json();
  return mapResults(data.data);
}

export async function trendingGifs(limit = 24) {
  if (!GIPHY_API_KEY) throw new Error("giphy-not-configured");
  const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("giphy-trending-failed");
  const data = await res.json();
  return mapResults(data.data);
}
