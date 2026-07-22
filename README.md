# VJR Studio website

Static HTML/CSS/JavaScript with two Vercel serverless endpoints for Roblox data.

## Files

```text
index.html          Home page and animated game-thumbnail wall
games.html          Full portfolio
ccu.html            Hourly aggregate peak and top-five game history
style.css           Complete visual system and responsive layout
games-config.js     Add, remove, or edit games here
main.js             Renders artwork/cards, live stats, and the CCU chart
api/stats.js        Live Roblox totals
api/history.js      Hourly CCU snapshots stored in Upstash Redis
vercel.json         Clean URLs
```

The Contact page has intentionally been removed. The live thumbnail wall, portfolio cards, page artwork, and stats all read from `games-config.js`.

## Edit games

Each item in `games-config.js` supports:

```js
{
  name: "Your Game Name",
  description: "A short description.",
  image: "https://...", // Local image paths also work
  placeId: 119068914321553,
  link: "https://www.roblox.com/games/...",
  ctaText: "Play Now",
  badge: "Featured"
}
```

## Vercel setup for the CCU graph

Connect an Upstash Redis database to the Vercel project and make sure one of these environment-variable pairs exists:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

The site requests `/api/history` on page visits. The endpoint stores the aggregate CCU and every game's CCU at most once per UTC hour, keeps 90 days, and automatically converts old daily entries if they exist. The graph ranks the latest snapshot, then plots those five experiences in stable per-game colors; the displayed five can therefore change each hour.

### Optional guaranteed hourly snapshots

Normal traffic creates hourly points without additional Vercel setup. To guarantee a point during hours with no visitors, a Vercel Pro plan (or another hourly scheduler) is required because Vercel Hobby cron jobs can only run once per day.

On Vercel Pro:

1. Add a `ROBLOX_PLACE_IDS` environment variable containing the comma-separated place IDs from `games-config.js`.
2. Add this `crons` entry to `vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "crons": [
    { "path": "/api/history", "schedule": "5 * * * *" }
  ]
}
```

This runs five minutes after each UTC hour. Keep the current `vercel.json` on Hobby so deployment is not rejected by the hourly schedule.
