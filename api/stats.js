// ============================================================
// You shouldn't need to edit this file.
// ============================================================
// This runs on Vercel's servers, NOT in the browser. That matters
// because Roblox's API blocks direct requests from random websites
// (CORS), but it's happy to answer server-to-server requests. This
// function is the bridge: the site calls "/api/stats", and this
// code fetches the real numbers from Roblox and hands them back.

export default async function handler(req, res) {
  try {
    const placeIdsParam = req.query.placeIds;

    if (!placeIdsParam) {
      res.status(400).json({ error: "Missing placeIds query parameter" });
      return;
    }

    const placeIds = placeIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (placeIds.length === 0) {
      res.status(400).json({ error: "No valid placeIds provided" });
      return;
    }

    // Step 1: convert each placeId -> universeId. Roblox game stats
    // are stored per "universe", not per place, so this translation
    // step happens first.
    const universeLookups = await Promise.all(
      placeIds.map(async (placeId) => {
        try {
          const r = await fetch(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
          );
          if (!r.ok) return { placeId, universeId: null };
          const data = await r.json();
          return { placeId, universeId: data.universeId ?? null };
        } catch {
          return { placeId, universeId: null };
        }
      })
    );

    const validUniverseIds = universeLookups
      .map((u) => u.universeId)
      .filter((id) => id !== null);

    if (validUniverseIds.length === 0) {
      // Happens if every placeId is a placeholder (e.g. 0). The frontend
      // already falls back to showing "—" in this case.
      res.status(200).json({
        games: placeIds.map((placeId) => ({ placeId, universeId: null, name: null, playing: 0, visits: 0 })),
        totals: { players: 0, visits: 0, projects: placeIds.length }
      });
      return;
    }

    // Step 2: fetch live game data (current players + total visits)
    // for all universes in a single request.
    const gamesRes = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${validUniverseIds.join(",")}`
    );

    if (!gamesRes.ok) {
      res.status(502).json({ error: "Roblox games API request failed" });
      return;
    }

    const gamesJson = await gamesRes.json();
    const gamesById = new Map((gamesJson.data || []).map((g) => [g.id, g]));

    // Step 3: merge everything back together, keyed by placeId so the
    // frontend can match stats to the right game card.
    const games = universeLookups.map(({ placeId, universeId }) => {
      const g = universeId ? gamesById.get(universeId) : null;
      return {
        placeId,
        universeId,
        name: g ? g.name : null,
        playing: g ? g.playing : 0,
        visits: g ? g.visits : 0,
      };
    });

    const totals = games.reduce(
      (acc, g) => {
        acc.players += g.playing;
        acc.visits += g.visits;
        return acc;
      },
      { players: 0, visits: 0 }
    );
    totals.projects = games.length;

    // Cache for 30s at the edge so a burst of visitors doesn't hammer
    // Roblox's API, but numbers still stay close to live.
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=59");
    res.status(200).json({ games, totals });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error" });
  }
}
