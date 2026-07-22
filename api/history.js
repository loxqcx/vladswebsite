// Saves at most one portfolio-wide CCU snapshot per UTC hour.
// The browser calls this endpoint whenever a page is visited, so normal site
// traffic builds the chart without a scheduler. See README.md for the optional
// Vercel Pro cron setup that guarantees a point even during quiet hours.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HISTORY_KEY = "vjr_ccu_history";
const MAX_HOURS_STORED = 24 * 90;

async function kvGet(key) {
  const response = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!response.ok) throw new Error("KV get failed");
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const response = await fetch(`${KV_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error("KV set failed");
}

async function fetchTotalPlayers(placeIds) {
  const universeIds = await Promise.all(placeIds.map(async (placeId) => {
    try {
      const response = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.universeId ?? null;
    } catch {
      return null;
    }
  }));

  const validIds = universeIds.filter((id) => id !== null);
  if (!validIds.length) return 0;
  const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${validIds.join(",")}`);
  if (!response.ok) throw new Error("Roblox games API request failed");
  const data = await response.json();
  return (data.data || []).reduce((total, game) => total + (Number(game.playing) || 0), 0);
}

function normalizeHistory(history) {
  return (Array.isArray(history) ? history : []).map((entry) => {
    if (entry.timestamp) return { timestamp: entry.timestamp, players: Number(entry.players) || 0 };
    if (entry.date) return { timestamp: `${entry.date}T00:00:00.000Z`, players: Number(entry.players) || 0 };
    return null;
  }).filter(Boolean);
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOKEN) {
      res.status(200).json({ history: [], setupNeeded: true });
      return;
    }

    const placeIdsParam = req.query.placeIds || process.env.ROBLOX_PLACE_IDS;
    if (!placeIdsParam) {
      res.status(400).json({ error: "Missing placeIds query parameter" });
      return;
    }
    const placeIds = placeIdsParam.split(",").map((value) => value.trim()).filter(Boolean);
    if (!placeIds.length) {
      res.status(400).json({ error: "No valid placeIds provided" });
      return;
    }

    let history = normalizeHistory(await kvGet(HISTORY_KEY));
    const hour = `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
    const latest = history.at(-1);

    if (!latest || latest.timestamp !== hour) {
      history.push({ timestamp: hour, players: await fetchTotalPlayers(placeIds) });
      history = history.slice(-MAX_HOURS_STORED);
      await kvSet(HISTORY_KEY, history);
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ history, interval: "hourly" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unknown server error" });
  }
}
