// ============================================================
// You shouldn't need to edit this file.
// ============================================================
// Stores one CCU (players-online) snapshot per day so the CCU Graph
// page can show real history over time.
//
// Needs a small free Redis database connected (see README "CCU Graph
// setup"). Until that's connected, this safely returns an empty
// history instead of erroring, so the rest of the site keeps working.
//
// How it works: whenever someone loads the CCU Graph page, this
// checks whether today already has a saved snapshot. If not, it
// fetches today's live player count and saves it. That means there's
// no cron job needed — the first visit each day naturally creates
// that day's data point.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HISTORY_KEY = "vjr_ccu_history"; // CUSTOMIZE: change if you ever reuse this DB for another site
const MAX_DAYS_STORED = 365;

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) throw new Error("KV get failed");
  const data = await r.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${KV_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!r.ok) throw new Error("KV set failed");
}

async function fetchTodayTotalPlayers(placeIds) {
  const universeLookups = await Promise.all(
    placeIds.map(async (placeId) => {
      try {
        const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        if (!r.ok) return null;
        const data = await r.json();
        return data.universeId ?? null;
      } catch {
        return null;
      }
    })
  );
  const validUniverseIds = universeLookups.filter((id) => id !== null);
  if (validUniverseIds.length === 0) return 0;

  const gamesRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${validUniverseIds.join(",")}`);
  if (!gamesRes.ok) return 0;
  const gamesJson = await gamesRes.json();
  return (gamesJson.data || []).reduce((sum, g) => sum + (g.playing || 0), 0);
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOKEN) {
      // No database connected yet — return empty history instead of
      // erroring, so the rest of the site keeps working.
      res.status(200).json({ history: [], setupNeeded: true });
      return;
    }

    const placeIdsParam = req.query.placeIds;
    if (!placeIdsParam) {
      res.status(400).json({ error: "Missing placeIds query parameter" });
      return;
    }
    const placeIds = placeIdsParam.split(",").map((s) => s.trim()).filter(Boolean);

    let history = (await kvGet(HISTORY_KEY)) || [];
    const today = new Date().toISOString().slice(0, 10); // e.g. "2026-07-19"

    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.date !== today) {
      const players = await fetchTodayTotalPlayers(placeIds);
      history.push({ date: today, players });
      if (history.length > MAX_DAYS_STORED) {
        history = history.slice(-MAX_DAYS_STORED);
      }
      await kvSet(HISTORY_KEY, history);
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error" });
  }
}
